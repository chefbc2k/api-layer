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
import { createOwnershipPrimitiveRouter } from "../modules/ownership/primitives/generated/routes.js";
import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";

const beneficiary = {
  sharePercentage: "2500",
  activationTime: "1800000000",
  account: fixtureAccount,
  isActive: true,
  canDelegate: false,
  relationship: "heir",
} as const;

const runtimeBeneficiary = {
  sharePercentage: 2_500n,
  activationTime: 1_800_000_000n,
  account: fixtureAccount,
  isActive: true,
  canDelegate: false,
  relationship: "heir",
} as const;

const legacyOwnershipAndTimelockCases = [
  {
    key: "LegacyFacet.setMaxBeneficiaries",
    negativePath: "reject unauthorized or replayed maximum-beneficiary configuration",
    signature: "setMaxBeneficiaries(uint256)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-max-beneficiaries",
    body: { max: "12" },
    runtimeArgs: [12n],
  },
  {
    key: "LegacyFacet.setMinTimelockPeriod",
    negativePath: "reject stale or unauthorized inheritance timelock configuration",
    signature: "setMinTimelockPeriod(uint256)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/set-min-timelock-period",
    body: { period: "86400" },
    runtimeArgs: [86_400n],
  },
  {
    key: "LegacyFacet.updateBeneficiary",
    negativePath: "reject stale beneficiary index or unauthorized beneficiary replacement",
    signature: "updateBeneficiary((uint256,uint256,address,bool,bool,string),uint256)",
    method: "PATCH",
    path: "/v1/voice-assets/commands/update-beneficiary",
    body: { beneficiary, index: "2" },
    runtimeArgs: [runtimeBeneficiary, 2n],
  },
  {
    key: "TimelockFacet.updateMinDelay",
    negativePath: "reject unauthorized or replayed minimum-delay update",
    signature: "updateMinDelay(uint256)",
    method: "PATCH",
    path: "/v1/governance/commands/update-min-delay",
    body: { newDelay: "172800" },
    runtimeArgs: [172_800n],
  },
  {
    key: "OwnershipFacet.acceptOwnership",
    negativePath: "reject unauthorized acceptance without a matching pending owner",
    signature: "acceptOwnership()",
    method: "POST",
    path: "/v1/ownership/commands/accept-ownership",
    body: {},
    runtimeArgs: [],
  },
  {
    key: "OwnershipFacet.cancelOwnershipTransfer",
    negativePath: "reject unauthorized or stale ownership-transfer cancellation",
    signature: "cancelOwnershipTransfer()",
    method: "DELETE",
    path: "/v1/ownership/commands/cancel-ownership-transfer",
    body: {},
    runtimeArgs: [],
  },
  {
    key: "OwnershipFacet.proposeOwnershipTransfer",
    negativePath: "reject unauthorized or replayed ownership-transfer proposal",
    signature: "proposeOwnershipTransfer(address)",
    method: "POST",
    path: "/v1/ownership/commands/propose-ownership-transfer",
    body: { _newOwner: secondAccount },
    runtimeArgs: [secondAccount],
  },
  {
    key: "OwnershipFacet.setApprovedOwnerTarget",
    negativePath: "reject unauthorized or stale approved-owner target change",
    signature: "setApprovedOwnerTarget(address,bool)",
    method: "PATCH",
    path: "/v1/ownership/commands/set-approved-owner-target",
    body: { target: secondAccount, approved: true },
    runtimeArgs: [secondAccount, true],
  },
  {
    key: "OwnershipFacet.setOwnershipPolicyEnforced",
    negativePath: "reject unauthorized or replayed ownership-policy enforcement change",
    signature: "setOwnershipPolicyEnforced(bool)",
    method: "PATCH",
    path: "/v1/ownership/commands/set-ownership-policy-enforced",
    body: { enforced: true },
    runtimeArgs: [true],
  },
  {
    key: "OwnershipFacet.transferOwnership",
    negativePath: "reject unauthorized direct ownership transfer or stale target",
    signature: "transferOwnership(address)",
    method: "POST",
    path: "/v1/ownership/commands/transfer-ownership",
    body: { _newOwner: secondAccount },
    runtimeArgs: [secondAccount],
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
    insert: vi.fn().mockResolvedValue("legacy-ownership-timelock-request-1"),
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
        label: "legacy ownership and timelock operator",
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
  app.use(createOwnershipPrimitiveRouter(context as never));
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
    throw new Error("legacy, ownership, and timelock fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("legacy, ownership, and timelock command route preflight safety", () => {
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
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xlegacy-ownership-timelock-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(legacyOwnershipAndTimelockCases)(
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
          requestId: "legacy-ownership-timelock-request-1",
          txHash: "0xlegacy-ownership-timelock-write",
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

  it.each(legacyOwnershipAndTimelockCases)(
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

  it.each(legacyOwnershipAndTimelockCases)(
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
