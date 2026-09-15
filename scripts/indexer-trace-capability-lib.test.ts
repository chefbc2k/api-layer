import { describe, expect, it, vi } from "vitest";

import {
  BASE_SEPOLIA_PUBLIC_RPC_URL,
  findRecentSuccessfulTransaction,
  probeCallTracer,
  redactRpcEndpoint,
  selectTraceRpcUrl,
} from "./indexer-trace-capability-lib.js";

describe("indexer trace capability proof", () => {
  it("prefers an explicit endpoint and redacts credentials and paths", () => {
    const selection = selectTraceRpcUrl({
      API_LAYER_INDEXER_TRACE_RPC_URL: "https://user:secret@trace.example.com/v2/private-key",
      ALCHEMY_RPC_URL: "https://secondary.example.com/key",
    });

    expect(selection).toEqual({
      rpcUrl: "https://user:secret@trace.example.com/v2/private-key",
      source: "explicit",
    });
    expect(redactRpcEndpoint(selection.rpcUrl)).toBe("https://trace.example.com");
  });

  it("ignores loopback-only configuration and uses the Base Sepolia production fallback", () => {
    expect(selectTraceRpcUrl({
      RPC_URL: "http://127.0.0.1:8548",
      ALCHEMY_RPC_URL: "http://localhost:8548",
      CHAIN_ID: "84532",
    })).toEqual({
      rpcUrl: BASE_SEPOLIA_PUBLIC_RPC_URL,
      source: "base-sepolia-public-fallback",
    });
  });

  it("fails closed for another network without a non-loopback trace endpoint", () => {
    expect(() => selectTraceRpcUrl({ CHAIN_ID: "1", NETWORK: "mainnet" })).toThrow(
      "no non-loopback trace RPC is configured",
    );
  });

  it("selects a successful recent receipt and requests callTracer", async () => {
    const provider = {
      getBlockNumber: vi.fn().mockResolvedValue(101),
      getBlock: vi.fn()
        .mockResolvedValueOnce({ transactions: ["0xfailed"] })
        .mockResolvedValueOnce({ transactions: [{ hash: "0xsuccessful" }] }),
      getTransactionReceipt: vi.fn()
        .mockResolvedValueOnce({ status: 0 })
        .mockResolvedValueOnce({ status: 1 }),
      send: vi.fn().mockResolvedValue({ type: "CALL", calls: [] }),
    };

    await expect(findRecentSuccessfulTransaction(provider)).resolves.toEqual({
      txHash: "0xsuccessful",
      blockNumber: 100,
    });
    await expect(probeCallTracer(provider, "0xsuccessful")).resolves.toEqual({ traceKind: "object" });
    expect(provider.send).toHaveBeenCalledWith(
      "debug_traceTransaction",
      ["0xsuccessful", { tracer: "callTracer" }],
    );
  });

  it("rejects invalid trace results and an empty scan window", async () => {
    const emptyProvider = {
      getBlockNumber: vi.fn().mockResolvedValue(2),
      getBlock: vi.fn().mockResolvedValue({ transactions: [] }),
      getTransactionReceipt: vi.fn(),
      send: vi.fn().mockResolvedValue(null),
    };

    await expect(findRecentSuccessfulTransaction(emptyProvider, 2)).rejects.toThrow(
      "no successful transaction found",
    );
    await expect(probeCallTracer(emptyProvider, "0xmissing")).rejects.toThrow(
      "callTracer returned an invalid object result",
    );
  });
});
