import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    query: vi.fn(),
    withTransaction: vi.fn(),
  };
  const providerRouter = {
    withProvider: vi.fn(),
  };
  return {
    db,
    providerRouter,
    IndexerDatabase: vi.fn(() => db),
    ProviderRouter: vi.fn(() => providerRouter),
    buildEventRegistry: vi.fn(),
    decodeEvent: vi.fn(),
    readConfigFromEnv: vi.fn(),
    projectEvent: vi.fn(),
    rebuildCurrentRows: vi.fn(),
  };
});

vi.mock("../../client/src/index.js", () => ({
  ProviderRouter: mocks.ProviderRouter,
  readConfigFromEnv: mocks.readConfigFromEnv,
}));

vi.mock("./events.js", () => ({
  buildEventRegistry: mocks.buildEventRegistry,
  decodeEvent: mocks.decodeEvent,
}));

vi.mock("./db.js", () => ({
  IndexerDatabase: mocks.IndexerDatabase,
}));

vi.mock("./projections/index.js", () => ({
  projectEvent: mocks.projectEvent,
}));

vi.mock("./projections/common.js", () => ({
  rebuildCurrentRows: mocks.rebuildCurrentRows,
}));

vi.mock("./projections/tables.js", () => ({
  projectionTables: ["projection_one", "projection_two"],
}));

import { EventIndexer } from "./worker.js";

describe("EventIndexer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_DB_URL = "postgres://example";
    delete process.env.API_LAYER_INDEXER_START_BLOCK;
    delete process.env.API_LAYER_INDEXER_POLL_INTERVAL_MS;
    delete process.env.API_LAYER_FINALITY_CONFIRMATIONS;
    mocks.readConfigFromEnv.mockReturnValue({
      chainId: 84532,
      cbdpRpcUrl: "http://cbdp",
      alchemyRpcUrl: "http://alchemy",
      providerErrorThreshold: 2,
      providerErrorWindowMs: 1000,
      providerRecoveryCooldownMs: 1000,
      diamondAddress: "0xdiamond",
    });
    mocks.buildEventRegistry.mockReturnValue(new Map());
    mocks.db.withTransaction.mockImplementation(async (work: (client: { query: typeof vi.fn }) => Promise<unknown>) => {
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      return work(client as never);
    });
  });

  it("returns the configured start block when no checkpoint exists", async () => {
    mocks.db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    process.env.API_LAYER_INDEXER_START_BLOCK = "42";

    const indexer = new EventIndexer();
    await expect((indexer as any).getCheckpoint()).resolves.toEqual({
      cursorBlock: 42n,
      finalizedBlock: 0n,
      cursorBlockHash: null,
    });
  });

  it("marks reorged data orphaned and rewinds the checkpoint", async () => {
    mocks.db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.detectReorg") {
        return work({
          getBlock: vi.fn().mockResolvedValue({ hash: "0xnew" }),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    const result = await (indexer as any).detectReorg({
      cursorBlock: 9n,
      cursorBlockHash: "0xold",
    });

    expect(result).toBe(true);
    expect(mocks.db.query).toHaveBeenNthCalledWith(1, expect.stringContaining("UPDATE raw_events"), [84532, "9"]);
    expect(mocks.rebuildCurrentRows).toHaveBeenCalledTimes(2);
    expect(mocks.db.query).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO indexer_checkpoints"), [84532, "8", "8", null]);
  });

  it("processes logs, projects decoded events, and persists the block checkpoint", async () => {
    mocks.db.query
      .mockResolvedValueOnce({ rows: [{ id: 77 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mocks.decodeEvent.mockReturnValue({
      facetName: "AlphaFacet",
      eventName: "Transfer",
      wrapperKey: "Transfer",
      fullEventKey: "AlphaFacet.Transfer",
      args: { tokenId: "1" },
      signature: "Transfer(address,address,uint256)",
    });
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.getLogs") {
        return work({
          getLogs: vi.fn().mockResolvedValue([{
            transactionHash: "0xtx",
            index: 1,
            blockNumber: 10,
            blockHash: "0xblock",
            address: "0xdiamond",
            topics: ["0xtopic"],
          }]),
        });
      }
      if (label === "indexer.blockHash") {
        return work({
          getBlock: vi.fn().mockResolvedValue({ hash: "0xblock" }),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    await (indexer as any).processRange(10n, 10n, 30n);

    expect(mocks.projectEvent).toHaveBeenCalledWith(expect.objectContaining({
      chainId: 84532,
      rawEventId: 77,
      txHash: "0xtx",
      blockNumber: 10n,
      blockHash: "0xblock",
      isOrphaned: false,
    }));
    expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO raw_events"), expect.arrayContaining([
      84532,
      "0xtx",
      1,
      "10",
      "0xblock",
    ]));
    expect(mocks.db.query).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO indexer_checkpoints"), [84532, "10", "10", "0xblock"]);
  });

  it("backfills from the next missing block through the current head in 500-block steps", async () => {
    mocks.db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        cursor_block: "2",
        finalized_block: "1",
        cursor_block_hash: null,
      }],
    });
    const processRange = vi.spyOn(EventIndexer.prototype as any, "processRange").mockResolvedValue(undefined);
    const detectReorg = vi.spyOn(EventIndexer.prototype as any, "detectReorg").mockResolvedValue(false);
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.head") {
        return work({
          getBlockNumber: vi.fn().mockResolvedValue(1200),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    await indexer.backfill();

    expect(detectReorg).toHaveBeenCalled();
    expect(processRange.mock.calls).toEqual([
      [3n, 502n, 1200n],
      [503n, 1002n, 1200n],
      [1003n, 1200n, 1200n],
    ]);
  });
});
