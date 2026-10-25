import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStakingPrimitiveRouter } from "../modules/staking/primitives/generated/routes.js";
import { stakingMethodDefinitions } from "../modules/staking/primitives/generated/mapping.js";
import { createTokenomicsPrimitiveRouter } from "../modules/tokenomics/primitives/generated/routes.js";
import { tokenomicsMethodDefinitions } from "../modules/tokenomics/primitives/generated/mapping.js";

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

  return { ...actual, Contract: MockContract, Wallet: MockWallet };
});

vi.mock("../shared/alchemy-diagnostics.js", async () => {
  const actual = await vi.importActual<typeof import("../shared/alchemy-diagnostics.js")>("../shared/alchemy-diagnostics.js");
  return { ...actual, readActorStates: mocks.readActorStates };
});

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";

// Keep the matrix scoped to this batch. Every key carries its own stale,
// replay, or unauthorized preflight rejection so the gap reporter can
// attribute the adversarial proof to the exact mounted route.
const targets = [
  { key: "CommunityRewardsFacet.createCampaign", rejection: "reject stale campaign parameters" },
  { key: "CommunityRewardsFacet.pauseCampaign", rejection: "reject replayed campaign pause" },
  { key: "CommunityRewardsFacet.setMerkleRoot", rejection: "reject stale campaign merkle root" },
  { key: "CommunityRewardsFacet.unpauseCampaign", rejection: "reject unauthorized campaign unpause" },
  { key: "DelegationFacet.delegate", rejection: "reject replayed delegation state" },
  { key: "TimewaveGiftFacet.setMinimumTwaveVestingDuration", rejection: "reject stale vesting duration" },
  { key: "TimewaveGiftFacet.setQuarterlyUnlockRate", rejection: "reject replayed unlock rate" },
  { key: "TokenSupplyFacet.tokenApprove", rejection: "reject unauthorized stale allowance" },
  { key: "VestingFacet.createCexVesting", rejection: "reject stale duplicate CEX vesting" },
  { key: "VestingFacet.createDevFundVesting", rejection: "reject stale duplicate dev-fund vesting" },
  { key: "VestingFacet.createFounderVesting", rejection: "reject stale duplicate founder vesting" },
  { key: "VestingFacet.createPublicVesting", rejection: "reject stale duplicate public vesting" },
  { key: "VestingFacet.createTeamVesting", rejection: "reject stale duplicate team vesting" },
  { key: "VestingFacet.revokeVestingSchedule", rejection: "reject unauthorized or replayed vesting revocation" },
  { key: "VestingFacet.releaseStandardVesting", rejection: "reject replayed empty vesting release" },
  { key: "VestingFacet.releaseStandardVestingFor", rejection: "reject unauthorized stale delegated release" },
  { key: "VestingFacet.setMinimumVestingDuration", rejection: "reject stale or unauthorized minimum vesting duration" },
] as const;

type AbiInput = {
  name: string;
  type: string;
  components?: AbiInput[];
};

function fixtureValue(input: AbiInput): unknown {
  if (input.type.endsWith("[]")) {
    return [fixtureValue({ ...input, type: input.type.slice(0, -2) })];
  }
  if (input.type.startsWith("tuple")) {
    return Object.fromEntries((input.components ?? []).map((component) => [component.name, fixtureValue(component)]));
  }
  if (input.type === "address") return fixtureAccount;
  if (input.type === "bool") return true;
  if (input.type === "string") return "fixture";
  if (input.type === "bytes") return "0x1234";
  if (input.type.startsWith("bytes")) return `0x${"11".repeat(Number(input.type.slice(5)))}`;
  if (/^u?int/u.test(input.type)) return "1";
  throw new Error(`missing fixture value for ${input.type}`);
}

