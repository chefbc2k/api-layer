import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPrivateKey, createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { BASE_USDC, BASE_SEPOLIA_USDC, decimalUnits, readFundingConfig, type FundingConfig } from "./config.js";
import { CoinbaseFundingProvider, type CoinbaseQuote } from "./provider.js";
import { createFundingRouter, validateQuote } from "./routes.js";
import { loadApiKeys } from "../shared/auth.js";
import { RateLimiter } from "../shared/rate-limit.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";

const wallet = "0x00000000000000000000000000000000000000AA";
const config: FundingConfig = { mode: "sandbox", apiKeyId: "test-key", apiKeySecret: "test-secret", origins: ["https://app.example"], databaseUrl: "postgresql://localhost/funding" };
const quote: CoinbaseQuote = { paymentTotal: "100.75", paymentSubtotal: "100", paymentCurrency: "USD", purchaseAmount: "100.000000", purchaseCurrency: "USDC", destinationAddress: wallet, destinationNetwork: "base", fees: [{ type: "FEE_TYPE_NETWORK", amount: "0.75", currency: "USD" }] };
const options = { payment_currencies: [{ id: "USD", limits: [{ id: "GUEST_CHECKOUT_APPLE_PAY", min: "5.00", max: "2500.00" }, { id: "ACH_BANK_ACCOUNT", min: "10", max: "25000" }] }], purchase_currencies: [{ symbol: "USDC", networks: [{ name: "base", chain_id: 8453, contract_address: BASE_USDC }] }] };
const env = { API_LAYER_FUNDING_ENABLED: "true", CDP_API_KEY_ID: "test-key", CDP_API_KEY_SECRET: "test-secret", API_LAYER_FUNDING_ORIGINS_JSON: '["https://app.example"]', SUPABASE_DB_URL: "postgresql://localhost/funding" };

describe("funding configuration and decimal validation", () => {
  it("is disabled by default and does not require wallet-signing secrets", () => {
    expect(readFundingConfig({})).toBeNull();
    expect(readFundingConfig({ API_LAYER_FUNDING_ENABLED: "false" })).toBeNull();
    expect(readFundingConfig(env)).toEqual(config);
    expect(readFundingConfig({ ...env, API_LAYER_FUNDING_MODE: "live" })?.mode).toBe("live");
  });
  it.each([
    { API_LAYER_FUNDING_MODE: "unexpected" }, { CDP_API_KEY_SECRET: "" }, { CDP_API_KEY_ID: "" },
    { SUPABASE_DB_URL: "https://localhost/db" }, { API_LAYER_FUNDING_ORIGINS_JSON: "bad" },
    { API_LAYER_FUNDING_ORIGINS_JSON: '["*"]' }, { API_LAYER_FUNDING_ORIGINS_JSON: '["https://app.example/path"]' },
    { API_LAYER_FUNDING_ORIGINS_JSON: '["http://app.example"]' }, { API_LAYER_FUNDING_ORIGINS_JSON: "[]" },
  ])("rejects unsafe/incomplete configuration without leaking input: %j", patch => {
    expect(() => readFundingConfig({ ...env, ...patch })).toThrow("Funding configuration requires");
  });
  it("supports local browser testing and rejects misspelled enable flags", () => {
    expect(readFundingConfig({ ...env, API_LAYER_FUNDING_ORIGINS_JSON: '["http://localhost:3000"]' })?.origins).toEqual(["http://localhost:3000"]);
    expect(() => readFundingConfig({ API_LAYER_FUNDING_ENABLED: "yes" })).toThrow("must be true or false");
  });
  it("preserves micro-USDC exactly without floating-point arithmetic", () => {
    expect(decimalUnits("999999999999.999999", 6)).toBe(999999999999999999n);
    expect(decimalUnits("0.000001", 6)).toBe(1n);
    expect(decimalUnits("10.10", 2)).toBe(1010n);
  });
  it.each(["-1", "NaN", "1e2", "01", ".1", "1.", "1.0000001", "1000000000000", " 10"])("rejects ambiguous amount %s", amount => {
    expect(() => decimalUnits(amount, 6)).toThrow("decimal string");
  });
});

