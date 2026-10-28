import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { Pool } from "pg";
import { z } from "zod";
import { authenticate, assertWriteAuthorized } from "../shared/auth.js";
import { HttpError, toHttpError } from "../shared/errors.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { BASE_USDC, BASE_SEPOLIA_USDC, decimalUnits, type FundingConfig } from "./config.js";
import { sealCheckout, openCheckout } from "./checkout-crypto.js";
import { CoinbaseFundingProvider } from "./provider.js";
import { FundingStore, type FundingAttempt } from "./store.js";
import { fundingActor, validateQuote } from "./routes.js";

export type CheckoutDependencies = {
  store?: Pick<FundingStore, "getQuoteRecord" | "findAttempt" | "beginAttempt" | "completeAttempt" | "markUncertain" | "getAttempt" | "history">;
  provider?: Pick<CoinbaseFundingProvider, "createOrder" | "createSession" | "getOrder">;
};
const headlessInput = z.object({ quoteId: z.string().uuid() }).strict();
const empty = z.object({}).strict();
const keySchema = z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/);
const statuses: Record<string, string> = {
  ONRAMP_ORDER_STATUS_PENDING_AUTH: "awaiting_verification", ONRAMP_ORDER_STATUS_PENDING_PAYMENT: "awaiting_payment",
  ONRAMP_ORDER_STATUS_PROCESSING: "processing", ONRAMP_ORDER_STATUS_COMPLETED: "provider_completed", ONRAMP_ORDER_STATUS_FAILED: "failed",
};

function publicAttempt(attempt: FundingAttempt) {
  return { id: attempt.id, kind: attempt.kind, sandbox: attempt.sandbox, createdAt: attempt.created_at.toISOString(),
    status: attempt.state === "ready" ? (statuses[attempt.provider_status ?? ""] ?? "checkout_created") : "outcome_unknown",
    settlementStatus: "unverified", providerOrderId: attempt.provider_order_id };
}

