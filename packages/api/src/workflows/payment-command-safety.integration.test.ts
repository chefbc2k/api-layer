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

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";
const thirdAccount = "0x00000000000000000000000000000000000000dd";
const commitHash = `0x${"12".repeat(32)}`;

const revealParams = {
  tokenId: "41",
  amount: "2500000",
  seller: fixtureAccount,
  referrer: secondAccount,
  isLicensePayment: true,
  payer: thirdAccount,
  nonce: "7",
  deadline: "2000000000",
} as const;

const runtimeRevealParams = {
  tokenId: 41n,
  amount: 2_500_000n,
  seller: fixtureAccount,
  referrer: secondAccount,
  isLicensePayment: true,
  payer: thirdAccount,
  nonce: 7n,
  deadline: 2_000_000_000n,
} as const;

const buybackConfig = {
  buybackBps: "500",
  minMonthlyRevenue: "1000000",
  requiredMonths: "3",
  cadence: "7776000",
  buybackRouter: fixtureAccount,
  uspkToken: secondAccount,
  burnAddress: thirdAccount,
} as const;

const runtimeBuybackConfig = {
  buybackBps: 500n,
  minMonthlyRevenue: 1_000_000n,
  requiredMonths: 3n,
  cadence: 7_776_000n,
  buybackRouter: fixtureAccount,
  uspkToken: secondAccount,
  burnAddress: thirdAccount,
} as const;

const baseDistributionBody = {
  tokenId: "41",
  amount: "2500000",
  seller: fixtureAccount,
  referrer: secondAccount,
  isLicensePayment: true,
} as const;

const baseDistributionArgs = [41n, 2_500_000n, fixtureAccount, secondAccount, true] as const;

