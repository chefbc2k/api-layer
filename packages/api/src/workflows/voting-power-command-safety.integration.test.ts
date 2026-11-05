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

import { createStakingPrimitiveRouter } from "../modules/staking/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";
const role = `0x${"44".repeat(32)}`;

const votingPowerCases = [
  {
    key: "VotingPowerFacet.setMaxLockDuration",
    signature: "setMaxLockDuration(uint256)",
    path: "/v1/staking/commands/set-max-lock-duration",
    body: { maxDuration: "31536000" },
    runtimeArgs: [31_536_000n],
    preflightRejection: "replayed maximum lock duration rejected",
  },
  {
    key: "VotingPowerFacet.setRoleMultiplier",
    signature: "setRoleMultiplier(bytes32,uint256)",
    path: "/v1/staking/commands/set-role-multiplier",
    body: { role, multiplier: "12500" },
    runtimeArgs: [role, 12_500n],
    preflightRejection: "unauthorized role multiplier update rejected",
  },
  {
    key: "VotingPowerFacet.setupInitialVotingPower",
    signature: "setupInitialVotingPower(address,uint256)",
    path: "/v1/staking/commands/setup-initial-voting-power",
    body: { account: fixtureAccount, votingPower: "500000" },
    runtimeArgs: [fixtureAccount, 500_000n],
    preflightRejection: "replayed initial voting power setup rejected",
  },
  {
    key: "VotingPowerFacet.setZeroLockDuration",
    signature: "setZeroLockDuration(address)",
    path: "/v1/staking/commands/set-zero-lock-duration",
    body: { account: fixtureAccount },
    runtimeArgs: [fixtureAccount],
    preflightRejection: "unauthorized zero lock duration update rejected",
  },
  {
    key: "VotingPowerFacet.updateLockDuration",
    signature: "updateLockDuration(address,uint256)",
    path: "/v1/staking/commands/update-lock-duration",
    body: { account: fixtureAccount, duration: "2592000" },
    runtimeArgs: [fixtureAccount, 2_592_000n],
    preflightRejection: "stale lock duration update rejected",
  },
  {
    key: "VotingPowerFacet.updateVotingPower",
    signature: "updateVotingPower(address)",
    path: "/v1/staking/commands/update-voting-power",
    body: { account: fixtureAccount },
    runtimeArgs: [fixtureAccount],
    preflightRejection: "stale voting power checkpoint rejected",
  },
  {
    key: "VotingPowerFacet.updateVotingPowerBatch",
    signature: "updateVotingPowerBatch(address[])",
    path: "/v1/staking/commands/update-voting-power-batch",
    body: { accounts: [fixtureAccount, secondAccount] },
    runtimeArgs: [[fixtureAccount, secondAccount]],
    preflightRejection: "stale duplicated voting power batch rejected",
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
    insert: vi.fn().mockResolvedValue("voting-power-request-1"),
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
        label: "voting power operator",
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
  return { context, providerRouter, txStore };
}

async function startServer(context: ReturnType<typeof buildContext>["context"]) {
  const app = express();
  app.set("apiExecutionContext", context);
  app.use(express.json());
  app.use(createStakingPrimitiveRouter(context as never));
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
    throw new Error("voting power fixture server did not bind a TCP port");
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
  testCase: (typeof votingPowerCases)[number],
  apiKey: "operator-key" | "read-only-key",
) {
  return fetch(`http://127.0.0.1:${port}${testCase.path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(testCase.body),
    signal: AbortSignal.timeout(2_500),
  });
}

describe("VotingPower command route preflight safety", () => {
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
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0x70776572" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(votingPowerCases)(
    "preflights $key through its mounted workflow route before persistence or mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");

        expect(response.status, testCase.key).toBe(202);
        await expect(response.json()).resolves.toEqual({
          requestId: "voting-power-request-1",
          txHash: "0x70776572",
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

  it.each(votingPowerCases)(
    "rejects unauthorized $key before preflight, persistence, or mutation",
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

  it.each(votingPowerCases)(
    "rejects stale, replayed, invalid, or unauthorized $key during preflight without persistence or mutation",
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