export function createCheckoutRouter(context: ApiExecutionContext, config: FundingConfig,
  inspectChain: () => Promise<{ chainId: number; token: string }>, dependencies: CheckoutDependencies = {}): Router {
  const router = Router();
  if (!config.checkoutEnabled || !config.encryptionKey || !config.redirectUrl) return router;
  const key = config.encryptionKey;
  const provider = dependencies.provider ?? new CoinbaseFundingProvider(config);
  const store = dependencies.store ?? new FundingStore(new Pool({ connectionString: config.databaseUrl, max: 3, allowExitOnIdle: true, idleTimeoutMillis: 10_000 }));
  const principal = async (request: Request, write: boolean) => {
    const auth = authenticate(context.apiKeys, request.header("x-api-key"));
    if (write) { try { assertWriteAuthorized(auth); } catch { throw new HttpError(403, "API key not permitted for funding writes"); } }
    const actor = fundingActor(auth, request);
    await context.rateLimiter.enforce(write ? "write" : "read", `funding:${actor.userId}`);
    return actor;
  };
  const respond = (attempt: FundingAttempt, response: Response) => {
    if (attempt.state !== "ready") { response.status(202).json({ ...publicAttempt(attempt), retryCreation: false }); return; }
    if (!attempt.checkout_ciphertext) { response.status(200).json({ ...publicAttempt(attempt), checkoutAvailable: false }); return; }
    if (!attempt.checkout_expires_at || attempt.checkout_expires_at.getTime() <= Date.now()) {
      response.status(409).json({ ...publicAttempt(attempt), error: "Checkout link expired; inspect order status before creating a new checkout" }); return;
    }
    const checkout = openCheckout(attempt.checkout_ciphertext!, key, attempt.user_id, attempt.id);
    response.status(200).json({ ...publicAttempt(attempt), ...checkout, expiresAt: attempt.checkout_expires_at.toISOString() });
  };
  const safe = (handler: (request: Request, response: Response) => Promise<void>) => async (request: Request, response: Response) => {
    try { await handler(request, response); } catch (error) {
      const http = toHttpError(error);
      response.status(http.statusCode).json({ error: error instanceof HttpError || http.statusCode < 500 ? http.message : "Funding checkout service is unavailable" });
    }
  };

  const create = (kind: "headless" | "hosted") => safe(async (request, response) => {
    const actor = await principal(request, true);
    const body = kind === "headless" ? headlessInput.parse(request.body) : empty.parse(request.body);
    const idempotencyKey = keySchema.parse(request.header("idempotency-key"));
    const quoteId = "quoteId" in body ? body.quoteId as string : undefined;
    const fingerprint = createHash("sha256").update(JSON.stringify({ kind, quoteId, wallet: actor.wallet.toLowerCase(), chainId: context.config.chainId, mode: config.mode, redirectUrl: config.redirectUrl })).digest("hex");
    const prior = await store.findAttempt(actor.userId, kind, idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new HttpError(409, "Idempotency key was already used for a different checkout");
      respond(prior, response); return;
    }
    const chain = await inspectChain();
    if (chain.chainId !== context.config.chainId || ![8453,84532].includes(chain.chainId)
      || chain.token.toLowerCase() !== (chain.chainId === 8453 ? BASE_USDC : BASE_SEPOLIA_USDC)
      || (config.mode === "live" && chain.chainId !== 8453)) throw new HttpError(409, "Funding destination does not match configured chain and USDC");
    const quote = quoteId ? await store.getQuoteRecord(quoteId, actor.userId) : null;
    if (quoteId && (!quote || quote.wallet_address !== actor.wallet.toLowerCase() || Number(quote.chain_id) !== chain.chainId
      || quote.token_address !== chain.token.toLowerCase() || quote.sandbox !== (config.mode === "sandbox"))) {
      throw new HttpError(404, "Funding quote not found or expired");
    }
    const reservation = await store.beginAttempt({ userId: actor.userId, kind, key: idempotencyKey, fingerprint, quoteId,
      wallet: actor.wallet, chainId: chain.chainId, sandbox: config.mode === "sandbox" });
    if (!reservation.created) { respond(reservation.attempt, response); return; }
    const attempt = reservation.attempt;
    const partnerUserRef = attempt.provider_user_ref ?? `${config.mode === "sandbox" ? "sandbox-" : ""}${createHash("sha256").update(`uspeaks:${actor.userId}`).digest("hex").slice(0,32)}`;
    let checkoutUrl: string, reusableToken: string | undefined, orderId: string | undefined, status: string | undefined;
    try {
      if (kind === "headless" && quote) {
        const created = await provider.createOrder({ destinationAddress: actor.wallet, partnerUserRef, partnerOrderRef: attempt.id,
          paymentMethod: quote.payment_method, [quote.amount_kind === "payment" ? "paymentAmount" : "purchaseAmount"]: quote.request_amount,
          clientIp: request.ip, domain: new URL(config.origins[0]).hostname });
        validateQuote(created.order, actor.wallet, quote.amount_kind, quote.request_amount);
        if (decimalUnits(created.order.paymentTotal,6) > decimalUnits(quote.quote.paymentTotal,6)) throw new Error("Price increased; new quote required");
        if (created.order.partnerUserRef !== partnerUserRef) throw new Error("Provider customer mismatch");
        checkoutUrl = created.paymentLink.url; reusableToken = created.userAuthToken;
        orderId = created.order.orderId; status = created.order.status;
      } else {
        const created = await provider.createSession({ destinationAddress: actor.wallet, partnerUserRef, redirectUrl: config.redirectUrl, clientIp: request.ip });
        checkoutUrl = created.session.onrampUrl;
      }
      const ciphertext = sealCheckout({ checkoutUrl, reusableToken }, key, actor.userId, attempt.id);
      const saved = await store.completeAttempt(attempt.id, actor.userId, ciphertext, new Date(Date.now() + 5 * 60_000), orderId, status);
      respond(saved, response);
    } catch {
      // Never reissue an ambiguous create. Even a failed status write leaves the durable creating reservation locked.
      await store.markUncertain(attempt.id, actor.userId).catch(() => undefined);
      response.status(202).json({ id: attempt.id, status: "outcome_unknown", settlementStatus: "unverified", retryCreation: false });
    }
  });
  router.post("/v1/funding/orders", create("headless"));
  router.post("/v1/funding/sessions", create("hosted"));
  router.get("/v1/funding/history", safe(async (request, response) => {
    const actor = await principal(request, false);
    const input = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().uuid().optional() }).strict().parse(request.query);
    const rows = await store.history(actor.userId, input.limit + 1, input.cursor);
    response.json({ items: rows.slice(0,input.limit).map(publicAttempt), nextCursor: rows.length > input.limit ? rows[input.limit - 1].id : null });
  }));
  router.get("/v1/funding/orders/:id", safe(async (request, response) => {
    const actor = await principal(request, false);
    const id = z.string().uuid().parse(request.params.id);
    const attempt = await store.getAttempt(id, actor.userId);
    if (!attempt) throw new HttpError(404, "Funding order not found");
    if (attempt.provider_order_id) {
      const current = await provider.getOrder(attempt.provider_order_id);
      const userRef = attempt.provider_user_ref ?? `${attempt.sandbox ? "sandbox-" : ""}${createHash("sha256").update(`uspeaks:${actor.userId}`).digest("hex").slice(0,32)}`;
      if (current.orderId !== attempt.provider_order_id || current.destinationAddress.toLowerCase() !== attempt.wallet_address || current.partnerUserRef !== userRef) throw new HttpError(502, "Coinbase returned an inconsistent order");
      attempt.provider_status = current.status;
    }
    response.json(publicAttempt(attempt));
  }));
  return router;
}
