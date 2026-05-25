import { describe, expect, it, vi } from "vitest";
import { Interface } from "ethers";

const mocks = vi.hoisted(() => {
  const Alchemy = vi.fn().mockImplementation(function MockAlchemy(this: Record<string, unknown>, options: unknown) {
    this.options = options;
  });
  return {
    Alchemy,
    Network: {
      BASE_MAINNET: "base-mainnet",
      BASE_SEPOLIA: "base-sepolia",
    },
    DebugTracerType: {
      CALL_TRACER: "callTracer",
    },
    facetRegistry: {
      TestFacet: {
        abi: [
          "event TestEvent(address indexed owner, uint256 amount)",
          "event Structured(address indexed owner, uint256[] amounts, tuple(bool flag, uint256 count) meta)",
        ],
      },
    },
  };
});

vi.mock("alchemy-sdk", () => ({
  Alchemy: mocks.Alchemy,
  Network: mocks.Network,
  DebugTracerType: mocks.DebugTracerType,
}));

vi.mock("../../../client/src/index.js", () => ({
  facetRegistry: mocks.facetRegistry,
}));

import {
  alchemyNetworkForChainId,
  buildDebugTransaction,
  createAlchemyClient,
  decodeReceiptLogs,
  readActorStates,
  simulateTransactionWithAlchemy,
  traceCallWithAlchemy,
  traceTransactionWithAlchemy,
  verifyExpectedEventWithAlchemy,
} from "./alchemy-diagnostics.js";

