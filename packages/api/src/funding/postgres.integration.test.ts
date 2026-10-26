import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { FundingStore } from "./store.js";
import { BASE_USDC } from "./config.js";

const database = process.env.API_LAYER_FUNDING_TEST_DB_URL;
describe.skipIf(!database)("durable PostgreSQL funding quotes", () => {
  const pool = new Pool({ connectionString: database });
  const store = new FundingStore(pool);
  afterAll(async () => { await pool.end(); });
  const input = {
    userId: "funding_customer_a", wallet: "0x00000000000000000000000000000000000000AA", chainId: 8453,
    token: BASE_USDC, paymentMethod: "GUEST_CHECKOUT_APPLE_PAY", requestAmount: "100", amountKind: "purchase" as const, sandbox: true,
    quote: { paymentTotal: "100.75", paymentSubtotal: "100", paymentCurrency: "USD" as const,
      purchaseAmount: "100.000000", purchaseCurrency: "USDC" as const, destinationAddress: "0x00000000000000000000000000000000000000AA",
      destinationNetwork: "base" as const, fees: [{ type: "FEE_TYPE_NETWORK", amount: "0.75", currency: "USD" as const }] },
  };

  it("persists exact decimal pricing across independent connections and denies another owner", async () => {
    const record = await store.insertQuote(input);
    expect(record.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(new Date(record.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const otherPool = new Pool({ connectionString: database });
    try {
      const restarted = new FundingStore(otherPool);
      expect(await restarted.getQuote(record.id, input.userId)).toEqual(input.quote);
      expect(await restarted.getQuote(record.id, "funding_customer_b")).toBeNull();
      const row = await otherPool.query("SELECT request_amount::text, wallet_address FROM funding_quotes WHERE id=$1", [record.id]);
      expect(row.rows[0]).toEqual({ request_amount: "100.000000", wallet_address: input.wallet.toLowerCase() });
    } finally { await otherPool.end(); }
  });

  it("does not return expired quotes", async () => {
    const record = await store.insertQuote(input);
    await pool.query("UPDATE funding_quotes SET created_at=now()-interval '2 minutes', expires_at=now()-interval '1 minute' WHERE id=$1", [record.id]);
    expect(await store.getQuote(record.id, input.userId)).toBeNull();
  });

  it("prevents public and browser-authenticated access to private pricing records", async () => {
    const client = await pool.connect();
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        await expect(client.query("SELECT * FROM funding_quotes")).rejects.toThrow("permission denied");
        await client.query("RESET ROLE");
      }
      await client.query("SET ROLE service_role");
      expect((await client.query("SELECT * FROM funding_quotes")).rows.length).toBeGreaterThan(0);
    } finally { await client.query("RESET ROLE"); client.release(); }
  });

  it.each([
    { requestAmount: "0" }, { requestAmount: "-1" }, { paymentMethod: "CARD" }, { chainId: 1 }, { chainId: 84532, sandbox: false },
  ])("enforces database financial constraints %j", async patch => {
    await expect(store.insertQuote({ ...input, ...patch })).rejects.toThrow();
  });
});

describe.skipIf(!database)("durable PostgreSQL funding order safety", () => {
  const pool = new Pool({ connectionString: database });
  const store = new FundingStore(pool);
  afterAll(async () => { await pool.end(); });
  let serial = 0;
  const reservation = () => ({ userId: `order_${Date.now()}_${serial++}`, idempotencyKey: "test_idempotency_1234", requestHash: "a".repeat(64), wallet: "0x00000000000000000000000000000000000000AA", chainId: 8453, token: BASE_USDC });
  const response = (id: string) => ({ order: { orderId: id, paymentTotal: "100.75", paymentSubtotal: "100", paymentCurrency: "USD" as const,
    purchaseAmount: "100", purchaseCurrency: "USDC" as const, destinationAddress: "0x00000000000000000000000000000000000000AA", destinationNetwork: "base" as const,
    fees: [{ type: "network", amount: "0.75", currency: "USD" as const }], status: "ONRAMP_ORDER_STATUS_PENDING_VERIFICATION",
    paymentMethod: "GUEST_CHECKOUT_APPLE_PAY" as const, partnerUserRef: "sandbox-test" }, paymentLink: { url: "https://pay.coinbase.com/?sessionToken=private", paymentLinkType: "embedded" }, userAuthToken: "private-verification-token" });

  it("atomically reserves once across concurrent independent connections and rejects key reuse for a changed request", async () => {
    const input = reservation();
    const results = await Promise.all(Array.from({ length: 8 }, () => store.reserveOrder(input)));
    expect(results.filter(r => r.fresh)).toHaveLength(1);
    expect(new Set(results.map(r => r.record.id)).size).toBe(1);
    await expect(store.reserveOrder({ ...input, requestHash: "b".repeat(64) })).rejects.toThrow("different funding request");
    const otherPool = new Pool({ connectionString: database });
    try { expect((await new FundingStore(otherPool).reserveOrder(input)).fresh).toBe(false); }
    finally { await otherPool.end(); }
  });

  it("blocks concurrent different keys and keeps ambiguous attempts blocked after restart", async () => {
    const input = reservation();
    const results = await Promise.allSettled([store.reserveOrder(input), store.reserveOrder({ ...input, idempotencyKey: "other_request_1234" })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const winner = results.find(r => r.status === "fulfilled");
    if (winner?.status !== "fulfilled") throw new Error("missing reservation");
    await store.markOrderUnknown(winner.value.record.id, input.userId);
    const otherPool = new Pool({ connectionString: database });
    try { await expect(new FundingStore(otherPool).reserveOrder({ ...input, idempotencyKey: "third_request_1234" })).rejects.toThrow("requires reconciliation"); }
    finally { await otherPool.end(); }
  });

  it("retains private provider data, denies cross-owner lookup and prevents another owner from mutating state", async () => {
    const input = reservation(); const { record } = await store.reserveOrder(input);
    await expect(store.completeOrder(record.id, "another_customer", response(record.id))).rejects.toThrow("not awaiting creation");
    await store.markOrderUnknown(record.id, "another_customer");
    expect((await store.getOrder(record.id, input.userId))?.state).toBe("creating");
    const saved = await store.completeOrder(record.id, input.userId, response(record.id));
    expect(saved.state).toBe("checkout_created");
    expect(saved.provider_response?.userAuthToken).toBe("private-verification-token");
    expect(await store.getOrder(record.id, "another_customer")).toBeNull();
    await expect(store.completeOrder(record.id, input.userId, response(record.id))).rejects.toThrow("not awaiting creation");
    expect((await store.reserveOrder(input)).record.provider_order_id).toBe(record.id);
  });

  it("paginates equal timestamps by unique ID without skipping records or leaking another owner's history", async () => {
    const input = reservation();
    for (let index = 0; index < 4; index++) {
      const { record } = await store.reserveOrder({ ...input, idempotencyKey: `pagination_key_${index}` });
      await store.completeOrder(record.id, input.userId, response(record.id));
    }
    await pool.query("UPDATE funding_orders SET created_at='2026-10-25T10:00:00.123Z' WHERE user_id=$1", [input.userId]);
    const first = await store.listOrders(input.userId, 2);
    const second = await store.listOrders(input.userId, 2, { createdAt: first[1].created_at.toISOString(), id: first[1].id });
    expect(new Set([...first, ...second].map(row => row.id)).size).toBe(4);
    expect(await store.listOrders("different_customer", 20)).toEqual([]);
    const next = await store.reserveOrder({ ...input, idempotencyKey: "precision_key_1234" });
    const precision = await pool.query("SELECT extract(microseconds FROM created_at)::bigint % 1000 AS remainder FROM funding_orders WHERE id=$1", [next.record.id]);
    expect(Number(precision.rows[0].remainder)).toBe(0);
  });

  it("denies browser database roles access to checkout links and verification tokens", async () => {
    const client = await pool.connect();
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        await expect(client.query("SELECT * FROM funding_orders")).rejects.toThrow("permission denied");
        await client.query("RESET ROLE");
      }
      await client.query("SET ROLE service_role");
      expect((await client.query("SELECT * FROM funding_orders")).rows.length).toBeGreaterThan(0);
    } finally { await client.query("RESET ROLE"); client.release(); }
  });

  it("rejects production orders and inconsistent durable states at the database boundary", async () => {
    const input = reservation(); const { record } = await store.reserveOrder(input);
    await expect(pool.query("UPDATE funding_orders SET sandbox=false WHERE id=$1", [record.id])).rejects.toThrow();
    await expect(pool.query("UPDATE funding_orders SET state='checkout_created' WHERE id=$1", [record.id])).rejects.toThrow();
  });
});