describe("Coinbase provider boundary", () => {
  it("signs the exact HTTP target and only requests quotes even if payable fields are supplied", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ order: quote, paymentLink: { url: "secret-link" } })));
    const sign = vi.fn().mockResolvedValue("jwt");
    const provider = new CoinbaseFundingProvider(config, fetcher, sign);
    expect(await provider.quote({ isQuote: false, destinationNetwork: "ethereum", purchaseCurrency: "ETH" })).toEqual(quote);
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ requestHost: "api.cdp.coinbase.com", requestPath: "/platform/v2/onramp/orders", requestMethod: "POST", expiresIn: 120 }));
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.cdp.coinbase.com/platform/v2/onramp/orders");
    expect(JSON.parse(String(init?.body))).toMatchObject({ isQuote: true, destinationNetwork: "base", purchaseCurrency: "USDC", paymentCurrency: "USD" });
    expect(init?.redirect).toBe("error");
  });
  it("uses escaped location parameters without placing query parameters in JWT requestPath", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(options)));
    const sign = vi.fn().mockResolvedValue("jwt");
    expect(await new CoinbaseFundingProvider(config, fetcher, sign).options("US", "IL")).toEqual(options);
    expect(String(fetcher.mock.calls[0][0])).toBe("https://api.developer.coinbase.com/onramp/v1/buy/options?country=US&networks=base&subdivision=IL");
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ requestMethod: "GET", requestPath: "/onramp/v1/buy/options" }));
  });
  it.each(["network", "status", "shape", "json", "sign"])("redacts %s failures", async failure => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      if (failure === "network") throw new Error("PII-secret");
      if (failure === "status") return new Response("PII-secret", { status: 429 });
      return new Response(failure === "json" ? "not-json" : JSON.stringify({ private: "PII-secret" }));
    });
    const sign = vi.fn().mockImplementation(async () => { if (failure === "sign") throw new Error("PII-secret"); return "jwt"; });
    await expect(new CoinbaseFundingProvider(config, fetcher, sign).quote({})).rejects.toThrow("Coinbase funding request failed; retry later");
  });
  it("generates a verifiable request-bound JWT with the installed CDP SDK", async () => {
    const keys = generateKeyPairSync("ed25519");
    const seed = createPrivateKey(keys.privateKey.export({ format: "pem", type: "pkcs8" })).export({ format: "der", type: "pkcs8" }).subarray(-32);
    const pub = createPublicKey(keys.publicKey.export({ format: "pem", type: "spki" })).export({ format: "der", type: "spki" }).subarray(-32);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(options)));
    const real = new CoinbaseFundingProvider({ ...config, apiKeySecret: Buffer.concat([seed, pub]).toString("base64") }, fetcher);
    await real.options("US", "IL");
    const headers = fetcher.mock.calls[0][1]?.headers as Record<string, string>;
    const jwt = headers.Authorization.replace("Bearer ", "");
    const [head, payload, signature] = jwt.split(".");
    expect(verify(null, Buffer.from(`${head}.${payload}`), keys.publicKey, Buffer.from(signature, "base64url"))).toBe(true);
    expect(JSON.parse(Buffer.from(payload, "base64url").toString()).uris).toEqual(["GET api.developer.coinbase.com/onramp/v1/buy/options"]);
  });
});

