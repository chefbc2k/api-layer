import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { createFundingRouter } from "./routes.js";
import { BASE_SEPOLIA_USDC, readFundingConfig, type FundingConfig } from "./config.js";
import { CoinbaseFundingProvider } from "./provider.js";
import { sealCheckout, openCheckout } from "./checkout-crypto.js";
import type { FundingAttempt } from "./store.js";
import { loadApiKeys } from "../shared/auth.js";
import { RateLimiter } from "../shared/rate-limit.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";

const user = "buyer_a", wallet = "0x00000000000000000000000000000000000000aa";
const id = "11111111-1111-4111-8111-111111111111", quoteId = "22222222-2222-4222-8222-222222222222", orderId = "33333333-3333-4333-8333-333333333333";
const key = Buffer.alloc(32, 42).toString("base64");
const ref = `sandbox-${createHash("sha256").update(`uspeaks:${user}`).digest("hex").slice(0,32)}`;
const order = { orderId, partnerUserRef: ref, status: "ONRAMP_ORDER_STATUS_PENDING_AUTH" as const,
  paymentTotal: "100.75", paymentSubtotal: "100", paymentCurrency: "USD" as const, purchaseAmount: "100", purchaseCurrency: "USDC" as const,
  destinationAddress: wallet, destinationNetwork: "base" as const, fees: [{ type: "NETWORK", amount: "0.75", currency: "USD" as const }] };
const config: FundingConfig = { mode: "sandbox", apiKeyId: "test", apiKeySecret: "secret", origins: ["https://app.example"], databaseUrl: "postgresql://localhost/test", checkoutEnabled: true, encryptionKey: key, redirectUrl: "https://app.example/funded" };
const quoteRecord = { wallet_address: wallet, chain_id: "84532", token_address: BASE_SEPOLIA_USDC, payment_method: "GUEST_CHECKOUT_APPLE_PAY", request_amount: "100.000000", amount_kind: "purchase" as const, sandbox: true, quote: order };

describe("checkout encryption and enablement", () => {
  it("uses randomized authenticated encryption tied to owner and attempt", () => {
    const ciphertext = sealCheckout({ checkoutUrl: "https://pay.coinbase.com/buy?token=secret", reusableToken: "private-token" }, key, user, id);
    expect(ciphertext).not.toContain("private-token"); expect(ciphertext).not.toContain("secret");
    expect(openCheckout(ciphertext, key, user, id)).toEqual({ checkoutUrl: "https://pay.coinbase.com/buy?token=secret" });
    expect(() => openCheckout(ciphertext, key, "other", id)).toThrow();
    expect(() => openCheckout(ciphertext, key, user, quoteId)).toThrow();
    expect(sealCheckout({}, key, user, id)).not.toBe(sealCheckout({}, key, user, id));
  });
  it("requires a valid encryption key and approved fixed redirect when checkout is enabled", () => {
    const env = { API_LAYER_FUNDING_ENABLED: "true", CDP_API_KEY_ID: "test", CDP_API_KEY_SECRET: "secret", SUPABASE_DB_URL: "postgresql://localhost/test", API_LAYER_FUNDING_ORIGINS_JSON: '["https://app.example"]', API_LAYER_FUNDING_CHECKOUT_ENABLED: "true", API_LAYER_FUNDING_ENCRYPTION_KEY: key, API_LAYER_FUNDING_REDIRECT_URL: "https://app.example/funded" };
    expect(readFundingConfig(env)?.checkoutEnabled).toBe(true);
    expect(() => readFundingConfig({ ...env, API_LAYER_FUNDING_ENCRYPTION_KEY: "bad" })).toThrow("Funding configuration");
    expect(() => readFundingConfig({ ...env, API_LAYER_FUNDING_REDIRECT_URL: "https://evil.example" })).toThrow("Funding configuration");
    expect(() => readFundingConfig({ ...env, API_LAYER_FUNDING_CHECKOUT_ENABLED: "yes" })).toThrow("Funding configuration");
  });
});

describe("checkout provider requests", () => {
  it("uses explicit create, session and order lookup endpoints with pinned assets", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ order, paymentLink: { url: "https://pay.coinbase.com/checkout" }, userAuthToken: "private" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ session: { onrampUrl: "https://pay.coinbase.com/buy?sessionToken=private" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ order })));
    const sign = vi.fn().mockResolvedValue("jwt");
    const provider = new CoinbaseFundingProvider(config, fetcher, sign);
    expect((await provider.createOrder({ isQuote: true, destinationNetwork: "bad" })).order.orderId).toBe(orderId);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ isQuote: false, destinationNetwork: "base", purchaseCurrency: "USDC" });
    await provider.createSession({ destinationAddress: wallet });
    expect(fetcher.mock.calls[1][0]).toBe("https://api.cdp.coinbase.com/platform/v2/onramp/sessions");
    expect((await provider.getOrder(orderId)).orderId).toBe(orderId);
    expect(sign.mock.calls[2][0]).toMatchObject({ requestMethod: "GET", requestPath: `/platform/v2/onramp/orders/${orderId}` });
    await expect(provider.getOrder("../other")).rejects.toThrow();
  });
  it.each(["https://evil.example/buy", "https://pay.coinbase.com.evil.example/buy", "http://pay.coinbase.com/buy", "https://user:password@pay.coinbase.com/buy"])("rejects an unsafe provider payment link %s", async url => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ order, paymentLink: { url } })));
    await expect(new CoinbaseFundingProvider(config, fetcher, vi.fn().mockResolvedValue("jwt")).createOrder({})).rejects.toThrow("Coinbase funding request failed");
  });
});

