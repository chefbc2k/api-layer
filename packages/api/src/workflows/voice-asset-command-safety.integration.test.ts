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

import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const voiceHash = `0x${"22".repeat(32)}`;
const usageReference = `0x${"33".repeat(32)}`;

const voiceAssetWriteCases = [
  {
    key: "VoiceAssetFacet.approveVoiceAsset",
    signature: "approveVoiceAsset(address,uint256)",
    method: "POST",
    path: "/v1/voice-assets/commands/approve-voice-asset",
    body: { to: fixtureAccount, tokenId: "7" },
    runtimeArgs: [fixtureAccount, 7n],
    negativePath: "unauthorized voice asset approval rejected",
  },
  {
    key: "VoiceAssetFacet.customizeRoyaltyRate",
    signature: "customizeRoyaltyRate(bytes32,uint256)",
    method: "PATCH",
    path: `/v1/voice-assets/${voiceHash}/royalty-rate`,
    body: { royaltyRate: "1200" },
    runtimeArgs: [voiceHash, 1_200n],
    negativePath: "stale royalty customization rejected",
  },
  {
    key: "VoiceAssetFacet.lockVoiceAsset",
    signature: "lockVoiceAsset(bytes32)",
    method: "POST",
    path: `/v1/voice-assets/${voiceHash}/lock`,
    body: {},
    runtimeArgs: [voiceHash],
    negativePath: "replayed voice asset lock rejected",
  },
  {
    key: "VoiceAssetFacet.recordRoyaltyPayment",
    signature: "recordRoyaltyPayment(bytes32,uint256,bytes32)",
    method: "POST",
    path: `/v1/voice-assets/${voiceHash}/royalty-payments`,
    body: { amount: "25", usageReference },
    runtimeArgs: [voiceHash, 25n, usageReference],
    negativePath: "stale royalty payment reference rejected",
  },
  {
    key: "VoiceAssetFacet.recordRoyaltyPaymentFrom",
    signature: "recordRoyaltyPaymentFrom(bytes32,uint256,bytes32,address)",
    method: "POST",
    path: "/v1/voice-assets/commands/record-royalty-payment-from",
    body: { voiceHash, amount: "25", usageReference, user: fixtureAccount },
    runtimeArgs: [voiceHash, 25n, usageReference, fixtureAccount],
    negativePath: "unauthorized delegated royalty payment rejected",
  },
  {
    key: "VoiceAssetFacet.recordUsage",
    signature: "recordUsage(bytes32,bytes32)",
    method: "POST",
    path: `/v1/voice-assets/${voiceHash}/usage-records`,
    body: { usageRef: usageReference },
    runtimeArgs: [voiceHash, usageReference],
    negativePath: "duplicate usage reference rejected",
  },
  {
    key: "VoiceAssetFacet.recordUsageFrom",
    signature: "recordUsageFrom(bytes32,bytes32,address)",
    method: "POST",
    path: "/v1/voice-assets/commands/record-usage-from",
    body: { voiceHash, usageRef: usageReference, caller: fixtureAccount },
    runtimeArgs: [voiceHash, usageReference, fixtureAccount],
    negativePath: "unauthorized delegated usage record rejected",
  },
  {
    key: "VoiceAssetFacet.revokeUser",
    signature: "revokeUser(bytes32,address)",
    method: "DELETE",
    path: `/v1/voice-assets/${voiceHash}/authorization-grants/${fixtureAccount}`,
    body: {},
    runtimeArgs: [voiceHash, fixtureAccount],
    negativePath: "stale user authorization revocation rejected",
  },
  {
    key: "VoiceAssetFacet.setDefaultPlatformFee",
    signature: "setDefaultPlatformFee(uint256)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-default-platform-fee",
    body: { fee: "250" },
    runtimeArgs: [250n],
    negativePath: "unauthorized platform fee update rejected",
  },
  {
    key: "VoiceAssetFacet.setDefaultRoyaltyRate",
    signature: "setDefaultRoyaltyRate(uint256)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-default-royalty-rate",
    body: { rate: "1000" },
    runtimeArgs: [1_000n],
    negativePath: "stale default royalty rate update rejected",
  },
  {
    key: "VoiceAssetFacet.setRegistrationPaused",
    signature: "setRegistrationPaused(bool)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-registration-paused",
    body: { paused: true },
    runtimeArgs: [true],
    negativePath: "replayed registration pause update rejected",
  },
  {
    key: "VoiceAssetFacet.unlockVoiceAsset",
    signature: "unlockVoiceAsset(bytes32)",
    method: "POST",
    path: `/v1/voice-assets/${voiceHash}/unlock`,
    body: {},
    runtimeArgs: [voiceHash],
    negativePath: "stale voice asset unlock rejected",
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
    insert: vi.fn().mockResolvedValue("voice-asset-safety-request-1"),
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
        label: "voice asset safety operator",
        signerId: "voice-asset-safety-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "voice asset safety reader",
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
    throw new Error("voice asset safety fixture server did not bind a TCP port");
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
  testCase: (typeof voiceAssetWriteCases)[number],
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

describe("voice asset command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "voice-asset-safety-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvoice-asset-safety" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(voiceAssetWriteCases)(
    "preflights $key through its mounted route before mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");

        expect(response.status, testCase.key).toBe(202);
        await expect(response.json()).resolves.toEqual({
          requestId: "voice-asset-safety-request-1",
          txHash: "0xvoice-asset-safety",
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

  it.each(voiceAssetWriteCases)(
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

  it.each(voiceAssetWriteCases)(
    "rejects stale, replayed, invalid, or unauthorized $key during preflight without mutation",
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
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
  );
});
