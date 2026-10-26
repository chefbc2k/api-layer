import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFundingRouter } from "./routes.js";
import { CoinbaseFundingProvider, type CoinbaseOrder } from "./provider.js";
import { BASE_SEPOLIA_USDC, type FundingConfig } from "./config.js";
import type { FundingOrderRecord } from "./store.js";
import { loadApiKeys } from "../shared/auth.js";
import { RateLimiter } from "../shared/rate-limit.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";

const wallet = "0x00000000000000000000000000000000000000AA";
const id = "123e4567-e89b-42d3-a456-426614174000";
const config: FundingConfig = { mode: "sandbox", sandboxOrdersEnabled: true, apiKeyId: "key", apiKeySecret: "secret", origins: ["https://app.example"], databaseUrl: "postgresql://localhost/test" };
const order: CoinbaseOrder = { order: {
  orderId: id, paymentTotal: "100.75", paymentSubtotal: "100", paymentCurrency: "USD", purchaseAmount: "100",
  purchaseCurrency: "USDC", destinationAddress: wallet, destinationNetwork: "base", paymentMethod: "GUEST_CHECKOUT_APPLE_PAY",
  partnerUserRef: "sandbox-user", status: "ONRAMP_ORDER_STATUS_COMPLETED", fees: [{ type: "network", amount: "0.75", currency: "USD" }],
}, paymentLink: { url: "https://pay.coinbase.com/v2/api-onramp/apple-pay?sessionToken=secret", paymentLinkType: "PAYMENT_LINK_TYPE_APPLE_PAY_BUTTON" }, userAuthToken: "private-verification-token" };
const record: FundingOrderRecord = { id, user_id: "a", request_hash: "a".repeat(64), wallet_address: wallet.toLowerCase(),
  chain_id: "84532", token_address: BASE_SEPOLIA_USDC, sandbox: true, state: "creating", provider_order_id: null,
  provider_response: null, created_at: new Date("2026-10-25T10:00:00.000Z"), updated_at: new Date("2026-10-25T10:00:00.000Z") };
const input = { country: "US", subdivision: "IL", paymentMethod: "GUEST_CHECKOUT_APPLE_PAY", purchaseAmount: "100", maxPaymentAmount: "101", origin: "https://app.example" };
const completed = { ...record, state: "checkout_created" as const, provider_order_id: id, provider_response: order };

describe("sandbox order provider", () => {
  const request = { destinationAddress: wallet, partnerUserRef: "sandbox-user", partnerOrderRef: id,
    paymentMethod: "GUEST_CHECKOUT_APPLE_PAY" as const, purchaseAmount: "100", clientIp: "127.0.0.1", domain: "app.example" };
  it("creates embedded sandbox orders with a pinned destination product and fake payment sheet", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(order)));
    const sign = vi.fn().mockResolvedValue("jwt");
    const result = await new CoinbaseFundingProvider(config, fetcher, sign).createSandboxOrder(request);
    expect(new URL(result.paymentLink.url).searchParams.get("useApplePaySandbox")).toBe("true");
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body).toEqual({ ...request, isQuote: false, destinationNetwork: "base", purchaseCurrency: "USDC", paymentCurrency: "USD" });
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ requestMethod: "POST", requestHost: "api.cdp.coinbase.com", requestPath: "/platform/v2/onramp/orders" }));
    expect(body).not.toHaveProperty("phoneNumber"); expect(body).not.toHaveProperty("agreementAcceptedAt");
  });
  it("uses the Google Pay sandbox flag", async () => {
    const googleOrder = { ...order, order: { ...order.order, paymentMethod: "GUEST_CHECKOUT_GOOGLE_PAY" } };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(googleOrder)));
    const result = await new CoinbaseFundingProvider(config, fetcher, vi.fn().mockResolvedValue("jwt")).createSandboxOrder({ ...request, paymentMethod: "GUEST_CHECKOUT_GOOGLE_PAY" });
    expect(new URL(result.paymentLink.url).searchParams.get("useGooglePaySandbox")).toBe("true");
  });
  it.each([{ mode: "live" as const }, { sandboxOrdersEnabled: false }])("refuses disabled or production order creation %j", async patch => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(new CoinbaseFundingProvider({ ...config, ...patch }, fetcher).createSandboxOrder(request)).rejects.toThrow("not enabled");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses non-sandbox references before requesting Coinbase", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(new CoinbaseFundingProvider(config, fetcher).createSandboxOrder({ ...request, partnerUserRef: "user" })).rejects.toThrow("not enabled");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["https://pay.coinbase.com.evil.test/path", "http://pay.coinbase.com/path", "https://user@pay.coinbase.com/path"])("rejects untrusted checkout URL %s", async url => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...order, paymentLink: { ...order.paymentLink, url } })));
    await expect(new CoinbaseFundingProvider(config, fetcher, vi.fn().mockResolvedValue("jwt")).createSandboxOrder(request)).rejects.toThrow("inconsistent sandbox order");
  });
  it.each([{ partnerUserRef: "different" }, { paymentMethod: "GUEST_CHECKOUT_GOOGLE_PAY" }])("rejects mismatched provider identity/method %j", async patch => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...order, order: { ...order.order, ...patch } })));
    await expect(new CoinbaseFundingProvider(config, fetcher, vi.fn().mockResolvedValue("jwt")).createSandboxOrder(request)).rejects.toThrow("inconsistent sandbox order");
  });
});

