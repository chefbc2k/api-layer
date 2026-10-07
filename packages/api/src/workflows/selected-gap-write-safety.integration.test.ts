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

import { createTokenomicsPrimitiveRouter } from "../modules/tokenomics/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondSigner = "0x00000000000000000000000000000000000000cc";

const selectedGapWriteCases = [
  {
    key: "BurnThresholdFacet.thresholdBurnExcess",
    signature: "thresholdBurnExcess(address)",
    method: "POST",
    path: "/v1/tokenomics/commands/threshold-burn-excess",
    body: { account: fixtureAccount },
    runtimeArgs: [fixtureAccount],
    preview: 7n,
    preflightRejection: "stale excess balance rejects threshold destruction",
  },
  {
    key: "BurnThresholdFacet.thresholdBurnTokens",
    signature: "thresholdBurnTokens(uint256)",
    method: "POST",
    path: "/v1/tokenomics/commands/threshold-burn-tokens",
    body: { amount: "10" },
    runtimeArgs: [10n],
    preview: null,
    preflightRejection: "insufficient balance rejects threshold token destruction",
  },
  {
    key: "BurnThresholdFacet.thresholdBurnTokensFrom",
    signature: "thresholdBurnTokensFrom(address,uint256)",
    method: "POST",
    path: "/v1/tokenomics/commands/threshold-burn-tokens-from",
    body: { account: fixtureAccount, amount: "10" },
    runtimeArgs: [fixtureAccount, 10n],
    preview: null,
    preflightRejection: "unauthorized allowance rejects delegated threshold destruction",
  },
  {
    key: "BurnThresholdFacet.thresholdSetBurnLimit",
    signature: "thresholdSetBurnLimit(uint256)",
    method: "POST",
    path: "/v1/tokenomics/commands/threshold-set-burn-limit",
    body: { threshold: "2500" },
    runtimeArgs: [2_500n],
    preview: null,
    preflightRejection: "replay burn-limit configuration rejected",
  },
  {
    key: "TimewaveGiftFacet.batchReleaseTwaveVesting",
    signature: "batchReleaseTwaveVesting(address[])",
    method: "POST",
    path: "/v1/tokenomics/commands/batch-release-twave-vesting",
    body: { beneficiaries: [fixtureAccount, secondSigner] },
    runtimeArgs: [[fixtureAccount, secondSigner]],
    preview: null,
    preflightRejection: "stale beneficiary batch rejects vesting payout",
  },
  {
    key: "TimewaveGiftFacet.createUsdcVestingSchedule",
    signature: "createUsdcVestingSchedule(address,uint256,uint256,uint256,uint256,bool,bool)",
    method: "POST",
    path: "/v1/tokenomics/vesting/create-usdc-vesting-schedule",
    body: {
      beneficiary: fixtureAccount,
      amount: "1000",
      startTime: "1700000000",
      duration: "31536000",
      cliff: "2592000",
      isQuarterly: true,
      isRevocable: true,
    },
    runtimeArgs: [fixtureAccount, 1_000n, 1_700_000_000n, 31_536_000n, 2_592_000n, true, true],
    preview: null,
    preflightRejection: "duplicate vesting schedule rejects allocation",
  },
  {
    key: "TimewaveGiftFacet.releaseTwaveVesting",
    signature: "releaseTwaveVesting()",
    method: "POST",
    path: "/v1/tokenomics/commands/release-twave-vesting",
    body: {},
    runtimeArgs: [],
    preview: null,
    preflightRejection: "empty releasable amount rejects beneficiary claim",
  },
  {
    key: "TimewaveGiftFacet.releaseTwaveVestingFor",
    signature: "releaseTwaveVestingFor(address)",
    method: "POST",
    path: "/v1/tokenomics/commands/release-twave-vesting-for",
    body: { beneficiary: fixtureAccount },
    runtimeArgs: [fixtureAccount],
    preview: null,
    preflightRejection: "stale beneficiary state rejects delegated payout",
  },
  {
    key: "TimewaveGiftFacet.revokeTwaveVesting",
    signature: "revokeTwaveVesting(address)",
    method: "DELETE",
    path: "/v1/tokenomics/commands/revoke-twave-vesting",
    body: { beneficiary: fixtureAccount },
    runtimeArgs: [fixtureAccount],
    preview: null,
    preflightRejection: "unauthorized vesting cancellation rejected",
  },
  {
    key: "TimewaveGiftFacet.transferTwaveVesting",
    signature: "transferTwaveVesting(address)",
    method: "POST",
    path: "/v1/tokenomics/commands/transfer-twave-vesting",
    body: { to: secondSigner },
    runtimeArgs: [secondSigner],
    preview: null,
    preflightRejection: "unauthorized vesting reassignment rejected",
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
    insert: vi.fn().mockResolvedValue("selected-gap-request-1"),
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
        label: "fixture operator",
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
  return { context, provider, providerRouter, txStore };
}

async function startServer(context: ReturnType<typeof buildContext>["context"]) {
  const app = express();
  app.set("apiExecutionContext", context);
  app.use(express.json());
  app.use(createTokenomicsPrimitiveRouter(context as never));
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
    throw new Error("selected gap fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("selected gap write route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockImplementation((signature: string) => (
      signature === "thresholdBurnExcess(address)" ? 7n : null
    ));
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xselected-gap-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(selectedGapWriteCases)(
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
          requestId: "selected-gap-request-1",
          txHash: "0xselected-gap-write",
          result: testCase.preview === null ? null : testCase.preview.toString(),
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

  it.each(selectedGapWriteCases)(
    "rejects unauthorized $key before preflight or mutation",
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

  it.each(selectedGapWriteCases)(
    "rejects stale, replayed, or unauthorized $key during preflight without mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.preflightRejection));
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