describe("checkout HTTP and idempotency", () => {
  const servers: Array<ReturnType<express.Express["listen"]>> = [];
  afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve())); });
  async function setup() {
    let attempt: FundingAttempt | null = null;
    const provider = { createOrder: vi.fn().mockResolvedValue({ order: structuredClone(order), paymentLink: { url: "https://pay.coinbase.com/checkout" }, userAuthToken: "never-return-this" }), createSession: vi.fn().mockResolvedValue({ session: { onrampUrl: "https://pay.coinbase.com/buy?sessionToken=secret" } }), getOrder: vi.fn().mockResolvedValue(structuredClone(order)) };
    const store = {
      getQuoteRecord: vi.fn().mockResolvedValue(quoteRecord),
      findAttempt: vi.fn().mockImplementation(async () => attempt),
      beginAttempt: vi.fn().mockImplementation(async input => {
        if (attempt) return { created: false, attempt };
        attempt = { id, user_id: user, kind: input.kind, fingerprint: input.fingerprint, wallet_address: wallet, chain_id: "84532", sandbox: true, state: "creating", provider_order_id: null, provider_status: null, checkout_ciphertext: null, checkout_expires_at: null, created_at: new Date() };
        return { created: true, attempt };
      }),
      completeAttempt: vi.fn().mockImplementation(async (_id, _user, ciphertext, expiry, providerId, status) => {
        attempt = { ...attempt!, state: "ready", checkout_ciphertext: ciphertext, checkout_expires_at: expiry, provider_order_id: providerId ?? null, provider_status: status ?? null }; return attempt;
      }),
      markUncertain: vi.fn().mockImplementation(async () => { if (attempt?.state === "creating") attempt.state = "uncertain"; }),
      getAttempt: vi.fn().mockImplementation(async () => attempt),
      history: vi.fn().mockImplementation(async () => attempt ? [attempt] : []),
    };
    const context = { apiKeys: loadApiKeys({ API_LAYER_KEYS_JSON: JSON.stringify({
      buyer: { label: "buyer", fundingUserId: user, walletAddress: wallet },
      deputy: { label: "mismatched deputy", fundingUserId: user, walletAddress: "0x00000000000000000000000000000000000000bb" },
    }) }), rateLimiter: new RateLimiter(), config: { chainId: 84532 } } as unknown as ApiExecutionContext;
    const app = express(); app.use(express.json());
    app.use(createFundingRouter(context, { config, inspectChain: async () => ({ chainId: 84532, token: BASE_SEPOLIA_USDC }), checkout: { provider, store } }));
    const server = app.listen(0); servers.push(server); await new Promise<void>(resolve => server.once("listening", resolve));
    const port = (server.address() as import("node:net").AddressInfo).port;
    async function call(path: string, body?: unknown, headers: Record<string,string> = {}) {
      const response = await fetch(`http://127.0.0.1:${port}/v1/funding/${path}`, { method: body === undefined ? "GET" : "POST", headers: { "x-api-key": "buyer", "content-type": "application/json", "idempotency-key": "request_0001", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    }
    return { call, provider, store, context, getAttempt: () => attempt };
  }
  it("creates an embedded order with no client contact attestations and encrypts reusable tokens", async () => {
    const { call, provider, getAttempt } = await setup();
    const result = await call("orders", { quoteId });
    expect(result).toMatchObject({ status: 200, body: { id, status: "awaiting_verification", settlementStatus: "unverified", checkoutUrl: "https://pay.coinbase.com/checkout" } });
    expect(JSON.stringify(result)).not.toContain("never-return-this");
    expect(getAttempt()?.checkout_ciphertext).not.toContain("never-return-this");
    expect(provider.createOrder).toHaveBeenCalledWith(expect.objectContaining({ partnerOrderRef: id, partnerUserRef: ref, destinationAddress: expect.stringMatching(/^0x/i), purchaseAmount: "100.000000", domain: "app.example" }));
    expect(provider.createOrder.mock.calls[0][0]).not.toHaveProperty("email");
  });
  it("replays the same creation even after the quote expires without another provider call", async () => {
    const { call, provider, store } = await setup();
    await call("orders", { quoteId }); store.getQuoteRecord.mockResolvedValue(null);
    expect((await call("orders", { quoteId })).status).toBe(200);
    expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it("rejects idempotency-key reuse for a different quote", async () => {
    const { call, provider } = await setup(); await call("orders", { quoteId });
    expect((await call("orders", { quoteId: id })).status).toBe(409);
    expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it("does not let a same-customer API key with a different wallet replay checkout authority", async () => {
    const { call, provider } = await setup();
    expect((await call("orders", { quoteId })).status).toBe(200);
    expect((await call("orders", { quoteId }, { "x-api-key": "deputy" })).status).toBe(409);
    expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["destination", { destinationAddress: "0x00000000000000000000000000000000000000bb" }],
    ["customer", { partnerUserRef: "sandbox-confused-deputy" }],
    ["purchase amount", { purchaseAmount: "101" }],
    ["payment conservation", { paymentTotal: "100.76" }],
  ])("locks the checkout after a mismatched provider %s response", async (_label, patch) => {
    const { call, provider, getAttempt } = await setup();
    provider.createOrder.mockResolvedValueOnce({
      order: { ...structuredClone(order), ...patch },
      paymentLink: { url: "https://pay.coinbase.com/checkout" },
      userAuthToken: "must-not-leak",
    });

    const result = await call("orders", { quoteId });
    expect(result).toMatchObject({
      status: 202,
      body: { id, status: "outcome_unknown", settlementStatus: "unverified", retryCreation: false },
    });
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
    expect(JSON.stringify(result)).not.toContain("pay.coinbase.com");
    expect(getAttempt()?.state).toBe("uncertain");
    expect((await call("orders", { quoteId })).status).toBe(202);
    expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it("does not repeat ambiguous provider requests", async () => {
    const { call, provider, getAttempt } = await setup(); provider.createOrder.mockRejectedValue(new Error("network secret"));
    expect(await call("orders", { quoteId })).toMatchObject({ status: 202, body: { id, status: "outcome_unknown", retryCreation: false } });
    expect(getAttempt()?.state).toBe("uncertain");
    expect((await call("orders", { quoteId })).status).toBe(202);
    expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it("retains the durable reservation when the uncertain-state write also fails", async () => {
    const { call, provider, store } = await setup(); provider.createOrder.mockRejectedValue(new Error("timeout")); store.markUncertain.mockRejectedValue(new Error("database"));
    expect((await call("orders", { quoteId })).status).toBe(202);
    expect((await call("orders", { quoteId })).status).toBe(202); expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it("recovers a committed creation whose database acknowledgement was lost", async () => {
    const { call, provider, store } = await setup();
    const complete = store.completeAttempt.getMockImplementation()!;
    store.completeAttempt.mockImplementationOnce(async (...args) => { await complete(...args); throw new Error("lost commit acknowledgement"); });
    expect((await call("orders", { quoteId })).status).toBe(202);
    expect((await call("orders", { quoteId })).status).toBe(200); expect(provider.createOrder).toHaveBeenCalledTimes(1);
  });
  it("creates a secure hosted-account session using only a server-fixed redirect", async () => {
    const { call, provider } = await setup();
    expect((await call("sessions", {})).body.checkoutUrl).toContain("https://pay.coinbase.com/");
    expect(provider.createSession).toHaveBeenCalledWith(expect.objectContaining({ redirectUrl: config.redirectUrl, partnerUserRef: ref }));
    expect((await call("sessions", { redirectUrl: "https://evil.example" })).status).toBe(400);
  });
  it.each([{ quoteId, email: "forged@example.test" }, {}, { quoteId: "invalid" }])("rejects invalid or injected order creation %j", async input => {
    const { call, provider } = await setup(); expect((await call("orders", input)).status).toBe(400); expect(provider.createOrder).not.toHaveBeenCalled();
  });
  it("enforces authentication and an explicit idempotency key", async () => {
    const { call, provider } = await setup();
    expect((await call("orders", { quoteId }, { "x-api-key": "other" })).status).toBe(401);
    expect((await call("orders", { quoteId }, { "idempotency-key": "" })).status).toBe(400);
    expect(provider.createOrder).not.toHaveBeenCalled();
  });
  it("does not create an order for another owner or expired quote", async () => {
    const { call, store, provider } = await setup(); store.getQuoteRecord.mockResolvedValue(null);
    expect((await call("orders", { quoteId })).status).toBe(404); expect(provider.createOrder).not.toHaveBeenCalled();
  });
  it("refreshes owned order status without claiming verified settlement", async () => {
    const { call, provider } = await setup(); await call("orders", { quoteId });
    provider.getOrder.mockResolvedValue({ ...order, status: "ONRAMP_ORDER_STATUS_COMPLETED" });
    expect(await call(`orders/${id}`)).toMatchObject({ status: 200, body: { status: "provider_completed", settlementStatus: "unverified" } });
  });
  it("does not query another owner's provider order", async () => {
    const { call, store, provider } = await setup(); store.getAttempt.mockResolvedValue(null);
    expect((await call(`orders/${id}`)).status).toBe(404); expect(provider.getOrder).not.toHaveBeenCalled();
  });
  it("never exposes links or authentication tokens in history", async () => {
    const { call } = await setup(); await call("orders", { quoteId });
    const response = await call("history?limit=1");
    expect(response.body.items).toHaveLength(1); expect(JSON.stringify(response)).not.toContain("pay.coinbase"); expect(JSON.stringify(response)).not.toContain("never-return-this");
    expect((await call("history?limit=101")).status).toBe(400);
  });
});
