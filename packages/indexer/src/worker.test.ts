import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    query: vi.fn(),
    withTransaction: vi.fn(),
  };
  const transactionClient = {
    query: vi.fn(),
  };
  const providerRouter = {
    withProvider: vi.fn(),
  };
  return {
    db,
    transactionClient,
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
  isAmbiguousEvent: (event: Record<string, unknown>) => "candidateEventKeys" in event,
}));

vi.mock("./db.js", () => ({
  IndexerDatabase: mocks.IndexerDatabase,
}));

vi.mock("./projections/index.js", () => ({
  projectEvent: mocks.projectEvent,
}));

vi.mock("./projections/common.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./projections/common.js")>(),
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
    mocks.transactionClient.query.mockResolvedValue({ rows: [] });
    mocks.db.withTransaction.mockImplementation(async (work: (client: { query: typeof vi.fn }) => Promise<unknown>) => {
      return work(mocks.transactionClient as never);
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

  it("rewinds a block-one reorg checkpoint back to zero", async () => {
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
      cursorBlock: 1n,
      cursorBlockHash: "0xold",
    });

    expect(result).toBe(true);
    expect(mocks.db.query).toHaveBeenNthCalledWith(1, expect.stringContaining("UPDATE raw_events"), [84532, "1"]);
    expect(mocks.db.query).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO indexer_checkpoints"), [84532, "0", "0", null]);
  });

  it("does not mark orphaned data when the checkpoint cannot be verified as a reorg", async () => {
    mocks.db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.detectReorg") {
        return work({
          getBlock: vi.fn().mockResolvedValue({ hash: "0xsame" }),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();

    await expect((indexer as any).detectReorg({
      cursorBlock: 0n,
      cursorBlockHash: "0xold",
    })).resolves.toBe(false);
    await expect((indexer as any).detectReorg({
      cursorBlock: 9n,
      cursorBlockHash: null,
    })).resolves.toBe(false);
    await expect((indexer as any).detectReorg({
      cursorBlock: 9n,
      cursorBlockHash: "0xsame",
    })).resolves.toBe(false);

    expect(mocks.db.query).not.toHaveBeenCalled();
    expect(mocks.rebuildCurrentRows).not.toHaveBeenCalled();
  });

  it("does not mark orphaned data when the checkpoint block can no longer be read", async () => {
    mocks.db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.detectReorg") {
        return work({
          getBlock: vi.fn().mockResolvedValue(null),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();

    await expect((indexer as any).detectReorg({
      cursorBlock: 9n,
      cursorBlockHash: "0xold",
    })).resolves.toBe(false);

    expect(mocks.db.query).not.toHaveBeenCalled();
    expect(mocks.rebuildCurrentRows).not.toHaveBeenCalled();
  });

  it("processes logs, projects decoded events, and persists the block checkpoint", async () => {
    mocks.transactionClient.query.mockResolvedValueOnce({ rows: [{ id: 77 }], rowCount: 1 });
    mocks.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
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
    expect(mocks.transactionClient.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO raw_events"), expect.arrayContaining([
      84532,
      "0xtx",
      1,
      "10",
      "0xblock",
    ]));
    expect(mocks.db.query).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO indexer_checkpoints"), [84532, "10", "10", "0xblock"]);
  });

  it("persists undecoded logs without projecting them and clamps finalized block to zero", async () => {
    mocks.transactionClient.query.mockResolvedValueOnce({ rows: [{ id: 88 }], rowCount: 1 });
    mocks.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mocks.decodeEvent.mockReturnValue(null);
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.getLogs") {
        return work({
          getLogs: vi.fn().mockResolvedValue([{
            transactionHash: "0xunknown",
            index: 3,
            blockNumber: 4,
            blockHash: "0xblock-4",
            address: "0xdiamond",
            topics: ["0xtopic"],
          }]),
        });
      }
      if (label === "indexer.blockHash") {
        return work({
          getBlock: vi.fn().mockResolvedValue(null),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });
    process.env.API_LAYER_FINALITY_CONFIRMATIONS = "20";

    const indexer = new EventIndexer();
    await (indexer as any).processRange(4n, 4n, 10n);

    expect(mocks.projectEvent).not.toHaveBeenCalled();
    expect(mocks.transactionClient.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO raw_events"), expect.arrayContaining([
      84532,
      "0xunknown",
      3,
      "4",
      "0xblock-4",
      "0xdiamond",
      "Unknown",
      null,
      null,
      "{}",
      6,
    ]));
    expect(mocks.db.query).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO indexer_checkpoints"), [84532, "4", "0", null]);
  });

  it("persists ambiguous logs with candidate evidence and skips unsafe projection", async () => {
    mocks.transactionClient.query.mockResolvedValueOnce({ rows: [{ id: 89 }], rowCount: 1 });
    mocks.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mocks.decodeEvent.mockReturnValue({
      eventName: "Transfer",
      signature: "Transfer(address,address,uint256)",
      candidateEventKeys: ["TokenSupplyFacet.Transfer", "VoiceAssetFacet.Transfer"],
      candidateArgs: {
        "TokenSupplyFacet.Transfer": { from: "0x1", to: "0x2", value: 3n },
        "VoiceAssetFacet.Transfer": { from: "0x1", to: "0x2", tokenId: 3n },
      },
    });
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.getLogs") {
        return work({
          getLogs: vi.fn().mockResolvedValue([{
            transactionHash: "0xambiguous",
            index: 4,
            blockNumber: 5,
            blockHash: "0xblock-5",
            address: "0xdiamond",
            topics: ["0xtransfer"],
          }]),
        });
      }
      if (label === "indexer.blockHash") {
        return work({ getBlock: vi.fn().mockResolvedValue({ hash: "0xblock-5" }) });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    await (indexer as any).processRange(5n, 5n, 25n);

    expect(mocks.projectEvent).not.toHaveBeenCalled();
    expect(mocks.transactionClient.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO raw_events"),
      expect.arrayContaining([
        "Transfer",
        "Transfer(address,address,uint256)",
        null,
        expect.stringContaining("_candidateEventKeys"),
      ]),
    );
  });

  it("rolls back raw ingestion with the projection when a partial block fails", async () => {
    mocks.transactionClient.query.mockResolvedValueOnce({ rows: [{ id: 90 }], rowCount: 1 });
    mocks.decodeEvent.mockReturnValue({
      facetName: "MarketplaceFacet",
      eventName: "AssetListed",
      wrapperKey: "AssetListed",
      fullEventKey: "MarketplaceFacet.AssetListed",
      args: { listingId: 1n },
      signature: "AssetListed(uint256,address,uint256)",
    });
    mocks.projectEvent.mockRejectedValueOnce(new Error("projection failed"));
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.getLogs") {
        return work({
          getLogs: vi.fn().mockResolvedValue([{
            transactionHash: "0xpartial",
            index: 0,
            blockNumber: 6,
            blockHash: "0xblock-6",
            address: "0xdiamond",
            topics: ["0xlisted"],
          }]),
        });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    await expect((indexer as any).processRange(6n, 6n, 26n)).rejects.toThrow("projection failed");

    expect(mocks.db.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.transactionClient.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO raw_events"), expect.any(Array));
    expect(mocks.db.query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO indexer_checkpoints"), expect.any(Array));
  });

  it("replays duplicate logs through idempotent upserts before advancing the checkpoint", async () => {
    mocks.transactionClient.query.mockResolvedValue({ rows: [{ id: 91 }], rowCount: 1 });
    mocks.db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    mocks.decodeEvent.mockReturnValue({
      facetName: "MarketplaceFacet",
      eventName: "AssetListed",
      wrapperKey: "AssetListed",
      fullEventKey: "MarketplaceFacet.AssetListed",
      args: { listingId: 1n },
      signature: "AssetListed(uint256,address,uint256)",
    });
    const duplicateLog = {
      transactionHash: "0xduplicate",
      index: 0,
      blockNumber: 7,
      blockHash: "0xblock-7",
      address: "0xdiamond",
      topics: ["0xlisted"],
    };
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.getLogs") {
        return work({ getLogs: vi.fn().mockResolvedValue([duplicateLog]) });
      }
      if (label === "indexer.blockHash") {
        return work({ getBlock: vi.fn().mockResolvedValue({ hash: "0xblock-7" }) });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    await (indexer as any).processRange(7n, 7n, 27n);
    await (indexer as any).processRange(7n, 7n, 27n);

    const rawInserts = mocks.transactionClient.query.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO raw_events"));
    expect(rawInserts).toHaveLength(2);
    expect(rawInserts[0][0]).toContain("ON CONFLICT (chain_id, tx_hash, log_index)");
    expect(rawInserts[0][1]).toEqual(rawInserts[1][1]);
    expect(mocks.projectEvent).toHaveBeenCalledTimes(2);
  });

  it("does not persist logs or checkpoints while an RPC response is delayed", async () => {
    let releaseLogs: ((logs: unknown[]) => void) | undefined;
    const delayedLogs = new Promise<unknown[]>((resolve) => {
      releaseLogs = resolve;
    });
    mocks.providerRouter.withProvider.mockImplementation(async (_mode: string, label: string, work: (provider: unknown) => Promise<unknown>) => {
      if (label === "indexer.getLogs") {
        return work({ getLogs: vi.fn(() => delayedLogs) });
      }
      if (label === "indexer.blockHash") {
        return work({ getBlock: vi.fn().mockResolvedValue({ hash: "0xblock-8" }) });
      }
      throw new Error(`unexpected label ${label}`);
    });

    const indexer = new EventIndexer();
    const processing = (indexer as any).processRange(8n, 8n, 28n);
    await Promise.resolve();

    expect(mocks.db.withTransaction).not.toHaveBeenCalled();
    expect(mocks.db.query).not.toHaveBeenCalled();

    releaseLogs?.([]);
    await processing;
    expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO indexer_checkpoints"), [84532, "8", "8", "0xblock-8"]);
  });

  it("skips empty ranges before querying providers", async () => {
    const indexer = new EventIndexer();

    await expect((indexer as any).processRange(9n, 8n, 12n)).resolves.toBeUndefined();

    expect(mocks.providerRouter.withProvider).not.toHaveBeenCalled();
    expect(mocks.db.query).not.toHaveBeenCalled();
  });

  it("backfills from the next missing block through the current head in 500-block steps", async () => {
    mocks.db.query.mockReset().mockResolvedValueOnce({
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

  it("waits between realtime backfill iterations using the configured poll interval", async () => {
    process.env.API_LAYER_INDEXER_POLL_INTERVAL_MS = "1234";
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void) => {
      callback();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const backfill = vi.spyOn(EventIndexer.prototype, "backfill")
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("stop"));

    const indexer = new EventIndexer();

    await expect(indexer.runRealtime()).rejects.toThrow("stop");
    expect(backfill).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1234);

    setTimeoutSpy.mockRestore();
  });
});
