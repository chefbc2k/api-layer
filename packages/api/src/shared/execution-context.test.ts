import { describe, expect, it, vi } from "vitest";

import { enforceRateLimit, getTransactionStatus, resolveBufferedGasLimit, resolveRetryNonce } from "./execution-context.js";

describe("resolveBufferedGasLimit", () => {
  it("buffers a populated gasLimit without re-estimating", async () => {
    const provider = {
      estimateGas: vi.fn(),
    };

    const gasLimit = await resolveBufferedGasLimit(
      provider,
      {
        to: "0x0000000000000000000000000000000000000001",
        gasLimit: 100_000n,
      },
      "0x0000000000000000000000000000000000000002",
    );

    expect(gasLimit).toBe(170_000n);
    expect(provider.estimateGas).not.toHaveBeenCalled();
  });

  it("estimates gas when missing and includes the signer as from", async () => {
    const provider = {
      estimateGas: vi.fn().mockResolvedValue(200_000n),
    };

    const gasLimit = await resolveBufferedGasLimit(
      provider,
      {
        to: "0x0000000000000000000000000000000000000001",
        data: "0x1234",
      },
      "0x0000000000000000000000000000000000000002",
    );

    expect(provider.estimateGas).toHaveBeenCalledWith({
      to: "0x0000000000000000000000000000000000000001",
      data: "0x1234",
      from: "0x0000000000000000000000000000000000000002",
    });
    expect(gasLimit).toBe(290_000n);
  });
});

describe("resolveRetryNonce", () => {
  it("advances beyond both pending and local nonce tracking on the first retry", () => {
    expect(resolveRetryNonce(7, 7)).toBe(8);
    expect(resolveRetryNonce(7, 9)).toBe(10);
  });

  it("keeps advancing monotonically across repeated nonce-expired retries", () => {
    const firstRetryNonce = resolveRetryNonce(12, 12);
    const secondRetryNonce = resolveRetryNonce(12, firstRetryNonce, firstRetryNonce);
    const thirdRetryNonce = resolveRetryNonce(13, secondRetryNonce, secondRetryNonce);

    expect(firstRetryNonce).toBe(13);
    expect(secondRetryNonce).toBe(14);
    expect(thirdRetryNonce).toBe(15);
  });
});

describe("enforceRateLimit", () => {
  it("uses read, write, and gasless buckets for API-key and wallet throttles", async () => {
    const context = {
      rateLimiter: {
        enforce: vi.fn().mockResolvedValue(undefined),
      },
    };
    const auth = { apiKey: "read-key" };

    await enforceRateLimit(context as never, { rateLimitKind: "read" }, auth as never, { gaslessMode: "none", executionSource: "auto" });
    await enforceRateLimit(context as never, { rateLimitKind: "write" }, auth as never, { gaslessMode: "none", executionSource: "auto" }, "0xabc");
    await enforceRateLimit(context as never, { rateLimitKind: "write" }, auth as never, { gaslessMode: "signature", executionSource: "auto" }, "0xdef");

    expect(context.rateLimiter.enforce.mock.calls).toEqual([
      ["read", "read-key"],
      ["write", "read-key"],
      ["write", "read-key:0xabc"],
      ["gasless", "read-key"],
      ["gasless", "read-key:0xdef"],
    ]);
  });
});

describe("getTransactionStatus", () => {
  it("returns Alchemy-backed status when diagnostics are available", async () => {
    const context = {
      alchemy: {
        core: {
          getTransactionReceipt: vi.fn().mockResolvedValue(null),
        },
      },
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
      },
    };

    await expect(getTransactionStatus(context as never, "0xtx")).resolves.toEqual({
      source: "alchemy",
      receipt: null,
      diagnostics: {
        alchemy: {
          enabled: false,
          simulationEnabled: true,
          simulationEnforced: false,
          endpointDetected: true,
          rpcUrl: "https://alchemy.example",
          available: true,
        },
        decodedLogs: [],
        trace: { status: "disabled" },
      },
    });
  });

  it("falls back to the provider router when no Alchemy client exists", async () => {
    const context = {
      alchemy: null,
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_kind: string, _label: string, work: (provider: unknown) => Promise<unknown>) => {
          const provider = {
            getTransactionReceipt: vi.fn().mockResolvedValue(null),
          };
          return work(provider);
        }),
      },
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: false,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: false,
        alchemyRpcUrl: "https://alchemy.example",
      },
    };

    await expect(getTransactionStatus(context as never, "0xtx")).resolves.toEqual({
      source: "rpc",
      receipt: null,
      diagnostics: {
        alchemy: {
          enabled: false,
          simulationEnabled: false,
          simulationEnforced: false,
          endpointDetected: false,
          rpcUrl: "https://alchemy.example",
          available: false,
        },
        decodedLogs: [],
        trace: { status: "disabled" },
      },
    });
    expect(context.providerRouter.withProvider).toHaveBeenCalledWith("read", "tx.status", expect.any(Function));
  });
});
