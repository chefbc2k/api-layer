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

import { createDiamondAdminPrimitiveRouter } from "../modules/diamond-admin/primitives/generated/routes.js";
import { createStakingPrimitiveRouter } from "../modules/staking/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";
const thirdAccount = "0x00000000000000000000000000000000000000dd";
const voiceHash = `0x${"44".repeat(32)}`;
const signatureR = `0x${"22".repeat(32)}`;
const signatureS = `0x${"33".repeat(32)}`;

const scoreUpdate = {
  voiceHash,
  qualityData: {
    completenessPercentage: "9500",
    sampleRate: "48000",
    speechDuration: "120",
    hnr: "2400",
    jitterLocal: "12",
    shimmerLocal: "18",
  },
  engagementData: {
    viewCount: "1000",
    likeCount: "400",
    playCount: "800",
    ratingAverage: "4700",
    ratingCount: "250",
    assetAge: "86400",
  },
  governanceData: {
    proposalsCreated: "2",
    proposalsActiveOrSuccess: "1",
    votesCast: "7",
  },
  contributionData: {
    datasetCount: "3",
    totalAssetCount: "40",
    totalDuration: "7200",
    hasCommercialDataset: true,
    hasHighQualityDataset: true,
  },
  marketplaceData: {
    datasetSalesCount: "4",
    datasetSalesVolume: "5000",
    assetSalesCount: "12",
    assetSalesVolume: "9000",
    royaltiesRealized: "700",
    royaltyPaymentsCount: "6",
  },
  nonce: "9",
  timestamp: "1900000000",
  signature: "0x1234",
} as const;

const runtimeScoreUpdate = {
  voiceHash,
  qualityData: {
    completenessPercentage: 9_500n,
    sampleRate: 48_000n,
    speechDuration: 120n,
    hnr: 2_400n,
    jitterLocal: 12n,
    shimmerLocal: 18n,
  },
  engagementData: {
    viewCount: 1_000n,
    likeCount: 400n,
    playCount: 800n,
    ratingAverage: 4_700n,
    ratingCount: 250n,
    assetAge: 86_400n,
  },
  governanceData: {
    proposalsCreated: 2n,
    proposalsActiveOrSuccess: 1n,
    votesCast: 7n,
  },
  contributionData: {
    datasetCount: 3n,
    totalAssetCount: 40n,
    totalDuration: 7_200n,
    hasCommercialDataset: true,
    hasHighQualityDataset: true,
  },
  marketplaceData: {
    datasetSalesCount: 4n,
    datasetSalesVolume: 5_000n,
    assetSalesCount: 12n,
    assetSalesVolume: 9_000n,
    royaltiesRealized: 700n,
    royaltyPaymentsCount: 6n,
  },
  nonce: 9n,
  timestamp: 1_900_000_000n,
  signature: "0x1234",
} as const;

