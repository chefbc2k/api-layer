import { beforeEach, describe, expect, it, vi } from "vitest";

const poolState = vi.hoisted(() => ({
  instances: [] as Array<{ query: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }>,
}));

vi.mock("pg", () => {
  class Pool {
    query = vi.fn();
    end = vi.fn();

    constructor() {
      poolState.instances.push(this);
    }
  }

  return { Pool };
});

import { TxRequestStore } from "./tx-store.js";

describe("TxRequestStore", () => {
  beforeEach(() => {
    poolState.instances.length = 0;
  });

  it("stays disabled without a connection string", async () => {
    const store = new TxRequestStore(undefined);

    expect(store.enabled()).toBe(false);
    await expect(store.insert({ method: "Facet.method", params: [], status: "queued" })).resolves.toBeNull();
    await expect(store.get("req-1")).resolves.toBeNull();
    await expect(store.update("req-1", { status: "sent" })).resolves.toBeUndefined();
    await expect(store.close()).resolves.toBeUndefined();
    expect(poolState.instances).toHaveLength(0);
  });

  it("serializes inserts and updates through the pool", async () => {
    const store = new TxRequestStore("postgres://local/test");
    const pool = poolState.instances[0];

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: "req-1" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: "req-1",
          requester_wallet: "0xabc",
          signer_id: "founder-key",
          method: "Facet.method",
          params: [{ value: "1" }],
          tx_hash: "0xtx",
          status: "confirmed",
          response_payload: { ok: true },
          relay_mode: "gasless",
          api_key_label: "founder",
          request_hash: "0xrequest",
          spend_cap_decision: "approved",
          created_at: "2026-04-05T00:00:00Z",
          updated_at: "2026-04-05T00:00:01Z",
        }],
      });

    await expect(store.insert({
      requesterWallet: "0xabc",
      signerId: "founder-key",
      method: "Facet.method",
      params: [{ value: 1n }],
      status: "queued",
      relayMode: "gasless",
      apiKeyLabel: "founder",
      requestHash: "0xrequest",
      spendCapDecision: "approved",
      responsePayload: { ok: true },
      txHash: "0xtx",
    })).resolves.toBe("req-1");

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO tx_requests"),
      [
        "0xabc",
        "founder-key",
        "Facet.method",
        JSON.stringify([{ value: "1" }], (_key, value) => typeof value === "bigint" ? value.toString() : value),
        "0xtx",
        "queued",
        JSON.stringify({ ok: true }),
        "gasless",
        "founder",
        "0xrequest",
        "approved",
      ],
    );

    await expect(store.update("req-1", {
      status: "confirmed",
      txHash: "0xtx",
      requestHash: "0xrequest",
      spendCapDecision: "approved",
    })).resolves.toBeUndefined();

    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE tx_requests"),
      ["req-1", "confirmed", null, "0xtx", "0xrequest", "approved"],
    );

    await expect(store.get("req-1")).resolves.toMatchObject({
      id: "req-1",
      method: "Facet.method",
      tx_hash: "0xtx",
      status: "confirmed",
    });
    expect(pool.query).toHaveBeenNthCalledWith(3, "SELECT * FROM tx_requests WHERE id = $1", ["req-1"]);

    await store.close();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});
