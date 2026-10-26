import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Router, Request, Response } from "express";
import { z, ZodError } from "zod";
import { authenticate, assertWriteAuthorized } from "../shared/auth.js";
import { HttpError, toHttpError } from "../shared/errors.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { BASE_USDC, BASE_SEPOLIA_USDC, decimalUnits, type FundingConfig } from "./config.js";
import type { CoinbaseFundingProvider } from "./provider.js";
import type { FundingStore, FundingOrderRecord } from "./store.js";
import { fundingActor, validateQuote } from "./validation.js";

const orderRequest = z.object({
  country: z.literal("US"), subdivision: z.string().regex(/^[A-Z]{2}$/),
  paymentMethod: z.enum(["GUEST_CHECKOUT_APPLE_PAY", "GUEST_CHECKOUT_GOOGLE_PAY"]),
  paymentAmount: z.string().optional(), purchaseAmount: z.string().optional(),
  maxPaymentAmount: z.string(), origin: z.string().url(),
}).strict().refine(v => (v.paymentAmount !== undefined) !== (v.purchaseAmount !== undefined), "Specify exactly one amount");
const cursorSchema = z.object({ createdAt: z.string().datetime(), id: z.string().uuid() }).strict();
const historyRequest = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().max(512).optional() }).strict();
type Dependencies = {
  provider: Pick<CoinbaseFundingProvider, "createSandboxOrder">;
  store: Pick<FundingStore, "reserveOrder" | "completeOrder" | "markOrderUnknown" | "getOrder" | "listOrders">;
  inspectChain: () => Promise<{ chainId: number; token: string }>;
};

function publicOrder(record: FundingOrderRecord, detail: boolean) {
  const result = record.provider_response;
  return {
    id: record.id, state: record.state, sandbox: record.sandbox,
    walletAddress: record.wallet_address, chainId: Number(record.chain_id), tokenAddress: record.token_address,
    providerOrderId: record.provider_order_id, providerStatus: result?.order.status ?? null,
    // A provider response or browser callback cannot establish actual USDC settlement.
    settlementStatus: "unverified", purchaseReady: false,
    createdAt: record.created_at.toISOString(), observedAt: record.updated_at.toISOString(),
    ...(detail && result ? { pricing: {
      paymentTotal: result.order.paymentTotal, paymentSubtotal: result.order.paymentSubtotal,
      paymentCurrency: result.order.paymentCurrency, purchaseAmount: result.order.purchaseAmount,
      purchaseCurrency: result.order.purchaseCurrency, fees: result.order.fees,
    }, paymentLink: result.paymentLink } : {}),
  };
}

