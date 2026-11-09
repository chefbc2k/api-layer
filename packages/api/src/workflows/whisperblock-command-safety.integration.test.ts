import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contractStaticCall: vi.fn(),
  contractPopulateTransaction: vi.fn(),
  walletSendTransaction: vi.fn(),
  readActorStates: vi.fn(),
}));

vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");

  class MockWallet {
    readonly address = "0x00000000000000000000000000000000000000aa";

    constructor(
      readonly privateKey: string,
      readonly provider: unknown,
    ) {}

    async getAddress() {
      return this.address;
    }

    async sendTransaction(request: unknown) {
      return mocks.walletSendTransaction(request);
    }
  }

  class MockContract {
    constructor(
      readonly address: string,
      readonly abi: unknown,
      readonly runner: unknown,
    ) {}

    getFunction(signature: string) {
      return {
        staticCall: (...args: unknown[]) => mocks.contractStaticCall(signature, args),
        populateTransaction: (...args: unknown[]) => mocks.contractPopulateTransaction(signature, args),
      };
    }
  }

  return {
    ...actual,
    Contract: MockContract,
    Wallet: MockWallet,
  };
});

vi.mock("../shared/alchemy-diagnostics.js", async () => {
  const actual = await vi.importActual<typeof import("../shared/alchemy-diagnostics.js")>("../shared/alchemy-diagnostics.js");
  return {
    ...actual,
    readActorStates: mocks.readActorStates,
  };
});

import { createWhisperblockPrimitiveRouter } from "../modules/whisperblock/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const voiceHash = `0x${"22".repeat(32)}`;
const offchainSeed = `0x${"33".repeat(32)}`;
const blockHash = `0x${"44".repeat(32)}`;
const oracleSignature = "0x1234";

const whisperblockWriteCases = [
  {
    key: "WhisperBlockFacet.registerVoiceFingerprint",
    signature: "registerVoiceFingerprint(bytes32,bytes)",
    method: "POST",
    path: "/v1/whisperblock/whisperblocks",
    body: { voiceHash, structuredFingerprintData: oracleSignature },
    runtimeArgs: [voiceHash, oracleSignature],
    preflightRejection: "duplicate or stale voice fingerprint registration rejected",
  },
  {
    key: "WhisperBlockFacet.revokeAccess",
    signature: "revokeAccess(bytes32,address)",
    method: "DELETE",
    path: "/v1/whisperblock/commands/revoke-access",
    body: { voiceHash, user: fixtureAccount },
    runtimeArgs: [voiceHash, fixtureAccount],
    preflightRejection: "stale access grant rejects revocation",
  },
  {
    key: "WhisperBlockFacet.setAuditEnabled",
    signature: "setAuditEnabled(bool)",
    method: "PATCH",
    path: "/v1/whisperblock/commands/set-audit-enabled",
    body: { enabled: true },
    runtimeArgs: [true],
    preflightRejection: "replayed audit configuration rejected",
  },
  {
    key: "WhisperBlockFacet.setOffchainEntropy",
    signature: "setOffchainEntropy(bytes32,bytes32,address,bytes32,bytes)",
    method: "PATCH",
    path: "/v1/whisperblock/commands/set-offchain-entropy",
    body: {
      voiceHash,
      offchainSeed,
      walletAddress: fixtureAccount,
      blockHash,
      signature: oracleSignature,
    },
    runtimeArgs: [voiceHash, offchainSeed, fixtureAccount, blockHash, oracleSignature],
    preflightRejection: "stale oracle entropy signature rejected",
  },
  {
    key: "WhisperBlockFacet.setTrustedOracle",
    signature: "setTrustedOracle(address)",
    method: "PATCH",
    path: "/v1/whisperblock/commands/set-trusted-oracle",
    body: { oracle: fixtureAccount },
    runtimeArgs: [fixtureAccount],
    preflightRejection: "unauthorized trusted oracle update rejected",
  },
  {
    key: "WhisperBlockFacet.updateSystemParameters",
    signature: "updateSystemParameters(uint256,uint256,uint256)",
    method: "PATCH",
    path: "/v1/whisperblock/commands/update-system-parameters",
    body: {
      newMinKeyStrength: "256",
      newMinEntropy: "128",
      newDefaultAccessDuration: "3600",
    },
    runtimeArgs: [256n, 128n, 3_600n],
    preflightRejection: "stale system parameter update rejected",
  },
] as const;