describe("alchemy-diagnostics", () => {
  it("maps chain ids and instantiates the Alchemy client only when configured", () => {
    expect(alchemyNetworkForChainId(8453)).toBe("base-mainnet");
    expect(alchemyNetworkForChainId(84532)).toBe("base-sepolia");
    expect(createAlchemyClient({ alchemyApiKey: "" } as never)).toBeNull();

    const client = createAlchemyClient({
      alchemyApiKey: "test-key",
      chainId: 84532,
    } as never);

    expect(client).toBeTruthy();
    expect(mocks.Alchemy).toHaveBeenCalledWith({
      apiKey: "test-key",
      network: "base-sepolia",
    });
  });

  it("preserves pre-encoded transaction quantities and omits missing fields", () => {
    expect(buildDebugTransaction({
      gas: "0x5208",
      gasPrice: "0x09",
      value: "latest",
    }, "0x0000000000000000000000000000000000000003")).toEqual({
      from: "0x0000000000000000000000000000000000000003",
      to: undefined,
      data: undefined,
      value: "latest",
      gas: "0x5208",
      gasPrice: "0x09",
    });

    expect(buildDebugTransaction({
      value: "",
      gas: "",
      gasPrice: "",
    }, "0x0000000000000000000000000000000000000004")).toEqual({
      from: "0x0000000000000000000000000000000000000004",
      to: undefined,
      data: undefined,
      value: undefined,
      gas: undefined,
      gasPrice: undefined,
    });
  });

  it("coerces decimal quantities and indexed-match objects through JSON-safe normalization", async () => {
    expect(buildDebugTransaction({
      value: null,
      gas: "12",
      gasPrice: 9n,
    }, "0x0000000000000000000000000000000000000007")).toEqual({
      from: "0x0000000000000000000000000000000000000007",
      to: undefined,
      data: undefined,
      value: undefined,
      gas: "0x0c",
      gasPrice: "0x09",
    });

    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("Structured");
    const encoded = iface.encodeEventLog(fragment!, [
      "0x00000000000000000000000000000000000000aa",
      [3n, 5n],
      [true, 9n],
    ]);
    const alchemy = {
      core: {
        getLogs: vi.fn().mockResolvedValue([{
          address: "0x0000000000000000000000000000000000000001",
          data: encoded.data,
          topics: encoded.topics,
        }]),
      },
    };

    await expect(verifyExpectedEventWithAlchemy(alchemy as never, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "Structured",
      fromBlock: "10",
      toBlock: "11",
      indexedMatches: {
        owner: {
          expected: ["0x00000000000000000000000000000000000000AA"],
        },
      },
    })).resolves.toEqual(expect.objectContaining({
      status: "mismatch",
      expectedEvent: "TestFacet.Structured",
      mismatches: [
        "expected indexed argument owner=[object Object]",
      ],
    }));
  });

  it("builds debug transactions and decodes known and unknown receipt logs", () => {
    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 42n]);

    expect(buildDebugTransaction({
      to: "0x0000000000000000000000000000000000000001",
      data: "0x1234",
      value: 7n,
      gasLimit: 50_000n,
      maxFeePerGas: 3n,
    }, "0x0000000000000000000000000000000000000002")).toEqual({
      from: "0x0000000000000000000000000000000000000002",
      to: "0x0000000000000000000000000000000000000001",
      data: "0x1234",
      value: "0x07",
      gas: "0xc350",
      gasPrice: "0x03",
    });

    expect(decodeReceiptLogs({
      logs: [
        {
          address: "0x0000000000000000000000000000000000000001",
          data: encoded.data,
          topics: encoded.topics,
          logIndex: 0,
          transactionHash: "0xtx",
        },
        {
          address: "0x0000000000000000000000000000000000000002",
          data: "0x",
          topics: ["0xdeadbeef"],
          logIndex: null,
          transactionHash: null,
        },
      ],
    } as never)).toEqual([
      expect.objectContaining({
        eventName: "TestEvent",
        signature: "TestEvent(address,uint256)",
        facetName: "TestFacet",
        args: {},
      }),
      expect.objectContaining({
        eventName: null,
        signature: null,
        topic0: "0xdeadbeef",
      }),
    ]);

    expect(buildDebugTransaction({
      gas: 21_000,
      gasPrice: 9,
      value: 11,
    }, "0x0000000000000000000000000000000000000005")).toEqual({
      from: "0x0000000000000000000000000000000000000005",
      to: undefined,
      data: undefined,
      value: "0x0b",
      gas: "0x5208",
      gasPrice: "0x09",
    });

    expect(buildDebugTransaction({
      gas: "finalized",
      gasPrice: "earliest",
      value: "safe",
    }, "0x0000000000000000000000000000000000000006")).toEqual({
      from: "0x0000000000000000000000000000000000000006",
      to: undefined,
      data: undefined,
      value: "safe",
      gas: "finalized",
      gasPrice: "earliest",
    });
  });

  it("normalizes named log args and falls back cleanly when no decoder matches", () => {
    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("Structured");
    const encoded = iface.encodeEventLog(fragment!, [
      "0x00000000000000000000000000000000000000aa",
      [3n, 5n],
      [true, 9n],
    ]);

    expect(decodeReceiptLogs({
      logs: [
        {
          address: "0x0000000000000000000000000000000000000001",
          data: encoded.data,
          topics: encoded.topics,
          logIndex: 7,
          transactionHash: "0xstructured",
        },
        {
          address: "0x0000000000000000000000000000000000000002",
          data: "0x1234",
          topics: [],
        },
      ],
    } as never)).toEqual([
      expect.objectContaining({
        eventName: "Structured",
        facetName: "TestFacet",
        logIndex: 7,
        transactionHash: "0xstructured",
        args: {},
      }),
      expect.objectContaining({
        eventName: null,
        signature: null,
        facetName: null,
        topic0: null,
      }),
    ]);
  });

  it("normalizes named parse-log arguments while dropping numeric keys", () => {
    const parseLogSpy = vi.spyOn(Interface.prototype, "parseLog").mockReturnValue({
      name: "Structured",
      signature: "Structured(address,uint256[],(bool,uint256))",
      args: {
        0: "ignored",
        owner: "0x00000000000000000000000000000000000000aa",
        amounts: [3n, 5n],
        meta: {
          flag: true,
          count: 9n,
        },
      },
    } as never);

    expect(decodeReceiptLogs({
      logs: [{
        address: "0x0000000000000000000000000000000000000001",
        data: "0x1234",
        topics: ["0xtopic"],
        logIndex: 2,
        transactionHash: "0xnamed",
      }],
    } as never)).toEqual([
      expect.objectContaining({
        eventName: "Structured",
        signature: "Structured(address,uint256[],(bool,uint256))",
        facetName: "TestFacet",
        args: {
          owner: "0x00000000000000000000000000000000000000aa",
          amounts: ["3", "5"],
          meta: {
            flag: true,
            count: "9",
          },
        },
      }),
    ]);

    parseLogSpy.mockRestore();
  });

  it("simulates transactions, including pending-to-latest fallback behavior", async () => {
    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 5n]);
    const alchemy = {
      transact: {
        simulateExecution: vi.fn()
          .mockRejectedValueOnce(new Error("tracing on top of pending is not supported"))
          .mockResolvedValueOnce({
            calls: [{
              from: "0x1",
              to: "0x2",
              gasUsed: "100",
              type: "CALL",
              error: "reverted",
            }],
            logs: [{
              address: "0x0000000000000000000000000000000000000001",
              data: encoded.data,
              topics: encoded.topics,
            }],
          }),
      },
    };

    expect(await simulateTransactionWithAlchemy(null, { from: "0x1" } as never, "latest")).toEqual({
      status: "unavailable",
      error: "Alchemy diagnostics unavailable",
    });

    expect(await simulateTransactionWithAlchemy(alchemy as never, { from: "0x1" } as never, "pending")).toEqual(
      expect.objectContaining({
        status: "available",
        blockTag: "pending",
        fallbackBlockTag: "latest",
        callCount: 1,
        logCount: 1,
        topLevelCall: {
          from: "0x1",
          to: "0x2",
          gasUsed: "100",
          type: "CALL",
          revertReason: "reverted",
          error: "reverted",
        },
      }),
    );

    const failingAlchemy = {
      transact: {
        simulateExecution: vi.fn().mockRejectedValue(new Error("boom")),
      },
    };

    await expect(simulateTransactionWithAlchemy(failingAlchemy as never, { from: "0x1" } as never, "latest")).resolves.toEqual({
      status: "failed",
      blockTag: "latest",
      error: "boom",
    });
  });

  it("reports direct simulation success and fallback failure distinctly", async () => {
    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 1n]);
    const directAlchemy = {
      transact: {
        simulateExecution: vi.fn().mockResolvedValue({
          calls: [],
          logs: [{
            address: "0x0000000000000000000000000000000000000001",
            data: encoded.data,
            topics: encoded.topics,
          }],
        }),
      },
    };

    await expect(simulateTransactionWithAlchemy(directAlchemy as never, { from: "0x1" } as never, "latest")).resolves.toEqual({
      status: "available",
      blockTag: "latest",
      callCount: 0,
      logCount: 1,
      topLevelCall: undefined,
      decodedLogs: [
        expect.objectContaining({
          eventName: "TestEvent",
          facetName: "TestFacet",
        }),
      ],
    });

    const fallbackFailureAlchemy = {
      transact: {
        simulateExecution: vi.fn()
          .mockRejectedValueOnce(new Error("tracing on top of pending is not supported"))
          .mockRejectedValueOnce(new Error("fallback failed")),
      },
    };

    await expect(simulateTransactionWithAlchemy(fallbackFailureAlchemy as never, { from: "0x1" } as never, "pending")).resolves.toEqual({
      status: "failed",
      blockTag: "pending",
      fallbackBlockTag: "latest",
      error: "fallback failed",
    });
  });

  it("reports pending fallback success without a top-level call when Alchemy returns empty traces", async () => {
    const fallbackAlchemy = {
      transact: {
        simulateExecution: vi.fn()
          .mockRejectedValueOnce(new Error("tracing on top of pending is not supported"))
          .mockResolvedValueOnce({
            calls: [],
            logs: [],
          }),
      },
    };

    await expect(simulateTransactionWithAlchemy(fallbackAlchemy as never, { from: "0x1" } as never, "pending")).resolves.toEqual({
      status: "available",
      blockTag: "pending",
      fallbackBlockTag: "latest",
      callCount: 0,
      logCount: 0,
      topLevelCall: undefined,
      decodedLogs: [],
    });
  });

  it("normalizes fallback simulations that omit call addresses and trace errors", async () => {
    const fallbackAlchemy = {
      transact: {
        simulateExecution: vi.fn()
          .mockRejectedValueOnce(new Error("tracing on top of pending is not supported"))
          .mockResolvedValueOnce({
            calls: [{
              from: "0x1",
              to: "0x2",
              gasUsed: "21000",
              type: "CALL",
            }],
            logs: [],
          }),
      },
    };

    await expect(simulateTransactionWithAlchemy(fallbackAlchemy as never, { from: "0x1" } as never, "pending")).resolves.toEqual({
      status: "available",
      blockTag: "pending",
      fallbackBlockTag: "latest",
      callCount: 1,
      logCount: 0,
      topLevelCall: {
        from: "0x1",
        to: "0x2",
        gasUsed: "21000",
        type: "CALL",
        revertReason: undefined,
        error: undefined,
      },
      decodedLogs: [],
    });
  });

  it("classifies trace availability and hard failures distinctly", async () => {
    const unavailableAlchemy = {
      debug: {
        traceTransaction: vi.fn().mockRejectedValue(new Error("debug_traceTransaction is not available on the Free tier")),
        traceCall: vi.fn().mockRejectedValue(new Error("upgrade to Pay As You Go, or Enterprise for access")),
      },
    };
    const failingAlchemy = {
      debug: {
        traceTransaction: vi.fn().mockRejectedValue(new Error("rpc down")),
        traceCall: vi.fn().mockRejectedValue(new Error("rpc down")),
      },
    };

    await expect(traceTransactionWithAlchemy(unavailableAlchemy as never, "0xtx")).resolves.toEqual({
      status: "unavailable",
      txHash: "0xtx",
      error: "debug_traceTransaction is not available on the Free tier",
    });
    await expect(traceCallWithAlchemy(unavailableAlchemy as never, { from: "0x1" } as never, "latest")).resolves.toEqual({
      status: "unavailable",
      error: "upgrade to Pay As You Go, or Enterprise for access",
    });
    await expect(traceTransactionWithAlchemy(failingAlchemy as never, "0xtx")).resolves.toEqual({
      status: "failed",
      txHash: "0xtx",
      error: "rpc down",
    });
    await expect(traceCallWithAlchemy(failingAlchemy as never, { from: "0x1" } as never, "latest")).resolves.toEqual({
      status: "failed",
      error: "rpc down",
    });
  });

  it("returns available trace reports with flattened call trees and null-client unavailability", async () => {
    const nestedTrace = {
      from: "0x1",
      to: "0x2",
      gasUsed: "100",
      type: "CALL",
      calls: [
        {
          from: "0x2",
          to: "0x3",
          gasUsed: "50",
          type: "DELEGATECALL",
          error: "nested-error",
          calls: [
            {
              from: "0x3",
              to: "0x4",
              gasUsed: "25",
              type: "STATICCALL",
              revertReason: "nested-revert",
            },
          ],
        },
      ],
    };
    const alchemy = {
      debug: {
        traceTransaction: vi.fn().mockResolvedValue(nestedTrace),
        traceCall: vi.fn().mockResolvedValue(nestedTrace),
      },
    };

    await expect(traceTransactionWithAlchemy(null, "0xdead")).resolves.toEqual({
      status: "unavailable",
      txHash: "0xdead",
      error: "Alchemy diagnostics unavailable",
    });
    await expect(traceCallWithAlchemy(null, { from: "0x1" } as never, "pending")).resolves.toEqual({
      status: "unavailable",
      error: "Alchemy diagnostics unavailable",
    });

    await expect(traceTransactionWithAlchemy(alchemy as never, "0xtx", "9s")).resolves.toEqual({
      status: "available",
      txHash: "0xtx",
      topLevelCall: {
        from: "0x1",
        to: "0x2",
        gasUsed: "100",
        type: "CALL",
        revertReason: undefined,
        error: undefined,
      },
      callTree: [
        {
          depth: 0,
          from: "0x1",
          to: "0x2",
          gasUsed: "100",
          type: "CALL",
          revertReason: undefined,
          error: undefined,
        },
        {
          depth: 1,
          from: "0x2",
          to: "0x3",
          gasUsed: "50",
          type: "DELEGATECALL",
          revertReason: undefined,
          error: "nested-error",
        },
        {
          depth: 2,
          from: "0x3",
          to: "0x4",
          gasUsed: "25",
          type: "STATICCALL",
          revertReason: "nested-revert",
          error: undefined,
        },
      ],
    });
    expect(alchemy.debug.traceTransaction).toHaveBeenCalledWith(
      "0xtx",
      { type: "callTracer" },
      "9s",
    );

    await expect(traceCallWithAlchemy(alchemy as never, { from: "0x1" } as never, "pending")).resolves.toEqual({
      status: "available",
      topLevelCall: {
        from: "0x1",
        to: "0x2",
        gasUsed: "100",
        type: "CALL",
        revertReason: undefined,
        error: undefined,
      },
      callTree: [
        {
          depth: 0,
          from: "0x1",
          to: "0x2",
          gasUsed: "100",
          type: "CALL",
          revertReason: undefined,
          error: undefined,
        },
        {
          depth: 1,
          from: "0x2",
          to: "0x3",
          gasUsed: "50",
          type: "DELEGATECALL",
          revertReason: undefined,
          error: "nested-error",
        },
        {
          depth: 2,
          from: "0x3",
          to: "0x4",
          gasUsed: "25",
          type: "STATICCALL",
          revertReason: "nested-revert",
          error: undefined,
        },
      ],
    });
    expect(alchemy.debug.traceCall).toHaveBeenCalledWith(
      { from: "0x1" },
      "pending",
      { type: "callTracer" },
    );
  });

  it("handles empty trace payloads without inventing a call tree", async () => {
    const alchemy = {
      debug: {
        traceTransaction: vi.fn().mockResolvedValue(undefined),
        traceCall: vi.fn().mockResolvedValue(undefined),
      },
    };

    await expect(traceTransactionWithAlchemy(alchemy as never, "0xtx")).resolves.toEqual({
      status: "available",
      txHash: "0xtx",
      topLevelCall: undefined,
      callTree: [],
    });
    await expect(traceCallWithAlchemy(alchemy as never, { from: "0x1" } as never, "latest")).resolves.toEqual({
      status: "available",
      topLevelCall: undefined,
      callTree: [],
    });
  });

  it("preserves undefined nested traces when flattening call trees", async () => {
    const sparseTrace = {
      from: "0x1",
      to: "0x2",
      gasUsed: "100",
      type: "CALL",
      calls: [undefined],
    };
    const alchemy = {
      debug: {
        traceTransaction: vi.fn().mockResolvedValue(sparseTrace),
      },
    };

    await expect(traceTransactionWithAlchemy(alchemy as never, "0xtx")).resolves.toEqual({
      status: "available",
      txHash: "0xtx",
      topLevelCall: {
        from: "0x1",
        to: "0x2",
        gasUsed: "100",
        type: "CALL",
        revertReason: undefined,
        error: undefined,
      },
      callTree: [
        {
          depth: 0,
          from: "0x1",
          to: "0x2",
          gasUsed: "100",
          type: "CALL",
          revertReason: undefined,
          error: undefined,
        },
      ],
    });
  });

  it("verifies expected indexed events and reads actor state snapshots", async () => {
    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 7n]);
    const parseLogSpy = vi.spyOn(Interface.prototype, "parseLog").mockReturnValue({
      name: "TestEvent",
      signature: "TestEvent(address,uint256)",
      args: {
        owner: "0x00000000000000000000000000000000000000AA",
        amount: 7n,
      },
    } as never);
    const alchemy = {
      core: {
        getLogs: vi.fn().mockResolvedValue([
          {
            address: "0x0000000000000000000000000000000000000001",
            data: encoded.data,
            topics: encoded.topics,
          },
        ]),
      },
    };

    await expect(verifyExpectedEventWithAlchemy(alchemy as never, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "TestEvent",
      fromBlock: 10,
      indexedMatches: {
        owner: "0x00000000000000000000000000000000000000AA",
      },
    })).resolves.toEqual(expect.objectContaining({
      status: "available",
      expectedEvent: "TestFacet.TestEvent",
      matchedCount: 1,
    }));
    parseLogSpy.mockRestore();

    await expect(verifyExpectedEventWithAlchemy(alchemy as never, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "TestEvent",
      fromBlock: 10,
      indexedMatches: { owner: "0x00000000000000000000000000000000000000BB" },
    })).resolves.toEqual(expect.objectContaining({
      status: "mismatch",
      mismatches: ["expected indexed argument owner=0x00000000000000000000000000000000000000BB"],
    }));

    await expect(verifyExpectedEventWithAlchemy({
      core: {
        getLogs: vi.fn().mockResolvedValue([]),
      },
    } as never, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "TestEvent",
      fromBlock: 10,
    })).resolves.toEqual({
      status: "missing",
      expectedEvent: "TestFacet.TestEvent",
      matchedCount: 0,
      decodedLogs: [],
    });

    const provider = {
      getTransactionCount: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3),
      getBalance: vi.fn().mockResolvedValueOnce(10n).mockResolvedValueOnce(20n),
    };
    await expect(readActorStates(provider as never, ["0x1", "0x2"])).resolves.toEqual([
      { address: "0x1", nonce: "2", balance: "10" },
      { address: "0x2", nonce: "3", balance: "20" },
    ]);
  });

  it("surfaces event verification unavailability and lookup failures", async () => {
    await expect(verifyExpectedEventWithAlchemy(null, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "TestEvent",
      fromBlock: "pending",
      toBlock: "latest",
    })).resolves.toEqual({
      status: "unavailable",
      expectedEvent: "TestFacet.TestEvent",
      error: "Alchemy diagnostics unavailable",
    });

    await expect(verifyExpectedEventWithAlchemy({
      core: {
        getLogs: vi.fn().mockRejectedValue(new Error("log lookup failed")),
      },
    } as never, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "TestEvent",
      fromBlock: "pending",
      toBlock: "latest",
    })).resolves.toEqual({
      status: "failed",
      expectedEvent: "TestFacet.TestEvent",
      error: "log lookup failed",
    });
  });

  it("normalizes object-like indexed values when verifying events", async () => {
    const iface = new Interface(mocks.facetRegistry.TestFacet.abi);
    const fragment = iface.getEvent("TestEvent");
    const encoded = iface.encodeEventLog(fragment!, ["0x00000000000000000000000000000000000000aa", 7n]);

    await expect(verifyExpectedEventWithAlchemy({
      core: {
        getLogs: vi.fn().mockResolvedValue([
          {
            address: "0x0000000000000000000000000000000000000001",
            data: encoded.data,
            topics: encoded.topics,
          },
        ]),
      },
    } as never, {
      address: "0x0000000000000000000000000000000000000001",
      facetName: "TestFacet",
      eventName: "TestEvent",
      fromBlock: "earliest",
      toBlock: "safe",
      indexedMatches: {
        owner: {
          nested: 1n,
        },
      },
    })).resolves.toEqual(expect.objectContaining({
      status: "mismatch",
      mismatches: ["expected indexed argument owner=[object Object]"],
    }));
  });
});
