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
const signerAddress = "0x00000000000000000000000000000000000000aa";
const recipientAddress = "0x00000000000000000000000000000000000000bb";
const authorizedUser = "0x00000000000000000000000000000000000000cc";
const voiceHash = `0x${"44".repeat(32)}`;

// These exact facet-qualified keys and mounted routes intentionally keep the
// static gap reporter scoped to the four executable safety fixtures below.
const cases = [
  {
    key: "VoiceAssetFacet.authorizeUser",
    signature: "authorizeUser(bytes32,address)",
    path: `/v1/voice-assets/${voiceHash}/authorization-grants`,
    body: { user: authorizedUser },
    wireParams: [voiceHash, authorizedUser],
    runtimeArgs: [voiceHash, authorizedUser],
    preflightRejection: "stale authorization grant or replay rejected",
  },
  {
    key: "VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)",
    signature: "safeTransferFrom(address,address,uint256,bytes)",
    path: "/v1/voice-assets/tokens/41/transfers/safe-with-data",
    body: { from: signerAddress, to: recipientAddress, data: "0x1234" },
    wireParams: [signerAddress, recipientAddress, "41", "0x1234"],
    runtimeArgs: [signerAddress, recipientAddress, 41n, "0x1234"],
    preflightRejection: "stale safe transfer with data or replay rejected",
  },
  {
    key: "VoiceAssetFacet.safeTransferFrom(address,address,uint256)",
    signature: "safeTransferFrom(address,address,uint256)",
    path: "/v1/voice-assets/tokens/42/transfers/safe",
    body: { from: signerAddress, to: recipientAddress },
    wireParams: [signerAddress, recipientAddress, "42"],
    runtimeArgs: [signerAddress, recipientAddress, 42n],
    preflightRejection: "stale safe transfer or replay rejected",
  },
  {
    key: "VoiceAssetFacet.transferFromVoiceAsset",
    signature: "transferFromVoiceAsset(address,address,uint256)",
    path: "/v1/voice-assets/tokens/43/transfers",
    body: { from: signerAddress, to: recipientAddress },
    wireParams: [signerAddress, recipientAddress, "43"],
    runtimeArgs: [signerAddress, recipientAddress, 43n],
    preflightRejection: "stale voice asset transfer or replay rejected",
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
    insert: vi.fn().mockResolvedValue("voice-asset-command-1"),
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
        label: "voice asset operator",
        signerId: "fixture-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "voice asset reader",
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
  return { context, txStore };
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
    server.once("listening", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("voice asset command fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function call(
  port: number,
  testCase: (typeof cases)[number],
  apiKey: "operator-key" | "read-only-key",
) {
  return fetch(`http://127.0.0.1:${port}${testCase.path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(testCase.body),
    signal: AbortSignal.timeout(2_500),
  });
}

describe("VoiceAssetFacet authorization and transfer command route safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvoice-asset-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(cases)(
    "decodes and preflights $key through its exact mounted route before persistence and mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await call(port, testCase, "operator-key");
        const payload = await response.json();

        expect(response.status, `${testCase.key}: ${JSON.stringify(payload)}`).toBe(202);
        expect(payload).toEqual({
          requestId: "voice-asset-command-1",
          txHash: "0xvoice-asset-write",
          result: null,
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
          params: testCase.wireParams,
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
    15_000,
  );

  it.each(cases)("rejects read-only access to $key before ABI preflight or mutation", async (testCase) => {
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);

    try {
      const response = await call(port, testCase, "read-only-key");

      expect(response.status, testCase.key).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "API key not permitted for write execution",
      });
      expect(mocks.contractStaticCall).not.toHaveBeenCalled();
      expect(mocks.contractPopulateTransaction).not.toHaveBeenCalled();
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)(
    "rejects stale or replayed $key during ABI preflight without persistence or mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.preflightRejection));
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await call(port, testCase, "operator-key");
        const payload = await response.json() as {
          error: string;
          diagnostics?: {
            cause?: string;
            route?: { contractFunction?: string };
          };
        };

        expect(response.status, `${testCase.key}: ${JSON.stringify(payload)}`).toBe(500);
        expect(payload.error).toContain(testCase.preflightRejection);
        expect(payload.diagnostics?.cause).toContain(testCase.preflightRejection);
        expect(payload.diagnostics?.route?.contractFunction).toBe(`VoiceAssetFacet.${testCase.signature}`);
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
    15_000,
  );
});