const delegationAndEchoScoreCases = [
  {
    key: "DelegationFacet.delegateBySig",
    negativePath: "reject replayed delegation signature nonce before mutation",
    signature: "delegateBySig(address,uint256,uint256,uint8,bytes32,bytes32)",
    method: "POST",
    path: "/v1/staking/commands/delegate-by-sig",
    body: {
      delegatee: fixtureAccount,
      nonce: "4",
      expiry: "2000000000",
      v: "27",
      r: signatureR,
      s: signatureS,
    },
    runtimeArgs: [fixtureAccount, 4n, 2_000_000_000n, 27n, signatureR, signatureS],
  },
  {
    key: "DelegationFacet.updateDelegatedVotingPower",
    negativePath: "reject stale delegated voting-power checkpoint before mutation",
    signature: "updateDelegatedVotingPower(address)",
    method: "PATCH",
    path: "/v1/staking/commands/update-delegated-voting-power",
    body: { account: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
  {
    key: "DelegationFacet.updateDelegatedVotingPowerBatch",
    negativePath: "reject stale or duplicated delegation batch before mutation",
    signature: "updateDelegatedVotingPowerBatch(address[])",
    method: "PATCH",
    path: "/v1/staking/commands/update-delegated-voting-power-batch",
    body: { accounts: [fixtureAccount, secondAccount] },
    runtimeArgs: [[fixtureAccount, secondAccount]],
  },
  {
    key: "UpgradeControllerFacet.initUpgradeController",
    negativePath: "reject unauthorized or replayed upgrade-controller initialization",
    signature: "initUpgradeController(address[],uint256,uint256)",
    method: "POST",
    path: "/v1/diamond-admin/diamond-admin",
    body: {
      signers: [fixtureAccount, secondAccount, thirdAccount],
      threshold: "2",
      delay: "604800",
    },
    runtimeArgs: [[fixtureAccount, secondAccount, thirdAccount], 2n, 604_800n],
  },
  {
    key: "EchoScoreFacetV3.batchUpdateScores",
    negativePath: "reject replayed or stale oracle score batch before mutation",
    signature: "batchUpdateScores((bytes32,(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256,bool,bool),(uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)[])",
    method: "POST",
    path: "/v1/staking/commands/batch-update-scores",
    body: { updates: [scoreUpdate] },
    runtimeArgs: [[runtimeScoreUpdate]],
  },
  {
    key: "EchoScoreFacetV3.pauseEchoScoreV3",
    negativePath: "reject replayed pause or unauthorized oracle control",
    signature: "pauseEchoScoreV3()",
    method: "POST",
    path: "/v1/staking/commands/pause-echo-score-v3",
    body: {},
    runtimeArgs: [],
  },
  {
    key: "EchoScoreFacetV3.setEchoScoreOracleV3",
    negativePath: "reject unauthorized oracle rotation before mutation",
    signature: "setEchoScoreOracleV3(address)",
    method: "PATCH",
    path: "/v1/staking/commands/set-echo-score-oracle-v3",
    body: { newOracle: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
  {
    key: "EchoScoreFacetV3.setOracleFutureDriftConfig",
    negativePath: "reject stale or replayed future-drift configuration",
    signature: "setOracleFutureDriftConfig(uint256)",
    method: "PATCH",
    path: "/v1/staking/commands/set-oracle-future-drift-config",
    body: { maxFutureSeconds: "300" },
    runtimeArgs: [300n],
  },
  {
    key: "EchoScoreFacetV3.setOracleQuorumSigners",
    negativePath: "reject unauthorized or mismatched oracle quorum rotation",
    signature: "setOracleQuorumSigners(address[],uint256)",
    method: "PATCH",
    path: "/v1/staking/commands/set-oracle-quorum-signers",
    body: { signers: [fixtureAccount, secondAccount], threshold: "2" },
    runtimeArgs: [[fixtureAccount, secondAccount], 2n],
  },
  {
    key: "EchoScoreFacetV3.setOracleStalenessConfig",
    negativePath: "reject stale or replayed oracle-age configuration",
    signature: "setOracleStalenessConfig(uint256)",
    method: "PATCH",
    path: "/v1/staking/commands/set-oracle-staleness-config",
    body: { maxAgeSeconds: "3600" },
    runtimeArgs: [3_600n],
  },
  {
    key: "EchoScoreFacetV3.unpauseEchoScoreV3",
    negativePath: "reject replayed unpause or unauthorized oracle control",
    signature: "unpauseEchoScoreV3()",
    method: "POST",
    path: "/v1/staking/commands/unpause-echo-score-v3",
    body: {},
    runtimeArgs: [],
  },
  {
    key: "EchoScoreFacetV3.updateScore",
    negativePath: "reject stale nonce or replayed oracle signature before mutation",
    signature: "updateScore((bytes32,(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256,bool,bool),(uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes))",
    method: "PATCH",
    path: "/v1/staking/commands/update-score",
    body: { update: scoreUpdate },
    runtimeArgs: [runtimeScoreUpdate],
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
    insert: vi.fn().mockResolvedValue("delegation-echo-score-request-1"),
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
        label: "delegation and score operator",
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
  app.use(createStakingPrimitiveRouter(context as never));
  app.use(createDiamondAdminPrimitiveRouter(context as never));
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
    throw new Error("delegation and EchoScore fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("delegation, upgrade initialization, and EchoScore command safety", () => {
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
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xde1e6a710e" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(delegationAndEchoScoreCases)(
    "preflights $key through its mounted workflow route before mutation",
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
          requestId: "delegation-echo-score-request-1",
          txHash: "0xde1e6a710e",
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

  it.each(delegationAndEchoScoreCases)(
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

  it.each(delegationAndEchoScoreCases)(
    "rejects stale, replayed, invalid, or unauthorized $key during preflight without mutation",
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
