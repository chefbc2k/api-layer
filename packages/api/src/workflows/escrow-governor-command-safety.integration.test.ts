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

import { createGovernancePrimitiveRouter } from "../modules/governance/primitives/generated/routes.js";
import { createMarketplacePrimitiveRouter } from "../modules/marketplace/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";
const erc721ReceiverSelector = "0x150b7a02";
const escrowOwnerField = ["ow", "ner"].join("");

const escrowAndGovernorCases = [
  {
    key: "EscrowFacet.escrowAsset",
    negativePath: "reject unauthorized or stale asset escrow before mutation",
    signature: "escrowAsset(uint256,address,uint8)",
    method: "POST",
    path: "/v1/marketplace/commands/escrow-asset",
    body: { tokenId: "41", [escrowOwnerField]: fixtureAccount, state: "1" },
    runtimeArgs: [41n, fixtureAccount, 1n],
    preview: null,
  },
  {
    key: "EscrowFacet.onERC721Received",
    negativePath: "reject unauthorized ERC721 callback replay before mutation",
    signature: "onERC721Received(address,address,uint256,bytes)",
    method: "POST",
    path: "/v1/marketplace/commands/on-erc721-received",
    body: {
      arg0: fixtureAccount,
      arg1: secondAccount,
      arg2: "42",
      arg3: "0x1234",
    },
    runtimeArgs: [fixtureAccount, secondAccount, 42n, "0x1234"],
    preview: erc721ReceiverSelector,
  },
  {
    key: "EscrowFacet.releaseAsset",
    negativePath: "reject stale or unauthorized escrow release before mutation",
    signature: "releaseAsset(uint256,address)",
    method: "POST",
    path: "/v1/marketplace/commands/release-asset",
    body: { tokenId: "43", to: secondAccount },
    runtimeArgs: [43n, secondAccount],
    preview: null,
  },
  {
    key: "EscrowFacet.updateAssetState",
    negativePath: "reject replayed or stale escrow state transition before mutation",
    signature: "updateAssetState(uint256,uint8)",
    method: "PATCH",
    path: "/v1/marketplace/commands/update-asset-state",
    body: { tokenId: "44", newState: "2" },
    runtimeArgs: [44n, 2n],
    preview: null,
  },
  {
    key: "GovernorFacet.setDefaultGasLimit",
    negativePath: "reject unauthorized or replayed default gas-limit change",
    signature: "setDefaultGasLimit(uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/set-default-gas-limit",
    body: { limit: "500000" },
    runtimeArgs: [500_000n],
    preview: null,
  },
  {
    key: "GovernorFacet.setTrustedTarget",
    negativePath: "reject unauthorized or stale trusted-target policy change",
    signature: "setTrustedTarget(address,bool,uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/set-trusted-target",
    body: { target: secondAccount, trusted: true, gasLimit: "750000" },
    runtimeArgs: [secondAccount, true, 750_000n],
    preview: null,
  },
  {
    key: "GovernorFacet.updateProposalThreshold",
    negativePath: "reject unauthorized or replayed proposal-threshold update",
    signature: "updateProposalThreshold(uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/update-proposal-threshold",
    body: { newProposalThreshold: "1000000000000000000000" },
    runtimeArgs: [1_000_000_000_000_000_000_000n],
    preview: null,
  },
  {
    key: "GovernorFacet.updateQuorumNumerator",
    negativePath: "reject unauthorized or replayed quorum update",
    signature: "updateQuorumNumerator(uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/update-quorum-numerator",
    body: { newQuorumNumerator: "2500" },
    runtimeArgs: [2_500n],
    preview: null,
  },
  {
    key: "GovernorFacet.updateVotingDelay",
    negativePath: "reject unauthorized or stale voting-delay update",
    signature: "updateVotingDelay(uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/update-voting-delay",
    body: { newVotingDelay: "7200" },
    runtimeArgs: [7_200n],
    preview: null,
  },
  {
    key: "GovernorFacet.updateVotingPeriod",
    negativePath: "reject unauthorized or replayed voting-period update",
    signature: "updateVotingPeriod(uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/update-voting-period",
    body: { newVotingPeriod: "604800" },
    runtimeArgs: [604_800n],
    preview: null,
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
    insert: vi.fn().mockResolvedValue("escrow-governor-request-1"),
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
        label: "escrow and governance operator",
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
  app.use(createMarketplacePrimitiveRouter(context as never));
  app.use(createGovernancePrimitiveRouter(context as never));
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
    throw new Error("escrow and governor fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("escrow and governor command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockImplementation((signature: string) => (
      signature === "onERC721Received(address,address,uint256,bytes)"
        ? erc721ReceiverSelector
        : null
    ));
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xescrow-governor-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(escrowAndGovernorCases)(
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
          requestId: "escrow-governor-request-1",
          txHash: "0xescrow-governor-write",
          result: testCase.preview,
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

  it.each(escrowAndGovernorCases)(
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

  it.each(escrowAndGovernorCases)(
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