function buildContext() {
  const provider = {
    getTransactionCount: vi.fn().mockResolvedValue(9),
    estimateGas: vi.fn().mockResolvedValue(100_000n),
  };
  const providerRouter = {
    withProvider: vi.fn(async (
      _kind: string,
      _method: string,
      work: (selectedProvider: typeof provider, providerName: string) => Promise<unknown>,
    ) => work(provider, "fixture-rpc")),
  };
  const txStore = {
    insert: vi.fn().mockResolvedValue("whisperblock-safety-request-1"),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const context = {
    config: {
      cbdpRpcUrl: "http://127.0.0.1:8545",
      alchemyRpcUrl: "http://127.0.0.1:8545",
      allowLiveAdminWrites: false,
      alchemyDiagnosticsEnabled: false,
      alchemySimulationEnabled: false,
      alchemySimulationEnforced: false,
      alchemySimulationBlock: "latest",
      alchemyEndpointDetected: false,
    },
    apiKeys: {
      "operator-key": {
        apiKey: "operator-key",
        label: "whisperblock safety operator",
        signerId: "whisperblock-safety-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "whisperblock safety reader",
        roles: ["read-only"],
        allowGasless: false,
      },
    },
    providerRouter,
    addressBook: {
      resolveFacetAddress: vi.fn().mockReturnValue(diamondAddress),
      toJSON: vi.fn().mockReturnValue({ diamond: diamondAddress }),
    },
    cache: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    },
    txStore,
    rateLimiter: {
      enforce: vi.fn().mockResolvedValue(undefined),
    },
    signerRunners: new Map(),
    signerQueues: new Map(),
    signerNonces: new Map(),
    alchemy: null,
  };
  return { context, providerRouter, txStore };
}

async function startServer(context: ReturnType<typeof buildContext>["context"]) {
  const app = express();
  app.set("apiExecutionContext", context);
  app.use(express.json());
  app.use(createWhisperblockPrimitiveRouter(context as never));
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once("listening", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("whisperblock safety fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function invokeCase(
  port: number,
  testCase: (typeof whisperblockWriteCases)[number],
  apiKey: "operator-key" | "read-only-key",
) {
  return fetch(`http://127.0.0.1:${port}${testCase.path}`, {
    method: testCase.method,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(testCase.body),
    signal: AbortSignal.timeout(2_500),
  });
}

describe("whisperblock command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "whisperblock-safety-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xwhisperblock-safety" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(whisperblockWriteCases)(
    "preflights $key through its mounted route before mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");

        expect(response.status, testCase.key).toBe(202);
        await expect(response.json()).resolves.toEqual({
          requestId: "whisperblock-safety-request-1",
          txHash: "0xwhisperblock-safety",
          result: null,
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
          status: "submitting",
        }));
        expect(mocks.walletSendTransaction).toHaveBeenCalledOnce();
        expect(mocks.contractStaticCall.mock.invocationCallOrder[0]).toBeLessThan(
          txStore.insert.mock.invocationCallOrder[0]!,
        );
        expect(txStore.insert.mock.invocationCallOrder[0]).toBeLessThan(
          mocks.walletSendTransaction.mock.invocationCallOrder[0]!,
        );
      } finally {
        await closeServer(server);
      }
    },
  );

  it.each(whisperblockWriteCases)(
    "rejects unauthorized $key before preflight or mutation",
    async (testCase) => {
      const { context, providerRouter, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "read-only-key");

        expect(response.status, testCase.key).toBe(403);
        await expect(response.json()).resolves.toEqual({
          error: "API key not permitted for write execution",
        });
        expect(providerRouter.withProvider).not.toHaveBeenCalled();
        expect(mocks.contractStaticCall).not.toHaveBeenCalled();
        expect(mocks.contractPopulateTransaction).not.toHaveBeenCalled();
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
  );

  it.each(whisperblockWriteCases)(
    "rejects stale, replayed, or unauthorized $key during preflight without mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.preflightRejection));
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");
        const payload = await response.json() as { error: string; diagnostics?: { cause?: string } };

        expect(response.status, testCase.key).toBe(500);
        expect(payload.error).toContain(testCase.preflightRejection);
        expect(payload.diagnostics?.cause).toContain(testCase.preflightRejection);
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
  );
});
