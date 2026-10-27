import { createHash } from "node:crypto";
import { Contract, getAddress, ZeroAddress } from "ethers";
import { Router, type Request } from "express";
import { Pool } from "pg";
import { z } from "zod";
import { assertWriteAuthorized, authenticate, type AuthContext } from "../shared/auth.js";
import { HttpError, toHttpError } from "../shared/errors.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { BASE_USDC, BASE_SEPOLIA_USDC, decimalUnits, readFundingConfig, type FundingConfig } from "./config.js";
import { CoinbaseFundingProvider, type CoinbaseQuote } from "./provider.js";
import { FundingStore } from "./store.js";
import { createCheckoutRouter, type CheckoutDependencies } from "./checkout.js";

const locationSchema = z.object({ country: z.string().regex(/^[A-Z]{2}$/), subdivision: z.string().regex(/^[A-Z]{2}$/).optional() });
const optionsRequest = locationSchema.strict().refine(v => v.country !== "US" || v.subdivision !== undefined, "US subdivision is required");
const quoteRequest = locationSchema.extend({
  paymentMethod: z.enum(["GUEST_CHECKOUT_APPLE_PAY", "GUEST_CHECKOUT_GOOGLE_PAY"]),
  paymentAmount: z.string().optional(), purchaseAmount: z.string().optional(),
}).strict().refine(v => (v.paymentAmount !== undefined) !== (v.purchaseAmount !== undefined), "Specify exactly one amount")
  .refine(v => v.country === "US" && v.subdivision !== undefined, "Headless quotes require US country and subdivision");

type Dependencies = {
  config?: FundingConfig | null;
  provider?: Pick<CoinbaseFundingProvider, "options" | "quote">;
  store?: Pick<FundingStore, "insertQuote">;
  inspectChain?: () => Promise<{ chainId: number; token: string }>;
  checkout?: CheckoutDependencies;
};

export function fundingActor(auth: AuthContext, request: Request): { userId: string; wallet: string } {
  if (!auth.fundingUserId || !auth.walletAddress) throw new HttpError(403, "Funding requires an explicitly bound customer identity and wallet");
  let wallet: string;
  try { wallet = getAddress(auth.walletAddress); } catch { throw new HttpError(403, "Funding wallet binding is invalid"); }
  if (wallet === ZeroAddress) throw new HttpError(403, "Funding wallet binding is invalid");
  const suppliedWallet = request.header("x-wallet-address");
  if (suppliedWallet && suppliedWallet.toLowerCase() !== wallet.toLowerCase()) throw new HttpError(403, "Funding wallet does not match authenticated customer");
  return { userId: auth.fundingUserId, wallet };
}

export function validateQuote(quote: CoinbaseQuote, wallet: string, amountKind: "payment" | "purchase", amount: string): void {
  try {
    if (getAddress(quote.destinationAddress) !== getAddress(wallet)) throw new Error("recipient mismatch");
    const total = decimalUnits(quote.paymentTotal, 6);
    const subtotal = decimalUnits(quote.paymentSubtotal, 6);
    const purchase = decimalUnits(quote.purchaseAmount, 6);
    const fees = quote.fees.reduce((sum, fee) => sum + decimalUnits(fee.amount, 6), 0n);
    if (total <= 0n || subtotal <= 0n || purchase <= 0n || total !== subtotal + fees) throw new Error("inconsistent pricing");
    if ((amountKind === "payment" ? total : purchase) !== decimalUnits(amount, 6)) throw new Error("amount mismatch");
  } catch { throw new HttpError(502, "Coinbase returned inconsistent quote pricing or destination"); }
}

