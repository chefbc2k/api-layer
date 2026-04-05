import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  };
  return {
    client,
    pool,
    Pool: vi.fn(() => pool),
  };
});

vi.mock("pg", () => ({
  Pool: mocks.Pool,
}));

import { IndexerDatabase } from "./db.js";

describe("IndexerDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pool.connect.mockResolvedValue(mocks.client);
    mocks.client.query.mockReset();
  });

  it("constructs the pool with the provided connection string and proxies queries", async () => {
    mocks.pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

    const db = new IndexerDatabase("postgres://example");
    const result = await db.query("select 1", ["arg"]);

    expect(mocks.Pool).toHaveBeenCalledWith({ connectionString: "postgres://example" });
    expect(mocks.pool.query).toHaveBeenCalledWith("select 1", ["arg"]);
    expect(result).toEqual({ rows: [{ id: 1 }] });
  });

  it("wraps successful callbacks in BEGIN/COMMIT and releases the client", async () => {
    mocks.client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const db = new IndexerDatabase("postgres://example");
    const result = await db.withTransaction(async (client) => {
      await client.query("select 1");
      return "ok";
    });

    expect(result).toBe("ok");
    expect(mocks.client.query.mock.calls).toEqual([
      ["BEGIN"],
      ["select 1"],
      ["COMMIT"],
    ]);
    expect(mocks.client.release).toHaveBeenCalledOnce();
  });

  it("rolls back failed callbacks and rethrows the original error", async () => {
    mocks.client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const failure = new Error("boom");

    const db = new IndexerDatabase("postgres://example");

    await expect(db.withTransaction(async () => {
      throw failure;
    })).rejects.toBe(failure);

    expect(mocks.client.query.mock.calls).toEqual([
      ["BEGIN"],
      ["ROLLBACK"],
    ]);
    expect(mocks.client.release).toHaveBeenCalledOnce();
  });

  it("closes the underlying pool", async () => {
    mocks.pool.end.mockResolvedValue(undefined);

    const db = new IndexerDatabase("postgres://example");
    await db.close();

    expect(mocks.pool.end).toHaveBeenCalledOnce();
  });
});