const paymentCommandCases = [
  {
    key: "PaymentFacet.approveMultisigWithdrawal",
    negativePath: "reject unauthorized or replayed multisig withdrawal approval",
    signature: "approveMultisigWithdrawal(address,uint256,address)",
    method: "POST",
    path: "/v1/marketplace/commands/approve-multisig-withdrawal",
    body: { token: fixtureAccount, amount: "2500000", to: secondAccount },
    runtimeArgs: [fixtureAccount, 2_500_000n, secondAccount],
  },
  {
    key: "PaymentFacet.commitDistribution",
    negativePath: "reject duplicate or stale payment distribution commitment",
    signature: "commitDistribution(bytes32)",
    method: "POST",
    path: "/v1/marketplace/commands/commit-distribution",
    body: { commitHash },
    runtimeArgs: [commitHash],
  },
  {
    key: "PaymentFacet.commitWithdraw",
    negativePath: "reject duplicate or unauthorized withdrawal commitment",
    signature: "commitWithdraw(bytes32)",
    method: "POST",
    path: "/v1/marketplace/commands/commit-withdraw",
    body: { commitHash },
    runtimeArgs: [commitHash],
  },
  {
    key: "PaymentFacet.distributePayment",
    negativePath: "reject stale or unauthorized payment distribution",
    signature: "distributePayment(uint256,uint256,address,address,bool)",
    method: "POST",
    path: "/v1/marketplace/commands/distribute-payment",
    body: baseDistributionBody,
    runtimeArgs: baseDistributionArgs,
  },
  {
    key: "PaymentFacet.distributePaymentFrom",
    negativePath: "reject unauthorized payer or stale payment distribution",
    signature: "distributePaymentFrom(uint256,uint256,address,address,bool,address)",
    method: "POST",
    path: "/v1/marketplace/commands/distribute-payment-from",
    body: { ...baseDistributionBody, payer: thirdAccount },
    runtimeArgs: [...baseDistributionArgs, thirdAccount],
  },
  {
    key: "PaymentFacet.distributePaymentFromWithDeadline",
    negativePath: "reject expired replay or unauthorized payer distribution",
    signature: "distributePaymentFromWithDeadline(uint256,uint256,address,address,bool,address,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/distribute-payment-from-with-deadline",
    body: { ...baseDistributionBody, payer: thirdAccount, deadline: "2000000000" },
    runtimeArgs: [...baseDistributionArgs, thirdAccount, 2_000_000_000n],
  },
  {
    key: "PaymentFacet.distributePaymentWithDeadline",
    negativePath: "reject expired replay or stale payment distribution",
    signature: "distributePaymentWithDeadline(uint256,uint256,address,address,bool,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/distribute-payment-with-deadline",
    body: { ...baseDistributionBody, deadline: "2000000000" },
    runtimeArgs: [...baseDistributionArgs, 2_000_000_000n],
  },
  {
    key: "PaymentFacet.executeMultisigWithdrawal",
    negativePath: "reject insufficient approvals or replayed multisig withdrawal",
    signature: "executeMultisigWithdrawal(address,uint256,address,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/execute-multisig-withdrawal",
    body: { token: fixtureAccount, amount: "2500000", to: secondAccount, requiredApprovals: "2" },
    runtimeArgs: [fixtureAccount, 2_500_000n, secondAccount, 2n],
  },
  {
    key: "PaymentFacet.executeQuarterlyBuyback",
    negativePath: "reject premature or unauthorized quarterly buyback",
    signature: "executeQuarterlyBuyback(uint256,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/execute-quarterly-buyback",
    body: { usdcAmount: "5000000", minUspkOut: "1000000" },
    runtimeArgs: [5_000_000n, 1_000_000n],
  },
  {
    key: "PaymentFacet.pauseBuybacks",
    negativePath: "reject unauthorized or replayed buyback pause change",
    signature: "pauseBuybacks(bool)",
    method: "POST",
    path: "/v1/marketplace/commands/pause-buybacks",
    body: { paused: true },
    runtimeArgs: [true],
  },
  {
    key: "PaymentFacet.revealDistribution",
    negativePath: "reject expired or mismatched distribution reveal",
    signature: "revealDistribution(uint256,uint256,address,address,bool,address,uint256,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/reveal-distribution",
    body: revealParams,
    runtimeArgs: Object.values(runtimeRevealParams),
  },
  {
    key: "PaymentFacet.revealDistributionStruct",
    negativePath: "reject expired or mismatched structured distribution reveal",
    signature: "revealDistributionStruct((uint256,uint256,address,address,bool,address,uint256,uint256))",
    method: "POST",
    path: "/v1/marketplace/commands/reveal-distribution-struct",
    body: { params: revealParams },
    runtimeArgs: [runtimeRevealParams],
  },
  {
    key: "PaymentFacet.revealWithdraw",
    negativePath: "reject expired replay or mismatched withdrawal reveal",
    signature: "revealWithdraw(uint256,uint256,uint256)",
    method: "POST",
    path: "/v1/marketplace/commands/reveal-withdraw",
    body: { amount: "2500000", nonce: "7", deadline: "2000000000" },
    runtimeArgs: [2_500_000n, 7n, 2_000_000_000n],
  },
  {
    key: "PaymentFacet.setBuybackConfig",
    negativePath: "reject unauthorized or stale buyback configuration",
    signature: "setBuybackConfig(uint256,uint256,uint256,uint256,address,address,address)",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-buyback-config",
    body: buybackConfig,
    runtimeArgs: Object.values(runtimeBuybackConfig),
  },
  {
    key: "PaymentFacet.setBuybackConfigStruct",
    negativePath: "reject unauthorized or stale structured buyback configuration",
    signature: "setBuybackConfigStruct((uint256,uint256,uint256,uint256,address,address,address))",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-buyback-config-struct",
    body: { config: buybackConfig },
    runtimeArgs: [runtimeBuybackConfig],
  },
  {
    key: "PaymentFacet.setMevProtectionConfig",
    negativePath: "reject unauthorized or stale MEV protection configuration",
    signature: "setMevProtectionConfig(bool,address,uint256,uint256,uint256)",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-mev-protection-config",
    body: {
      flashbotsEnabled: true,
      flashbotsRelayAddress: fixtureAccount,
      minFlashbotsValue: "1000000",
      highValueThreshold: "5000000",
      revealTimelockBlocks: "5",
    },
    runtimeArgs: [true, fixtureAccount, 1_000_000n, 5_000_000n, 5n],
  },
  {
    key: "PaymentFacet.setPaymentPaused",
    negativePath: "reject unauthorized or replayed payment pause change",
    signature: "setPaymentPaused(bool)",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-payment-paused",
    body: { paused: true },
    runtimeArgs: [true],
  },
  {
    key: "PaymentFacet.setStakingConfig",
    negativePath: "reject unauthorized or stale staking allocation configuration",
    signature: "setStakingConfig(address,uint256)",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-staking-config",
    body: { stakingFacet: fixtureAccount, stakingAllocationBps: "1250" },
    runtimeArgs: [fixtureAccount, 1_250n],
  },
  {
    key: "PaymentFacet.setTreasuryWithdrawalLimit",
    negativePath: "reject unauthorized or stale treasury withdrawal limit",
    signature: "setTreasuryWithdrawalLimit(uint256,uint256,uint256)",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-treasury-withdrawal-limit",
    body: { limit: "10000000", window: "86400", cooldown: "3600" },
    runtimeArgs: [10_000_000n, 86_400n, 3_600n],
  },
  {
    key: "PaymentFacet.setUsdcToken",
    negativePath: "reject unauthorized or stale USDC token replacement",
    signature: "setUsdcToken(address)",
    method: "PATCH",
    path: "/v1/marketplace/commands/set-usdc-token",
    body: { newUsdcToken: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
  {
    key: "PaymentFacet.updateDevFundAddress",
    negativePath: "reject unauthorized or stale development fund address",
    signature: "updateDevFundAddress(address)",
    method: "PATCH",
    path: "/v1/marketplace/commands/update-dev-fund-address",
    body: { newDevFund: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
  {
    key: "PaymentFacet.updateFeeConfiguration",
    negativePath: "reject unauthorized or invalid fee configuration replay",
    signature: "updateFeeConfiguration(uint256,uint256,uint256,uint256,uint256,uint256)",
    method: "PATCH",
    path: "/v1/marketplace/commands/update-fee-configuration",
    body: {
      platformFee: "250",
      referralFee: "100",
      unionShare: "2500",
      devFund: "1500",
      timewaveGift: "500",
      milestonePool: "500",
    },
    runtimeArgs: [250n, 100n, 2_500n, 1_500n, 500n, 500n],
  },
  {
    key: "PaymentFacet.updateTreasuryAddress",
    negativePath: "reject unauthorized or stale treasury address replacement",
    signature: "updateTreasuryAddress(address)",
    method: "PATCH",
    path: "/v1/marketplace/commands/update-treasury-address",
    body: { newTreasury: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
  {
    key: "PaymentFacet.updateUnionTreasuryAddress",
    negativePath: "reject unauthorized or stale union treasury address replacement",
    signature: "updateUnionTreasuryAddress(address)",
    method: "PATCH",
    path: "/v1/marketplace/commands/update-union-treasury-address",
    body: { newUnionTreasury: fixtureAccount },
    runtimeArgs: [fixtureAccount],
  },
] as const;

const integerResultSignatures = new Set([
  "commitDistribution(bytes32)",
  "commitWithdraw(bytes32)",
  "executeQuarterlyBuyback(uint256,uint256)",
]);

const booleanResultSignatures = new Set([
  "distributePayment(uint256,uint256,address,address,bool)",
  "distributePaymentFrom(uint256,uint256,address,address,bool,address)",
  "distributePaymentFromWithDeadline(uint256,uint256,address,address,bool,address,uint256)",
  "distributePaymentWithDeadline(uint256,uint256,address,address,bool,uint256)",
  "revealDistribution(uint256,uint256,address,address,bool,address,uint256,uint256)",
  "revealDistributionStruct((uint256,uint256,address,address,bool,address,uint256,uint256))",
]);

function staticResultFor(signature: string) {
  if (integerResultSignatures.has(signature)) {
    return 101n;
  }
  if (booleanResultSignatures.has(signature)) {
    return true;
  }
  return null;
}

function serializedResultFor(signature: string) {
  if (integerResultSignatures.has(signature)) {
    return "101";
  }
  if (booleanResultSignatures.has(signature)) {
    return true;
  }
  return null;
}

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
    insert: vi.fn().mockResolvedValue("payment-command-request-1"),
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
        label: "payment command operator",
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
    throw new Error("payment command fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("payment command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockImplementation((signature: string) => staticResultFor(signature));
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xpayment-command-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(paymentCommandCases)(
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

        const payload = await response.json();
        expect(response.status, `${testCase.key}: ${JSON.stringify(payload)}`).toBe(202);
        expect(payload).toEqual({
          requestId: "payment-command-request-1",
          txHash: "0xpayment-command-write",
          result: serializedResultFor(testCase.signature),
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
    15_000,
  );

  it.each(paymentCommandCases)(
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

  it.each(paymentCommandCases)(
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

        expect([400, 500], `${testCase.key}: ${JSON.stringify(payload)}`).toContain(response.status);
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
