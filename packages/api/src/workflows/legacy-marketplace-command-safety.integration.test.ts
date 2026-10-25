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

import { createMarketplacePrimitiveRouter } from "../modules/marketplace/primitives/generated/routes.js";
import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";
const voiceHash = `0x${"11".repeat(32)}`;
const secondVoiceHash = `0x${"22".repeat(32)}`;

const legacyAndMarketplaceCases = [
  {
    key: "LegacyExecutionFacet.approveInheritance",
    negativePath: "reject unauthorized or replayed inheritance approval",
    signature: "approveInheritance(bytes32)",
    method: "POST",
    path: "/v1/voice-assets/commands/approve-inheritance",
    body: { voiceHash },
    runtimeArgs: [voiceHash],
  },
  {
    key: "LegacyExecutionFacet.delegateRights",
    negativePath: "reject stale or unauthorized rights delegation",
    signature: "delegateRights(address,uint256)",
    method: "POST",
    path: "/v1/voice-assets/commands/delegate-rights",
    body: { delegatee: fixtureAccount, duration: "86400" },
    runtimeArgs: [fixtureAccount, 86_400n],
  },
  {
    key: "LegacyExecutionFacet.executeInheritance",
    negativePath: "reject stale or unauthorized inheritance execution",
    signature: "executeInheritance(address)",
    method: "POST",
    path: "/v1/voice-assets/commands/execute-inheritance",
    body: { owner: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
  {
    key: "LegacyExecutionFacet.initiateInheritance",
    negativePath: "reject replayed or unauthorized inheritance initiation",
    signature: "initiateInheritance(bytes32,string[])",
    method: "POST",
    path: "/v1/voice-assets/legacy/initiate-inheritance",
    body: { voiceHash, proofDocuments: ["ipfs://inheritance-proof"] },
    runtimeArgs: [voiceHash, ["ipfs://inheritance-proof"]],
  },
  {
    key: "LegacyFacet.addBeneficiary",
    negativePath: "reject duplicate or unauthorized beneficiary addition",
    signature: "addBeneficiary(address,uint256,bool)",
    method: "POST",
    path: "/v1/voice-assets/commands/add-beneficiary",
    body: { account: fixtureAccount, share: "2500", canDelegate: true },
    runtimeArgs: [fixtureAccount, 2_500n, true],
  },
  {
    key: "LegacyFacet.addDatasets",
    negativePath: "reject stale or unauthorized dataset attachment",
    signature: "addDatasets(uint256[])",
    method: "POST",
    path: "/v1/voice-assets/commands/add-datasets",
    body: { datasetIds: ["7", "8"] },
    runtimeArgs: [[7n, 8n]],
  },
  {
    key: "LegacyFacet.addInheritanceRequirement",
    negativePath: "reject duplicate or unauthorized inheritance requirement",
    signature: "addInheritanceRequirement(string)",
    method: "POST",
    path: "/v1/voice-assets/commands/add-inheritance-requirement",
    body: { doc: "signed-death-certificate" },
    runtimeArgs: ["signed-death-certificate"],
  },
  {
    key: "LegacyFacet.addVoiceAssets",
    negativePath: "reject stale or unauthorized voice-asset attachment",
    signature: "addVoiceAssets(bytes32[])",
    method: "POST",
    path: "/v1/voice-assets/commands/add-voice-assets",
    body: { voiceAssets: [voiceHash, secondVoiceHash] },
    runtimeArgs: [[voiceHash, secondVoiceHash]],
  },
  {
    key: "LegacyFacet.createLegacyPlan",
    negativePath: "reject replayed or unauthorized legacy-plan creation",
    signature: "createLegacyPlan(string)",
    method: "POST",
    path: "/v1/voice-assets/legacy/create-legacy-plan",
    body: { memo: "fixture legacy plan" },
    runtimeArgs: ["fixture legacy plan"],
  },
  {
    key: "LegacyFacet.setBeneficiaryRelationship",
    negativePath: "reject stale beneficiary or unauthorized relationship change",
    signature: "setBeneficiaryRelationship(address,string)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-beneficiary-relationship",
    body: { account: fixtureAccount, relationship: "heir" },
    runtimeArgs: [fixtureAccount, "heir"],
  },
  {
    key: "LegacyFacet.setInheritanceConditions",
    negativePath: "reject stale or unauthorized inheritance conditions",
    signature: "setInheritanceConditions(uint256,bool,address[],uint256)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-inheritance-conditions",
    body: {
      timelock: "86400",
      requiresProof: true,
      approvers: [fixtureAccount, secondAccount],
      minApprovals: "2",
    },
    runtimeArgs: [86_400n, true, [fixtureAccount, secondAccount], 2n],
  },
  {
    key: "MarketplaceFacet.cancelListing",
    negativePath: "reject stale listing or unauthorized cancellation",
    signature: "cancelListing(uint256)",
    method: "DELETE",
    path: "/v1/marketplace/commands/cancel-listing",
    body: { tokenId: "41" },
    runtimeArgs: [41n],
  },
  {
    key: "MarketplaceFacet.listAsset",
    negativePath: "reject stale ownership or unauthorized asset listing",
    signature: "listAsset(uint256,uint256,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/list-asset",
    body: { tokenId: "42", price: "1000000", duration: "86400" },
    runtimeArgs: [42n, 1_000_000n, 86_400n],
  },
  {
    key: "MarketplaceFacet.pause",
    negativePath: "reject replayed or unauthorized marketplace pause",
    signature: "pause()",
    method: "POST",
    path: "/v1/marketplace/commands/pause",
    body: {},
    runtimeArgs: [],
  },
  {
    key: "MarketplaceFacet.purchaseAsset",
    negativePath: "reject stale listing or unauthorized asset purchase",
    signature: "purchaseAsset(uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/purchase-asset",
    body: { tokenId: "43" },
    runtimeArgs: [43n],
  },
  {
    key: "MarketplaceFacet.unpause",
    negativePath: "reject replayed or unauthorized marketplace unpause",
    signature: "unpause()",
    method: "POST",
    path: "/v1/marketplace/commands/unpause",
    body: {},
    runtimeArgs: [],
  },
  {
    key: "MarketplaceFacet.updateListingPrice",
    negativePath: "reject stale listing or unauthorized price update",
    signature: "updateListingPrice(uint256,uint256)",
    method: "PATCH",
    path: "/v1/marketplace/commands/update-listing-price",
    body: { tokenId: "44", newPrice: "2000000" },
    runtimeArgs: [44n, 2_000_000n],
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
    insert: vi.fn().mockResolvedValue("legacy-marketplace-request-1"),
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
        label: "legacy and marketplace operator",
        signerId: "fixture-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "fixture reader",
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
  app.use(createMarketplacePrimitiveRouter(context as never));
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
    throw new Error("legacy and marketplace fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("legacy and marketplace command route preflight safety", () => {
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
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xlegacy-marketplace-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(legacyAndMarketplaceCases)(
    "preflights $key through its mounted route before mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await fetch(`http://127.0.0.1:${port}${testCase.path}`, {
          method: testCase.method,
          headers: {
            "content-type": "application/json",
            "x-api-key": "operator-key",
          },
          body: JSON.stringify(testCase.body),
          signal: AbortSignal.timeout(2_500),
        });

        expect(response.status, testCase.key).toBe(202);
        await expect(response.json()).resolves.toEqual({
          requestId: "legacy-marketplace-request-1",
          txHash: "0xlegacy-marketplace-write",
          result: null,
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
          params: Object.values(testCase.body),
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

  it.each(legacyAndMarketplaceCases)(
    "rejects unauthorized $key before contract preflight or mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await fetch(`http://127.0.0.1:${port}${testCase.path}`, {
          method: testCase.method,
          headers: {
            "content-type": "application/json",
            "x-api-key": "read-only-key",
          },
          body: JSON.stringify(testCase.body),
          signal: AbortSignal.timeout(2_500),
        });

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
    },
  );

  it.each(legacyAndMarketplaceCases)(
    "rejects stale, replayed, or unauthorized $key during preflight without mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.negativePath));
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await fetch(`http://127.0.0.1:${port}${testCase.path}`, {
          method: testCase.method,
          headers: {
            "content-type": "application/json",
            "x-api-key": "operator-key",
          },
          body: JSON.stringify(testCase.body),
          signal: AbortSignal.timeout(2_500),
        });
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
