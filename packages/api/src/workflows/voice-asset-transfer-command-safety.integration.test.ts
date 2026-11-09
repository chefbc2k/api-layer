import express from "express";
import { Interface } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../client/src/generated/index.js";

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
    readonly contractInterface: InstanceType<typeof actual.Interface>;

    constructor(
      readonly address: string,
      abi: unknown,
      readonly runner: unknown,
    ) {
      this.contractInterface = new actual.Interface(abi as never);
    }

    getFunction(signature: string) {
      return {
        staticCall: (...args: unknown[]) => mocks.contractStaticCall(signature, args),
        populateTransaction: async (...args: unknown[]) => {
          await mocks.contractPopulateTransaction(signature, args);
          return {
            to: this.address,
            data: this.contractInterface.encodeFunctionData(signature, args),
          };
        },
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

import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const currentOwner = "0x00000000000000000000000000000000000000bb";
const nextOwner = "0x00000000000000000000000000000000000000cc";
const voiceHash = `0x${"22".repeat(32)}`;
const transferData = "0x1234";
const tokenId = 7n;

const voiceAssetTransferCases = [
  {
    key: "VoiceAssetFacet.authorizeUser",
    signature: "authorizeUser(bytes32,address)",
    method: "POST",
    path: `/v1/voice-assets/${voiceHash}/authorization-grants`,
    body: { user: nextOwner },
    runtimeArgs: [voiceHash, nextOwner],
    negativePath: "unauthorized voice asset user grant rejected before mutation",
  },
  {
    key: "VoiceAssetFacet.safeTransferFrom(address,address,uint256)",
    signature: "safeTransferFrom(address,address,uint256)",
    method: "POST",
    path: `/v1/voice-assets/tokens/${tokenId}/transfers/safe`,
    body: { from: currentOwner, to: nextOwner },
    runtimeArgs: [currentOwner, nextOwner, tokenId],
    negativePath: "stale safe transfer ownership rejected before mutation",
  },
  {
    key: "VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)",
    signature: "safeTransferFrom(address,address,uint256,bytes)",
    method: "POST",
    path: `/v1/voice-assets/tokens/${tokenId}/transfers/safe-with-data`,
    body: { from: currentOwner, to: nextOwner, data: transferData },
    runtimeArgs: [currentOwner, nextOwner, tokenId, transferData],
    negativePath: "replayed safe transfer with data rejected before mutation",
  },
  {
    key: "VoiceAssetFacet.transferFromVoiceAsset",
    signature: "transferFromVoiceAsset(address,address,uint256)",
    method: "POST",
    path: `/v1/voice-assets/tokens/${tokenId}/transfers`,
    body: { from: currentOwner, to: nextOwner },
    runtimeArgs: [currentOwner, nextOwner, tokenId],
    negativePath: "unauthorized voice asset transfer rejected before mutation",
  },
] as const;

const voiceAssetInterface = new Interface(facetRegistry.VoiceAssetFacet.abi);

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
    insert: vi.fn().mockResolvedValue("voice-asset-transfer-request-1"),
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
        label: "voice asset transfer safety operator",
        signerId: "voice-asset-transfer-safety-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "voice asset transfer safety reader",
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
  app.use(createVoiceAssetsPrimitiveRouter(context as never));
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
    throw new Error("voice asset transfer safety fixture server did not bind a TCP port");
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
  testCase: (typeof voiceAssetTransferCases)[number],
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

describe("voice asset authorization and transfer route safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "voice-asset-transfer-safety-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue(undefined);
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvoice-asset-transfer-safety" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(voiceAssetTransferCases)(
    "preflights and ABI-encodes $key through its mounted route before mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");

        expect(response.status, testCase.key).toBe(202);
        await expect(response.json()).resolves.toEqual({
          requestId: "voice-asset-transfer-request-1",
          txHash: "0xvoice-asset-transfer-safety",
          result: null,
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
          status: "submitting",
        }));
        expect(mocks.walletSendTransaction).toHaveBeenCalledOnce();

        const transaction = mocks.walletSendTransaction.mock.calls[0]?.[0] as { data?: string };
        expect(transaction.data, testCase.key).toEqual(expect.stringMatching(/^0x[0-9a-f]+$/u));
        expect(
          Array.from(voiceAssetInterface.decodeFunctionData(testCase.signature, transaction.data!)),
          testCase.key,
        ).toEqual(testCase.runtimeArgs);

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

  it.each(voiceAssetTransferCases)(
    "rejects read-only access to $key before provider execution or mutation",
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

  it.each(voiceAssetTransferCases)(
    "rejects stale, replayed, or unauthorized $key during preflight without mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.negativePath));
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");
        const payload = await response.json() as { error: string; diagnostics?: { cause?: string } };

        expect(response.status, testCase.key).toBe(500);
        expect(payload.error).toContain(testCase.negativePath);
        expect(payload.diagnostics?.cause).toContain(testCase.negativePath);
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