function runtimeValue(input: AbiInput, value: unknown): unknown {
  if (input.type.endsWith("[]")) {
    const element = { ...input, type: input.type.slice(0, -2) };
    return (value as unknown[]).map((entry) => runtimeValue(element, entry));
  }
  if (input.type.startsWith("tuple")) {
    const values = value as Record<string, unknown>;
    return Object.fromEntries((input.components ?? []).map((component) => [
      component.name,
      runtimeValue(component, values[component.name]),
    ]));
  }
  if (/^u?int/u.test(input.type)) return BigInt(String(value));
  return value;
}

const definitions = [
  ...stakingMethodDefinitions,
  ...tokenomicsMethodDefinitions,
];

const cases = targets.map((target) => {
  const definition = definitions.find((candidate) => candidate.key === target.key);
  if (!definition) throw new Error(`missing generated route definition for ${target.key}`);

  const inputs = definition.inputs as AbiInput[];
  const values = Object.fromEntries(inputs.map((input) => [input.name, fixtureValue(input)]));
  const body: Record<string, unknown> = {};
  const query = new URLSearchParams();
  let path = definition.path;

  for (const binding of definition.inputShape.bindings) {
    const value = values[binding.name];
    if (binding.source === "path") path = path.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    if (binding.source === "query") query.set(binding.field, String(value));
    if (binding.source === "body") body[binding.field] = value;
  }
  if (query.size > 0) path = `${path}?${query.toString()}`;

  return {
    ...target,
    definition,
    path,
    body,
    runtimeArgs: inputs.map((input) => runtimeValue(input, values[input.name])),
  };
});

function successfulStaticResult(testCase: (typeof cases)[number]): unknown {
  const output = testCase.definition.outputs[0] as AbiInput | undefined;
  return output ? runtimeValue(output, fixtureValue(output)) : null;
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
    insert: vi.fn().mockResolvedValue("rewards-delegation-vesting-request-1"),
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
    cache: { get: vi.fn().mockReturnValue(null), set: vi.fn() },
    txStore,
    rateLimiter: { enforce: vi.fn().mockResolvedValue(undefined) },
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
  app.use(createTokenomicsPrimitiveRouter(context as never));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.listening ? resolve() : server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture server did not bind a TCP port");
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function call(port: number, testCase: (typeof cases)[number], apiKey: string) {
  return fetch(`http://127.0.0.1:${port}${testCase.path}`, {
    method: testCase.definition.httpMethod,
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(testCase.body),
    signal: AbortSignal.timeout(2_500),
  });
}

describe("rewards, delegation, token approval, and vesting route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({ to: diamondAddress, data: "0xfeed" });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xrewards-delegation-vesting-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) delete process.env.API_LAYER_SIGNER_MAP_JSON;
    else process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
  });

  it.each(cases)("preflights $key through its mounted generated route before insert and send", async (testCase) => {
    mocks.contractStaticCall.mockResolvedValue(successfulStaticResult(testCase));
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);

    try {
      const response = await call(port, testCase, "operator-key");
      expect(response.status, `${testCase.key}: ${await response.text()}`).toBe(202);
      expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
      expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
      expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
        method: testCase.key,
        status: "submitting",
      }));
      expect(mocks.walletSendTransaction).toHaveBeenCalledOnce();
      expect(mocks.contractStaticCall.mock.invocationCallOrder[0]).toBeLessThan(txStore.insert.mock.invocationCallOrder[0]!);
      expect(txStore.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.walletSendTransaction.mock.invocationCallOrder[0]!);
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects read-only $key before provider, preflight, or mutation", async (testCase) => {
    const { context, providerRouter, txStore } = buildContext();
    const { server, port } = await startServer(context);

    try {
      expect((await call(port, testCase, "read-only-key")).status).toBe(403);
      expect(providerRouter.withProvider).not.toHaveBeenCalled();
      expect(mocks.contractStaticCall).not.toHaveBeenCalled();
      expect(mocks.contractPopulateTransaction).not.toHaveBeenCalled();
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects stale, replayed, or unauthorized $key static preflight without mutation", async (testCase) => {
    mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.rejection));
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);

    try {
      const response = await call(port, testCase, "operator-key");
      expect(response.status).toBe(500);
      expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });
});