export function createFundingRouter(context: ApiExecutionContext, dependencies: Dependencies = {}): Router {
  const router = Router();
  const config = dependencies.config === undefined ? readFundingConfig() : dependencies.config;
  if (!config) return router;
  const provider = dependencies.provider ?? new CoinbaseFundingProvider(config);
  const store = dependencies.store ?? new FundingStore(new Pool({
    connectionString: config.databaseUrl, max: 3, idleTimeoutMillis: 10_000, allowExitOnIdle: true,
  }));
  const inspectChain = dependencies.inspectChain ?? (() => context.providerRouter.withProvider("read", "funding.destination", async (rpc) => {
    const network = await rpc.getNetwork();
    const diamond = new Contract(context.config.diamondAddress, ["function getUsdcToken() view returns (address)"], rpc);
    return { chainId: Number(network.chainId), token: String(await diamond.getUsdcToken()) };
  }));

  // Never reflect an arbitrary Origin. Machine clients omit Origin and still need customer authentication.
  router.use("/v1/funding", (request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.vary("Origin");
    const origin = request.header("origin");
    if (origin && !config.origins.includes(origin)) { response.status(403).json({ error: "Funding origin is not approved" }); return; }
    if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, X-Wallet-Address, Idempotency-Key");
      response.sendStatus(204); return;
    }
    next();
  });

  const handle = (quote: boolean) => async (request: Request, response: import("express").Response) => {
    try {
      const auth = authenticate(context.apiKeys, request.header("x-api-key"));
      if (quote) assertWriteAuthorized(auth);
      const actor = fundingActor(auth, request);
      await context.rateLimiter.enforce(quote ? "write" : "read", `funding:${actor.userId}`);
      const input = quote ? quoteRequest.parse(request.body) : optionsRequest.parse(request.query);
      const chain = await inspectChain();
      const expectedToken = chain.chainId === 8453 ? BASE_USDC : BASE_SEPOLIA_USDC;
      if (chain.chainId !== context.config.chainId || ![8453, 84532].includes(chain.chainId)
        || chain.token.toLowerCase() !== expectedToken || (config.mode === "live" && chain.chainId !== 8453)) {
        throw new HttpError(409, "Funding chain or marketplace USDC token does not match the configured destination");
      }
      const options = await provider.options(input.country, input.subdivision);
      const fiat = options.payment_currencies.find(currency => currency.id === "USD");
      const asset = options.purchase_currencies.find(currency => currency.symbol === "USDC" && currency.networks.some(network =>
        String(network.chain_id) === "8453" && network.contract_address.toLowerCase() === BASE_USDC));
      if (!fiat || !asset) throw new HttpError(422, "USDC on Base is unavailable for this location");
      if (!quote) {
        response.json({ country: input.country, subdivision: input.subdivision, sandbox: config.mode === "sandbox",
          destinationNetwork: "base", chainId: chain.chainId, purchaseCurrency: "USDC", paymentCurrency: "USD",
          hostedPaymentMethods: fiat.limits.filter(limit => !limit.id.startsWith("GUEST_CHECKOUT_")),
          headlessPaymentMethods: input.country === "US" ? fiat.limits.filter(limit =>
            ["GUEST_CHECKOUT_APPLE_PAY", "GUEST_CHECKOUT_GOOGLE_PAY"].includes(limit.id)) : [],
        }); return;
      }
      const body = quoteRequest.parse(input);
      const limit = fiat.limits.find(item => item.id === body.paymentMethod);
      if (!limit) throw new HttpError(422, "Requested payment method is unavailable for this location");
      const amountKind = body.paymentAmount === undefined ? "purchase" : "payment";
      const amount = body.paymentAmount ?? body.purchaseAmount!;
      if (decimalUnits(amount, amountKind === "payment" ? 2 : 6) <= 0n) throw new HttpError(400, "Amount must be greater than zero");
      if (amountKind === "payment" && (decimalUnits(amount, 6) < decimalUnits(limit.min, 6) || decimalUnits(amount, 6) > decimalUnits(limit.max, 6))) {
        throw new HttpError(422, "Amount is outside provider payment limits");
      }
      const partnerUserRef = `${config.mode === "sandbox" ? "sandbox-" : ""}${createHash("sha256").update(`uspeaks:${actor.userId}`).digest("hex").slice(0, 32)}`;
      const result = await provider.quote({
        destinationAddress: actor.wallet, partnerUserRef, paymentMethod: body.paymentMethod,
        [amountKind === "payment" ? "paymentAmount" : "purchaseAmount"]: amount,
        clientIp: request.ip,
      });
      validateQuote(result, actor.wallet, amountKind, amount);
      if (decimalUnits(result.paymentTotal, 6) < decimalUnits(limit.min, 6) || decimalUnits(result.paymentTotal, 6) > decimalUnits(limit.max, 6)) {
        throw new HttpError(422, "Quoted fiat cost is outside provider payment limits");
      }
      let saved: { id: string; expiresAt: string };
      try {
        saved = await store.insertQuote({ userId: actor.userId, wallet: actor.wallet, chainId: chain.chainId, token: chain.token,
          paymentMethod: body.paymentMethod, requestAmount: amount, amountKind, sandbox: config.mode === "sandbox", quote: result });
      } catch { throw new HttpError(503, "Funding quote storage is unavailable"); }
      response.status(201).json({ ...saved, sandbox: config.mode === "sandbox", quote: result, payable: false });
    } catch (error) {
      const http = toHttpError(error);
      response.status(http.statusCode).json({ error: http.statusCode >= 500 && !(error instanceof HttpError) ? "Funding service is unavailable" : http.message });
    }
  };
  router.get("/v1/funding/options", handle(false));
  router.post("/v1/funding/quotes", handle(true));
  router.use(createCheckoutRouter(context, config, inspectChain, dependencies.checkout));
  return router;
}
