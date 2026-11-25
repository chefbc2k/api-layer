import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { FundingStore, type FundingAttempt } from "./store.js";
import type { CoinbaseQuote } from "./provider.js";

const quote: CoinbaseQuote = {
  paymentTotal: "10.10", paymentSubtotal: "10", paymentCurrency: "USD",
  purchaseAmount: "10", purchaseCurrency: "USDC", destinationAddress: "0xABC",
  destinationNetwork: "base", fees: [{ type: "network", amount: "0.10", currency: "USD" }],
};
const attempt = (patch: Partial<FundingAttempt> = {}): FundingAttempt => ({
  id: "attempt-id", user_id: "user-id", kind: "headless", fingerprint: "fingerprint",
  wallet_address: "0xabc", chain_id: "84532", sandbox: true, state: "creating",
  provider_order_id: null, provider_status: null, checkout_ciphertext: null,
  checkout_expires_at: null, created_at: new Date("2026-01-01T00:00:00.000Z"), ...patch,
});

function makeStore(...results: Array<{ rows?: unknown[]; rowCount?: number | null } | Error>) {
  const query = vi.fn().mockImplementation(async () => {
    const next = results.shift() ?? { rows: [], rowCount: 0 };
    if (next instanceof Error) throw next;
    return { rows: [], rowCount: null, ...next };
  });
  return { store: new FundingStore({ query } as unknown as Pool), query };
}

describe("FundingStore", () => {
  it("inserts normalized quote data and returns its expiry", async () => {
    const expiry = new Date("2026-01-01T00:01:00.000Z");
    const { store, query } = makeStore({ rows: [{ id: "quote-id", expires_at: expiry }], rowCount: 1 });
    await expect(store.insertQuote({
      userId: "user-id", wallet: "0xABC", chainId: 84532, token: "0xDEF", paymentMethod: "card",
      requestAmount: "10", amountKind: "purchase", sandbox: true, quote,
    })).resolves.toEqual({ id: "quote-id", expiresAt: expiry.toISOString() });
    expect(query.mock.calls[0]?.[1]).toEqual([
      "user-id", "0xabc", 84532, "0xdef", "card", "10", "purchase", true, JSON.stringify(quote),
    ]);
  });

  it("reads only unexpired quotes for their owner", async () => {
    const { store } = makeStore({ rows: [{ quote }] }, { rows: [] });
    await expect(store.getQuote("quote-id", "user-id")).resolves.toEqual(quote);
    await expect(store.getQuote("quote-id", "other-user")).resolves.toBeNull();
  });

  it("returns a quote record or null for the matching owner", async () => {
    const record = { wallet_address: "0xabc", chain_id: "84532", token_address: "0xdef", payment_method: "card", request_amount: "10", amount_kind: "purchase", sandbox: true, quote };
    const { store } = makeStore({ rows: [record] }, { rows: [] });
    await expect(store.getQuoteRecord("quote-id", "user-id")).resolves.toEqual(record);
    await expect(store.getQuoteRecord("quote-id", "other-user")).resolves.toBeNull();
  });

  it("finds an idempotent attempt or returns null", async () => {
    const saved = attempt();
    const { store } = makeStore({ rows: [saved] }, { rows: [] });
    await expect(store.findAttempt("user-id", "headless", "key")).resolves.toEqual(saved);
    await expect(store.findAttempt("user-id", "headless", "missing")).resolves.toBeNull();
  });

  it("creates a new attempt and lowercases its wallet", async () => {
    const saved = attempt();
    const { store, query } = makeStore({ rows: [saved], rowCount: 1 });
    await expect(store.beginAttempt({
      userId: "user-id", kind: "headless", key: "key", fingerprint: "fingerprint",
      quoteId: "quote-id", wallet: "0xABC", chainId: 84532, sandbox: true,
    })).resolves.toEqual({ created: true, attempt: saved });
    expect(query.mock.calls[0]?.[1]?.[5]).toBe("0xabc");
    expect(String(query.mock.calls[0]?.[1]?.[9])).toMatch(/^sandbox-[0-9a-f]{32}$/u);
  });

  it("reuses a matching concurrent attempt after insert conflict", async () => {
    const saved = attempt();
    const { store } = makeStore({ rows: [], rowCount: 0 }, { rows: [saved] });
    await expect(store.beginAttempt({
      userId: "user-id", kind: "headless", key: "key", fingerprint: "fingerprint",
      wallet: "0xABC", chainId: 84532, sandbox: false,
    })).resolves.toEqual({ created: false, attempt: saved });
  });

  it("rejects missing or differently fingerprinted idempotency conflicts", async () => {
    const input = { userId: "user-id", kind: "headless" as const, key: "key", fingerprint: "fingerprint", wallet: "0xABC", chainId: 84532, sandbox: false };
    const missing = makeStore({ rows: [], rowCount: 0 }, { rows: [] });
    await expect(missing.store.beginAttempt(input)).rejects.toMatchObject({ statusCode: 409 });
    const mismatch = makeStore({ rows: [], rowCount: 0 }, { rows: [attempt({ fingerprint: "different" })] });
    await expect(mismatch.store.beginAttempt(input)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("maps database uniqueness conflicts and preserves unrelated database errors", async () => {
    const input = { userId: "user-id", kind: "hosted" as const, key: "key", fingerprint: "fingerprint", wallet: "0xABC", chainId: 84532, sandbox: false };
    const unique = Object.assign(new Error("unique"), { code: "23505" });
    await expect(makeStore(unique).store.beginAttempt(input)).rejects.toMatchObject({ statusCode: 409 });
    const unavailable = new Error("database unavailable");
    await expect(makeStore(unavailable).store.beginAttempt(input)).rejects.toBe(unavailable);
  });

  it("completes only an open attempt and fails when no row is returned", async () => {
    const saved = attempt({ state: "ready", expected_usdc_units: "1000000" });
    const { store, query } = makeStore({ rows: [saved] });
    await expect(store.completeAttempt("attempt-id", "user-id", "ciphertext", new Date(), undefined, undefined, "2000000")).resolves.toEqual(saved);
    expect(query.mock.calls[0]?.[1]?.slice(4)).toEqual([null, null, "2000000"]);
    await expect(makeStore({ rows: [] }).store.completeAttempt("missing", "user-id", "ciphertext", new Date())).rejects.toThrow("Funding attempt could not be completed");
  });

  it("marks uncertainty, reads attempts and paginates history", async () => {
    const saved = attempt();
    const { store, query } = makeStore(undefined as never, { rows: [saved] }, { rows: [] }, { rows: [saved] }, { rows: [saved] });
    await store.markUncertain("attempt-id", "user-id");
    await expect(store.getAttempt("attempt-id", "user-id")).resolves.toEqual(saved);
    await expect(store.getAttempt("missing", "user-id")).resolves.toBeNull();
    await expect(store.history("user-id", 20)).resolves.toEqual([saved]);
    await expect(store.history("user-id", 20, "cursor-id")).resolves.toEqual([saved]);
    expect(query.mock.calls[0]?.[1]).toEqual(["attempt-id", "user-id"]);
    expect(query.mock.calls[3]?.[1]).toEqual(["user-id", 20, null]);
    expect(query.mock.calls[4]?.[1]).toEqual(["user-id", 20, "cursor-id"]);
  });
});
