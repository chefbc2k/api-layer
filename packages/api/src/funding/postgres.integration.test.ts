import { PostgresWebhookInbox } from "./webhook.js";
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

describe.skipIf(!database)("durable checkout concurrency and restart", () => {
  const pool = new Pool({ connectionString: database });
  const store = new FundingStore(pool);
  afterAll(async () => { await pool.end(); });
  const input = (userId: string, key = "checkout_key_0001") => ({ userId, key, kind: "hosted" as const,
    fingerprint: "a".repeat(64), wallet: "0x00000000000000000000000000000000000000aa", chainId: 8453, sandbox: true });

  it("reserves exactly once across concurrent connections", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => store.beginAttempt(input("concurrent_owner"))));
    expect(results.filter(result => result.created)).toHaveLength(1);
    expect(new Set(results.map(result => result.attempt.id)).size).toBe(1);
  });
  it("rejects a changed fingerprint and a new key while creation is unresolved", async () => {
    await store.beginAttempt(input("locked_owner"));
    await expect(store.beginAttempt({ ...input("locked_owner"), fingerprint: "b".repeat(64) })).rejects.toThrow("different checkout");
    await expect(store.beginAttempt(input("locked_owner", "checkout_key_0002"))).rejects.toThrow("unresolved funding attempt");
  });
  it("persists ambiguity and blocks duplicates after a process restart", async () => {
    const { attempt } = await store.beginAttempt(input("restart_owner"));
    await store.markUncertain(attempt.id, "restart_owner");
    const restartedPool = new Pool({ connectionString: database });
    try {
      const restarted = new FundingStore(restartedPool);
      expect((await restarted.findAttempt("restart_owner", "hosted", "checkout_key_0001"))?.state).toBe("uncertain");
      await expect(restarted.beginAttempt(input("restart_owner", "checkout_key_0002"))).rejects.toThrow("unresolved funding attempt");
    } finally { await restartedPool.end(); }
  });
  it("never overwrites a committed result on a lost acknowledgement", async () => {
    const { attempt } = await store.beginAttempt(input("committed_owner"));
    await store.completeAttempt(attempt.id, "committed_owner", "encrypted-value", new Date(Date.now()+300_000));
    await store.markUncertain(attempt.id, "committed_owner");
    expect((await store.getAttempt(attempt.id, "committed_owner"))?.state).toBe("ready");
    expect(await store.getAttempt(attempt.id, "other_owner")).toBeNull();
    await expect(store.completeAttempt(attempt.id, "other_owner", "replacement", new Date())).rejects.toThrow();
  });
  it("paginates equal-timestamp rows deterministically without another owner's cursor", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const { attempt } = await store.beginAttempt(input("history_owner", `history_key_000${i}`));
      await store.completeAttempt(attempt.id, "history_owner", "ciphertext", new Date(Date.now()+300_000));
      ids.push(attempt.id);
    }
    await pool.query("UPDATE funding_attempts SET created_at='2026-01-01' WHERE user_id='history_owner'");
    const first = await store.history("history_owner", 2);
    const second = await store.history("history_owner", 2, first[1].id);
    expect([...first,...second].map(row => row.id)).toEqual(ids.sort().reverse());
    expect(await store.history("other_owner", 2, first[1].id)).toEqual([]);
  });
  it("denies browser roles access to checkout secrets", async () => {
    const client = await pool.connect();
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        await expect(client.query("SELECT * FROM funding_attempts")).rejects.toThrow("permission denied");
        await client.query("RESET ROLE");
      }
      await client.query("SET ROLE service_role");
      expect((await client.query("SELECT * FROM funding_attempts")).rowCount).toBeGreaterThan(0);
    } finally { await client.query("RESET ROLE"); client.release(); }
  });
});

describe.skipIf(!database)("durable webhook replay identity", () => {
  const pool = new Pool({ connectionString: database });
  afterAll(async () => { await pool.end(); });
  it("enqueues exactly once across concurrent writers and rejects identity collisions", async () => {
    const inbox = new PostgresWebhookInbox(pool);
    const results = await Promise.all(Array.from({length:8}, () => inbox.enqueue("delivery-1","onramp.updated","a".repeat(64),Buffer.from("{}"))));
    expect(results.filter(Boolean)).toHaveLength(1);
    const restartedPool = new Pool({connectionString:database});
    try { expect(await new PostgresWebhookInbox(restartedPool).enqueue("delivery-1","onramp.updated","a".repeat(64),Buffer.from("{}"))).toBe(false); }
    finally { await restartedPool.end(); }
    await expect(inbox.enqueue("delivery-1","onramp.updated","b".repeat(64),Buffer.from("different"))).rejects.toThrow("collision");
    await expect(inbox.enqueue("delivery-1","different","a".repeat(64),Buffer.from("{}"))).rejects.toThrow("collision");
  });
  it("keeps authenticated provider bytes private from browser roles", async () => {
    const client=await pool.connect();
    try { await client.query("SET ROLE authenticated"); await expect(client.query("SELECT raw_body FROM funding_webhook_inbox")).rejects.toThrow("permission denied"); }
    finally { await client.query("RESET ROLE"); client.release(); }
  });
});