export function mountFundingOrderRoutes(router: Router, context: ApiExecutionContext, config: FundingConfig, dependencies: Dependencies): void {
  const { store, provider, inspectChain } = dependencies;
  const handle = (action: "create" | "get" | "history") => async (request: Request, response: Response) => {
    try {
      const auth = authenticate(context.apiKeys, request.header("x-api-key"));
      if (action === "create") assertWriteAuthorized(auth);
      const actor = fundingActor(auth, request);
      await context.rateLimiter.enforce(action === "create" ? "write" : "read", `funding:${actor.userId}`);
      if (action === "get") {
        const id = z.string().uuid().parse(request.params.id);
        const record = await store.getOrder(id, actor.userId);
        if (!record) throw new HttpError(404, "Funding order not found");
        response.json(publicOrder(record, true)); return;
      }
      if (action === "history") {
        const query = historyRequest.parse(request.query);
        let cursor: z.infer<typeof cursorSchema> | undefined;
        if (query.cursor) {
          try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString())); }
          catch { throw new HttpError(400, "Invalid funding history cursor"); }
        }
        const rows = await store.listOrders(actor.userId, query.limit + 1, cursor);
        const items = rows.slice(0, query.limit);
        const last = items.at(-1);
        response.json({ items: items.map(row => publicOrder(row, false)), nextCursor: rows.length > query.limit && last
          ? Buffer.from(JSON.stringify({ createdAt: last.created_at.toISOString(), id: last.id })).toString("base64url") : null }); return;
      }
      if (config.mode !== "sandbox" || !config.sandboxOrdersEnabled) throw new HttpError(503, "Sandbox funding orders are not enabled");
      const body = orderRequest.parse(request.body);
      const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/).parse(request.header("idempotency-key"));
      if (!config.origins.includes(body.origin) || (request.header("origin") && request.header("origin") !== body.origin)) {
        throw new HttpError(403, "Funding checkout origin is not approved");
      }
      if (!request.ip || !isIP(request.ip)) throw new HttpError(400, "Funding checkout requires a valid client IP");
      const amountKind = body.paymentAmount === undefined ? "purchase" : "payment";
      const amount = body.paymentAmount ?? body.purchaseAmount!;
      const units = decimalUnits(amount, amountKind === "payment" ? 2 : 6);
      const maxCost = decimalUnits(body.maxPaymentAmount, 2);
      if (units <= 0n || maxCost <= 0n || (amountKind === "payment" && units > maxCost)) throw new HttpError(400, "Invalid funding amount or payment limit");
      const chain = await inspectChain();
      if (chain.chainId !== context.config.chainId || ![8453, 84532].includes(chain.chainId)
        || chain.token.toLowerCase() !== (chain.chainId === 8453 ? BASE_USDC : BASE_SEPOLIA_USDC)) {
        throw new HttpError(409, "Funding chain or marketplace USDC token does not match the configured destination");
      }
      const requestHash = createHash("sha256").update(JSON.stringify({
        country: body.country, subdivision: body.subdivision, paymentMethod: body.paymentMethod,
        amountKind, units: units.toString(), maxCost: maxCost.toString(), origin: body.origin,
        wallet: actor.wallet.toLowerCase(), chainId: chain.chainId, token: chain.token.toLowerCase(), sandbox: true,
      })).digest("hex");
      // Durable reservation precedes any provider request. No automatic retry after ambiguity.
      const { record, fresh } = await store.reserveOrder({ userId: actor.userId, wallet: actor.wallet,
        chainId: chain.chainId, token: chain.token, idempotencyKey, requestHash });
      if (!fresh) { response.status(record.state === "checkout_created" ? 200 : 202).json(publicOrder(record, true)); return; }
      try {
        const result = await provider.createSandboxOrder({
          destinationAddress: actor.wallet,
          partnerUserRef: `sandbox-${createHash("sha256").update(`uspeaks:${actor.userId}`).digest("hex").slice(0, 32)}`,
          partnerOrderRef: record.id, paymentMethod: body.paymentMethod,
          [amountKind === "payment" ? "paymentAmount" : "purchaseAmount"]: amount,
          clientIp: request.ip, domain: new URL(body.origin).hostname,
        });
        validateQuote(result.order, actor.wallet, amountKind, amount);
        if (decimalUnits(result.order.paymentTotal, 6) > maxCost * 10_000n) throw new HttpError(409, "Current funding price exceeds the authorized payment limit");
        const saved = await store.completeOrder(record.id, actor.userId, result);
        response.status(201).json(publicOrder(saved, true));
      } catch {
        // This includes a crash/error after provider success but before durable completion.
        await store.markOrderUnknown(record.id, actor.userId).catch(() => undefined);
        response.status(202).json({ id: record.id, state: "unknown", sandbox: true,
          settlementStatus: "unverified", purchaseReady: false, reconciliationRequired: true });
      }
    } catch (error) {
      const http = toHttpError(error);
      const authOrLimit = /^(missing x-api-key|invalid x-api-key|rate limit exceeded|api key not permitted)/i.test(String((error as Error)?.message));
      const expose = error instanceof HttpError || error instanceof ZodError || authOrLimit;
      response.status(expose ? http.statusCode : 503)
        .json({ error: expose ? http.message : "Funding order storage or service is unavailable" });
    }
  };
  router.post("/v1/funding/orders", handle("create"));
  router.get("/v1/funding/orders/:id", handle("get"));
  router.get("/v1/funding/history", handle("history"));
}