describe("funding HTTP boundary", () => {
  const servers: Array<ReturnType<express.Express["listen"]>> = [];
  afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve())); });

  async function setup(settings: { live?: boolean; disabled?: boolean; chain?: number; token?: string; fundingId?: boolean; binding?: string; apiKeys?: Record<string, unknown> } = {}) {
    const provider = { options: vi.fn().mockResolvedValue(structuredClone(options)), quote: vi.fn().mockResolvedValue(structuredClone(quote)) };
    const store = { insertQuote: vi.fn().mockResolvedValue({ id: "quote-id", expiresAt: "2026-10-20T16:01:00.000Z" }) };
    const inspectChain = vi.fn().mockResolvedValue({ chainId: settings.chain ?? 84532, token: settings.token ?? BASE_SEPOLIA_USDC });
    const context = { apiKeys: loadApiKeys({ API_LAYER_KEYS_JSON: JSON.stringify(settings.apiKeys ?? { customer: { label: "customer", walletAddress: settings.binding ?? wallet, ...(settings.fundingId === false ? {} : { fundingUserId: "user_a" }) } }) }), rateLimiter: new RateLimiter(), config: { chainId: 84532 } } as unknown as ApiExecutionContext;
    const app = express(); app.use(express.json());
    app.use(createFundingRouter(context, { config: settings.disabled ? null : { ...config, mode: settings.live ? "live" : "sandbox" }, provider, store, inspectChain }));
    const server = app.listen(0); servers.push(server);
    await new Promise<void>(resolve => server.once("listening", resolve));
    const port = (server.address() as import("node:net").AddressInfo).port;
    async function call(body?: unknown, headers: Record<string, string> = {}) {
      const response = await fetch(`http://127.0.0.1:${port}/v1/funding/${body === undefined ? "options?country=US&subdivision=IL" : "quotes"}`, {
        method: body === undefined ? "GET" : "POST", headers: { "x-api-key": "customer", "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json().catch(() => null), headers: response.headers };
    }
    return { provider, store, inspectChain, call, context, port };
  }
  const input = { country: "US", subdivision: "IL", paymentMethod: "GUEST_CHECKOUT_APPLE_PAY", purchaseAmount: "100" };

  it("returns scoped eligibility and keeps pricing uncacheable", async () => {
    const { call } = await setup();
    const result = await call(undefined, { origin: "https://app.example" });
    expect(result.status).toBe(200);
    expect(result.body.headlessPaymentMethods).toEqual([{ id: "GUEST_CHECKOUT_APPLE_PAY", min: "5.00", max: "2500.00" }]);
    expect(result.body.hostedPaymentMethods).toEqual([{ id: "ACH_BANK_ACCOUNT", min: "10", max: "25000" }]);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("access-control-allow-origin")).toBe("https://app.example");
  });
  it("persists a non-payable quote bound to the server customer and exact wallet", async () => {
    const { call, provider, store } = await setup();
    const result = await call(input);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ payable: false, sandbox: true, id: "quote-id", quote });
    expect(provider.quote).toHaveBeenCalledWith(expect.objectContaining({ destinationAddress: expect.stringMatching(/^0x/i), partnerUserRef: expect.stringMatching(/^sandbox-[a-f0-9]{32}$/), purchaseAmount: "100" }));
    expect(store.insertQuote).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_a", chainId: 84532, amountKind: "purchase" }));
  });
  it.each([
    { destinationAddress: "0x00000000000000000000000000000000000000bb" }, { partnerUserRef: "other-user" },
    { isQuote: false }, { purchaseAmount: "-1" }, { purchaseAmount: "1.0000001" }, { paymentAmount: "100" },
    { country: "CA" }, { paymentMethod: "CARD" }, { subdivision: undefined }, { purchaseAmount: undefined },
  ])("rejects injected or invalid input %j before quote execution", async patch => {
    const { call, provider, store } = await setup();
    expect((await call({ ...input, ...patch })).status).toBe(400);
    expect(provider.quote).not.toHaveBeenCalled(); expect(store.insertQuote).not.toHaveBeenCalled();
  });
  it.each([
    { "x-api-key": "" }, { "x-api-key": "unknown" }, { "x-wallet-address": "0x00000000000000000000000000000000000000bb" }, { origin: "https://evil.example" },
  ])("rejects unauthorized requests %j before provider access", async headers => {
    const { call, provider, store, inspectChain } = await setup();
    expect([401, 403]).toContain((await call(input, headers)).status);
    expect(inspectChain).not.toHaveBeenCalled();
    expect(provider.options).not.toHaveBeenCalled();
    expect(provider.quote).not.toHaveBeenCalled();
    expect(store.insertQuote).not.toHaveBeenCalled();
  });
  it.each(["founder", "admin", "operator", "buyer", "seller", "licensee", "collaborator", "read-only", "unknown-key"])(
    "does not let a %s identity use the funding quote write without explicit customer provisioning",
    async identity => {
      const knownIdentity = identity !== "unknown-key";
      const apiKeys = knownIdentity ? {
        [identity]: {
          label: identity,
          walletAddress: wallet,
          roles: identity === "read-only" ? ["read-only"] : [identity],
        },
      } : {};
      const { call, provider, store, inspectChain } = await setup({ apiKeys });

      expect((await call(input, { "x-api-key": identity })).status).toBe(knownIdentity ? 403 : 401);
      expect(inspectChain).not.toHaveBeenCalled();
      expect(provider.options).not.toHaveBeenCalled();
      expect(provider.quote).not.toHaveBeenCalled();
      expect(store.insertQuote).not.toHaveBeenCalled();
    },
  );
  it("rejects a provisioned read-only funding key before provider or storage access", async () => {
    const { call, provider, store, inspectChain } = await setup({
      apiKeys: { readonly: { label: "readonly", roles: ["read-only"], fundingUserId: "user_a", walletAddress: wallet } },
    });

    expect((await call(input, { "x-api-key": "readonly" })).status).toBe(403);
    expect(inspectChain).not.toHaveBeenCalled();
    expect(provider.options).not.toHaveBeenCalled();
    expect(provider.quote).not.toHaveBeenCalled();
    expect(store.insertQuote).not.toHaveBeenCalled();
  });
  it.each([{ fundingId: false }, { binding: "invalid" }, { binding: "0x0000000000000000000000000000000000000000" }])("requires valid explicitly provisioned customer bindings %j", async setting => {
    const { call, provider } = await setup(setting);
    expect((await call(input)).status).toBe(403); expect(provider.quote).not.toHaveBeenCalled();
  });
  it.each([{ chain: 1 }, { token: BASE_USDC }, { live: true }])("rejects mismatched network/token %j", async setting => {
    const { call, provider } = await setup(setting);
    expect((await call(input)).status).toBe(409); expect(provider.quote).not.toHaveBeenCalled();
  });
  it("does not persist inconsistent or redirected quotes", async () => {
    const { call, provider, store } = await setup();
    provider.quote.mockResolvedValue({ ...quote, destinationAddress: "0x00000000000000000000000000000000000000bb" });
    expect((await call(input)).status).toBe(502); expect(store.insertQuote).not.toHaveBeenCalled();
  });
  it.each([
    { paymentTotal: "100.76" }, { purchaseAmount: "101" }, { paymentSubtotal: "0" }, { fees: [{ type: "network", amount: "-1", currency: "USD" as const }] },
  ])("rejects inconsistent upstream pricing %j", patch => {
    expect(() => validateQuote({ ...quote, ...patch }, wallet, "purchase", "100")).toThrow("inconsistent quote pricing");
  });
  it("validates fixed fiat budgets and rejects out-of-range requests", async () => {
    const { call, provider } = await setup();
    expect((await call({ ...input, purchaseAmount: undefined, paymentAmount: "1" })).status).toBe(422);
    provider.quote.mockResolvedValue({ ...quote, paymentTotal: "100", paymentSubtotal: "99.25" });
    expect((await call({ ...input, purchaseAmount: undefined, paymentAmount: "100" })).status).toBe(201);
  });
  it("redacts storage failures and fails closed for unavailable assets/methods", async () => {
    const { call, store, provider } = await setup();
    store.insertQuote.mockRejectedValue(new Error("password=secret"));
    expect(await call(input)).toMatchObject({ status: 503, body: { error: "Funding quote storage is unavailable" } });
    provider.options.mockResolvedValue({ ...options, purchase_currencies: [] });
    expect((await call(input)).status).toBe(422);
  });
  it("supports CORS preflight without granting authentication", async () => {
    const { port, provider } = await setup();
    const response = await fetch(`http://127.0.0.1:${port}/v1/funding/quotes`, { method: "OPTIONS", headers: { origin: "https://app.example" } });
    expect(response.status).toBe(204); expect(provider.options).not.toHaveBeenCalled();
  });
  it("leaves funding unmounted when disabled", async () => {
    const { call, provider } = await setup({ disabled: true });
    expect((await call()).status).toBe(404); expect(provider.options).not.toHaveBeenCalled();
  });
  it("enforces the customer rate limit before upstream requests", async () => {
    const { call, context, provider } = await setup();
    vi.spyOn(context.rateLimiter, "enforce").mockRejectedValue(new Error("rate limit exceeded"));
    expect((await call(input)).status).toBe(429); expect(provider.quote).not.toHaveBeenCalled();
  });
});