describe("sandbox funding order HTTP boundaries", () => {
  const servers: Array<ReturnType<express.Express["listen"]>> = [];
  afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve())); });
  async function setup(patch: Partial<FundingConfig> = {}) {
    const store = { reserveOrder: vi.fn().mockResolvedValue({ record, fresh: true }), completeOrder: vi.fn().mockResolvedValue(completed),
      markOrderUnknown: vi.fn().mockResolvedValue(undefined), getOrder: vi.fn().mockResolvedValue(completed), listOrders: vi.fn().mockResolvedValue([completed]) };
    const provider = { createSandboxOrder: vi.fn().mockResolvedValue(order) };
    const inspectChain = vi.fn().mockResolvedValue({ chainId: 84532, token: BASE_SEPOLIA_USDC });
    const context = { config: { chainId: 84532 }, apiKeys: loadApiKeys({ API_LAYER_KEYS_JSON: JSON.stringify({ customer: { label: "a", fundingUserId: "a", walletAddress: wallet }, other: { label: "b", fundingUserId: "b", walletAddress: wallet }, service: { label: "service" } }) }), rateLimiter: new RateLimiter() } as unknown as ApiExecutionContext;
    const app = express(); app.use(express.json());
    app.use(createFundingRouter(context, { config: { ...config, ...patch }, orderProvider: provider, orderStore: store, inspectChain }));
    const server = app.listen(0); servers.push(server); await new Promise<void>(resolve => server.once("listening", resolve));
    const port = (server.address() as import("node:net").AddressInfo).port;
    const call = async (path = "orders", body: unknown = input, headers: Record<string, string> = {}) => {
      const response = await fetch(`http://127.0.0.1:${port}/v1/funding/${path}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-api-key": "customer", "idempotency-key": "request_key_123456", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json(), headers: response.headers };
    };
    const get = async (path: string, headers: Record<string, string> = {}) => {
      const response = await fetch(`http://127.0.0.1:${port}/v1/funding/${path}`, { headers: { "x-api-key": "customer", ...headers } });
      return { status: response.status, body: await response.json(), headers: response.headers };
    };
    return { call, get, store, provider, inspectChain, context };
  }
  it("reserves durably before contacting Coinbase, stores results and never treats provider success as settlement", async () => {
    const { call, store, provider } = await setup(); const result = await call();
    expect(result.status).toBe(201); expect(result.body).toMatchObject({ id, providerStatus: "ONRAMP_ORDER_STATUS_COMPLETED", settlementStatus: "unverified", purchaseReady: false });
    expect(store.reserveOrder.mock.invocationCallOrder[0]).toBeLessThan(provider.createSandboxOrder.mock.invocationCallOrder[0]);
    expect(provider.createSandboxOrder).toHaveBeenCalledWith(expect.objectContaining({ destinationAddress: expect.any(String), partnerUserRef: expect.stringMatching(/^sandbox-/), partnerOrderRef: id, domain: "app.example" }));
    expect(JSON.stringify(result.body)).not.toContain("private-verification-token");
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it.each([{ mode: "live" as const }, { sandboxOrdersEnabled: false }])("keeps payable production funding disabled %j", async patch => {
    const { call, provider, store } = await setup(patch); expect((await call()).status).toBe(503);
    expect(store.reserveOrder).not.toHaveBeenCalled(); expect(provider.createSandboxOrder).not.toHaveBeenCalled();
  });
  it.each([{ purchaseAmount: "0" }, { maxPaymentAmount: "0" }, { maxPaymentAmount: "1e2" }, { paymentAmount: "100" }, { walletAddress: wallet }, { email: "forged@example.com" }, { partnerUserRef: "forged" }, { country: "CA" }])("rejects malformed and forged order fields %j", async patch => {
    const { call, provider, store } = await setup(); expect((await call("orders", { ...input, ...patch })).status).toBe(400);
    expect(store.reserveOrder).not.toHaveBeenCalled(); expect(provider.createSandboxOrder).not.toHaveBeenCalled();
  });
  it("rejects conflicting/browser-forged origins and wallet overrides", async () => {
    const { call, provider } = await setup();
    expect((await call("orders", { ...input, origin: "https://evil.test" })).status).toBe(403);
    expect((await call("orders", input, { origin: "https://evil.test" })).status).toBe(403);
    expect((await call("orders", input, { "x-wallet-address": "0x00000000000000000000000000000000000000bb" })).status).toBe(403);
    expect(provider.createSandboxOrder).not.toHaveBeenCalled();
  });
  it("requires authentication, customer identity and idempotency key", async () => {
    const { call, provider } = await setup();
    expect((await call("orders", input, { "x-api-key": "wrong" })).status).toBe(401);
    expect((await call("orders", input, { "x-api-key": "service" })).status).toBe(403);
    expect((await call("orders", input, { "idempotency-key": "" })).status).toBe(400);
    expect(provider.createSandboxOrder).not.toHaveBeenCalled();
  });
  it.each(["founder", "admin", "operator", "buyer", "seller", "licensee", "collaborator", "read-only"])("denies %s contract identities without a customer binding before any stateful work", async actor => {
    const { call, context, provider, store, inspectChain } = await setup();
    context.apiKeys[actor] = { ...context.apiKeys.customer, apiKey: actor, roles: [actor], fundingUserId: undefined };
    expect((await call("orders", input, { "x-api-key": actor })).status).toBe(403);
    expect(provider.createSandboxOrder).not.toHaveBeenCalled(); expect(store.reserveOrder).not.toHaveBeenCalled(); expect(inspectChain).not.toHaveBeenCalled();
  });
  it("denies bound read-only customers permission to create checkout", async () => {
    const { call, context, provider, store } = await setup(); context.apiKeys.customer.roles = ["read-only"];
    expect((await call()).status).toBe(403); expect(provider.createSandboxOrder).not.toHaveBeenCalled(); expect(store.reserveOrder).not.toHaveBeenCalled();
  });
  it("does not send a provider request when reservation fails and redacts database errors", async () => {
    const { call, store, provider } = await setup(); store.reserveOrder.mockRejectedValue(new Error("invalid password=secret"));
    expect(await call()).toMatchObject({ status: 503, body: { error: "Funding order storage or service is unavailable" } });
    expect(provider.createSandboxOrder).not.toHaveBeenCalled();
  });
  it.each(["upstream", "storage", "price", "destination"])("keeps %s uncertainty durable without issuing another provider request", async failure => {
    const { call, store, provider } = await setup();
    if (failure === "upstream") provider.createSandboxOrder.mockRejectedValue(new Error("timeout-secret"));
    if (failure === "storage") store.completeOrder.mockRejectedValue(new Error("password=secret"));
    if (failure === "price") provider.createSandboxOrder.mockResolvedValue({ ...order, order: { ...order.order, paymentTotal: "102", paymentSubtotal: "101.25" } });
    if (failure === "destination") provider.createSandboxOrder.mockResolvedValue({ ...order, order: { ...order.order, destinationAddress: "0x00000000000000000000000000000000000000bb" } });
    expect(await call()).toMatchObject({ status: 202, body: { id, state: "unknown", reconciliationRequired: true, purchaseReady: false } });
    expect(store.markOrderUnknown).toHaveBeenCalledWith(id, "a");
    store.reserveOrder.mockResolvedValue({ record: { ...record, state: "unknown" }, fresh: false });
    expect((await call()).status).toBe(202); expect(provider.createSandboxOrder).toHaveBeenCalledTimes(1);
  });
  it("returns completed idempotent requests without recreating checkout", async () => {
    const { call, store, provider } = await setup(); store.reserveOrder.mockResolvedValue({ record: completed, fresh: false });
    expect((await call()).status).toBe(200); expect(provider.createSandboxOrder).not.toHaveBeenCalled();
  });
  it("rejects chain mismatch and exhausted customer rate limits before reserving", async () => {
    const { call, inspectChain, store, context } = await setup(); inspectChain.mockResolvedValue({ chainId: 8453, token: BASE_SEPOLIA_USDC });
    expect((await call()).status).toBe(409); expect(store.reserveOrder).not.toHaveBeenCalled();
    vi.spyOn(context.rateLimiter, "enforce").mockRejectedValue(new Error("rate limit exceeded"));
    expect((await call()).status).toBe(429);
  });
  it("scopes private lookup to owner and returns 404 for another customer", async () => {
    const { get, store } = await setup(); store.getOrder.mockResolvedValueOnce(null);
    expect((await get(`orders/${id}`, { "x-api-key": "other" })).status).toBe(404);
    expect(store.getOrder).toHaveBeenCalledWith(id, "b");
    expect((await get("orders/invalid")).status).toBe(400);
  });
  it("paginates history by timestamp and ID without exposing checkout or verification tokens", async () => {
    const { get, store } = await setup(); store.listOrders.mockResolvedValue([completed, completed]);
    const result = await get("history?limit=1"); expect(result.status).toBe(200);
    expect(result.body.items).toHaveLength(1); expect(result.body.nextCursor).toBeTypeOf("string");
    expect(JSON.stringify(result.body)).not.toContain("sessionToken"); expect(JSON.stringify(result.body)).not.toContain("private-verification-token");
    await get(`history?limit=1&cursor=${result.body.nextCursor}`);
    expect(store.listOrders).toHaveBeenLastCalledWith("a", 2, { createdAt: record.created_at.toISOString(), id });
    expect((await get("history?cursor=broken")).status).toBe(400); expect((await get("history?limit=101")).status).toBe(400);
  });
});
