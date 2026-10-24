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
