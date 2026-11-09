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
const voiceHash = `0x${"22".repeat(32)}`;

const classification = {
  name: "midwestern",
  score: "9200",
  category: "accent",
  level: "regional",
  metadata: "fixture-model-v2",
};

const runtimeClassification = {
  ...classification,
  score: 9_200n,
};

const voiceMetadataWriteCases = [
  {
    key: "VoiceMetadataFacet.setAnalysisVersion",
    signature: "setAnalysisVersion(string)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-analysis-version",
    body: { version: "voice-analysis-v2" },
    runtimeArgs: ["voice-analysis-v2"],
    negativePath: "unauthorized analysis version update rejected",
  },
  {
    key: "VoiceMetadataFacet.updateClassificationCategory",
    signature: "updateClassificationCategory(bytes32,string,(string,uint256,string,string,string)[])",
    method: "PATCH",
    path: "/v1/voice-assets/commands/update-classification-category",
    body: {
      voiceHash,
      category: "accent",
      classifications: [classification],
    },
    runtimeArgs: [voiceHash, "accent", [runtimeClassification]],
    negativePath: "stale classification category update rejected",
  },
  {
    key: "VoiceMetadataFacet.updateGeographicData",
    signature: "updateGeographicData(bytes32,(int256,int256,string,string,string))",
    method: "PATCH",
    path: "/v1/voice-assets/commands/update-geographic-data",
    body: {
      voiceHash,
      geographic: {
        latitude: "415",
        longitude: "-876",
        region: "Midwest",
        country: "US",
        locality: "Chicago",
      },
    },
    runtimeArgs: [voiceHash, {
      latitude: 415n,
      longitude: -876n,
      region: "Midwest",
      country: "US",
      locality: "Chicago",
    }],
    negativePath: "replayed geographic metadata update rejected",
  },
  {
    key: "VoiceMetadataFacet.updateVoiceClassifications",
    signature: "updateVoiceClassifications(bytes32,(string,uint256,uint256,string[],string[]),(string,(string,uint256,string,string,string)[])[])",
    method: "PATCH",
    path: "/v1/voice-assets/commands/update-voice-classifications",
    body: {
      voiceHash,
      classifications: {
        analysisVersion: "voice-analysis-v2",
        timestamp: "1730743200",
        processingTimeMs: "42",
        componentsRun: ["acoustic", "accent"],
        categories: ["accent"],
      },
      categoryData: [{
        category: "accent",
        classifications: [classification],
      }],
    },
    runtimeArgs: [voiceHash, {
      analysisVersion: "voice-analysis-v2",
      timestamp: 1_730_743_200n,
      processingTimeMs: 42n,
      componentsRun: ["acoustic", "accent"],
      categories: ["accent"],
    }, [{
      category: "accent",
      classifications: [runtimeClassification],
    }]],
    negativePath: "stale voice classification update rejected",
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
    insert: vi.fn().mockResolvedValue("voice-metadata-safety-request-1"),
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
        label: "voice metadata safety operator",
        signerId: "voice-metadata-safety-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "voice metadata safety reader",
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
    throw new Error("voice metadata safety fixture server did not bind a TCP port");
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
  testCase: (typeof voiceMetadataWriteCases)[number],
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

describe("voice metadata command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "voice-metadata-safety-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvoice-metadata-safety" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(voiceMetadataWriteCases)(
    "preflights $key through its mounted route before mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");
        const payload = await response.json();

        expect(response.status, `${testCase.key}: ${JSON.stringify(payload)}`).toBe(202);
        expect(payload).toEqual({
          requestId: "voice-metadata-safety-request-1",
          txHash: "0xvoice-metadata-safety",
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

  it.each(voiceMetadataWriteCases)(
    "rejects read-only access to $key before preflight or mutation",
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

  it.each(voiceMetadataWriteCases)(
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
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
  );
});
