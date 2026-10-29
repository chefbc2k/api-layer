import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { TxRequestStore } from "./tx-store.js";
import { loadApiKeys } from "./auth.js";
import { transactionRequestOwnerHash } from "./request-owner.js";

const database = process.env.API_LAYER_TX_REQUEST_TEST_DB_URL;
describe.skipIf(!database)("durable transaction-request owner isolation", () => {
  const pool = new Pool({ connectionString: database });
  const store = new TxRequestStore(database);
  afterAll(async () => { await store.close(); await pool.end(); });
  const keys = loadApiKeys({ API_LAYER_KEYS_JSON: JSON.stringify({
    a: { label: "same", signerId: "same-signer", walletAddress: "0xabc", requestOwnerId: "a" },
    b: { label: "same", signerId: "same-signer", walletAddress: "0xabc", requestOwnerId: "b" },
    rotated: { label: "renamed", signerId: "same-signer", requestOwnerId: "a" },
    wrongSigner: { label: "same", signerId: "other", requestOwnerId: "a" },
  }) });
  const owner = transactionRequestOwnerHash(keys.a);
  const input = { method: "Facet.method", params: ["private"], status: "queued", ownerHash: owner };
  it("persists ownership across restart and scopes SQL lookup by the complete identity", async () => {
    const id = await store.insert(input); expect(id).toBeTruthy();
    const restarted = new TxRequestStore(database);
    try {
      expect(await restarted.getOwned(id!, owner)).toMatchObject({ id, params: ["private"], owner_hash: owner });
      expect(await restarted.getOwned(id!, transactionRequestOwnerHash(keys.b))).toBeNull();
      expect(await restarted.getOwned(id!, transactionRequestOwnerHash(keys.wrongSigner))).toBeNull();
      expect(await restarted.getOwned(id!, transactionRequestOwnerHash(keys.rotated))).toMatchObject({ id });
      await restarted.update(id!, { status: "submitted", txHash: "0xtx" });
      expect(await restarted.getOwned(id!, owner)).toMatchObject({ owner_hash: owner, status: "submitted" });
    } finally { await restarted.close(); }
  });
  it("retains legacy ownerless rows without exposing them to any API owner", async () => {
    const id = await store.insert({ method: "Legacy.method", params: ["legacy"], status: "queued" });
    expect(await store.getOwned(id!, owner)).toBeNull();
    expect((await pool.query("SELECT params, owner_hash FROM tx_requests WHERE id=$1", [id])).rows[0]).toEqual({ params: ["legacy"], owner_hash: null });
  });
  it("does not persist API key plaintext and rejects malformed ownership hashes", async () => {
    const id = await store.insert(input);
    const row = (await pool.query("SELECT owner_hash FROM tx_requests WHERE id=$1", [id])).rows[0];
    expect(row.owner_hash).toMatch(/^[0-9a-f]{64}$/); expect(row.owner_hash).not.toBe(keys.a.apiKey);
    await expect(store.insert({ ...input, ownerHash: "bad" })).rejects.toThrow();
  });
  it("denies browser database roles direct access to private requests", async () => {
    const client = await pool.connect();
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        await expect(client.query("SELECT * FROM tx_requests")).rejects.toThrow("permission denied");
        await client.query("RESET ROLE");
      }
    } finally { await client.query("RESET ROLE"); client.release(); }
  });
});
