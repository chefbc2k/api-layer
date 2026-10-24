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

import { stakingMethodDefinitions } from "../modules/staking/primitives/generated/mapping.js";
import { createStakingPrimitiveRouter } from "../modules/staking/primitives/generated/routes.js";
import { whisperblockMethodDefinitions } from "../modules/whisperblock/primitives/generated/mapping.js";
import { createWhisperblockPrimitiveRouter } from "../modules/whisperblock/primitives/generated/routes.js";
import type { AbiParameter, HttpMethodDefinition } from "../shared/route-types.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";

// Each selected command is covered through its mounted route with contract
// preflight-before-mutation ordering plus unauthorized and stale/replayed rejection.
const targetKeys = [
  "VotingPowerFacet.setMaxLockDuration",
  "VotingPowerFacet.setRoleMultiplier",
  "VotingPowerFacet.setupInitialVotingPower",
  "VotingPowerFacet.setZeroLockDuration",
  "VotingPowerFacet.updateLockDuration",
  "VotingPowerFacet.updateVotingPower",
  "VotingPowerFacet.updateVotingPowerBatch",
  "WhisperBlockFacet.revokeAccess",
  "WhisperBlockFacet.setAuditEnabled",
  "WhisperBlockFacet.setOffchainEntropy",
  "WhisperBlockFacet.setTrustedOracle",
  "WhisperBlockFacet.updateSystemParameters",
] as const;

const allDefinitions: HttpMethodDefinition[] = [
  ...stakingMethodDefinitions,
  ...whisperblockMethodDefinitions,
];

function fixtureValue(input: AbiParameter): unknown {
  if (input.type.endsWith("[]")) {
    return [fixtureValue({ ...input, type: input.type.slice(0, -2) })];
  }
  if (input.type.startsWith("tuple")) {
    return Object.fromEntries((input.components ?? []).map((component) => [
      component.name,
      fixtureValue(component),
    ]));
  }
  if (input.type === "address") return fixtureAccount;
  if (input.type === "bool") return true;
  if (input.type === "string") return "fixture";
  if (input.type === "bytes") return "0x1234";
  if (input.type.startsWith("bytes")) return `0x${"11".repeat(Number(input.type.slice(5)))}`;
  if (/^u?int/.test(input.type)) return "1";
  throw new Error(`missing fixture value for ${input.type}`);
}

function runtimeValue(input: AbiParameter, value: unknown): unknown {
  if (input.type.endsWith("[]")) {
    const elementType = { ...input, type: input.type.slice(0, -2) };
    return (value as unknown[]).map((entry) => runtimeValue(elementType, entry));
  }
  if (input.type.startsWith("tuple")) {
    const tuple = value as Record<string, unknown>;
    return Object.fromEntries((input.components ?? []).map((component) => [
      component.name,
      runtimeValue(component, tuple[component.name]),
    ]));
  }
  if (/^u?int/.test(input.type)) return BigInt(String(value));
  return value;
}

function requiredDefinition(key: (typeof targetKeys)[number]): HttpMethodDefinition {
  const definition = allDefinitions.find((candidate) => candidate.key === key);
  if (!definition) throw new Error(`missing generated route definition for ${key}`);
  return definition;
}

const cases = targetKeys.map((key) => {
  const definition = requiredDefinition(key);
  const values = Object.fromEntries(definition.inputs.map((input) => [input.name, fixtureValue(input)]));
  const args = definition.inputs.map((input) => runtimeValue(input, values[input.name]));
  let path = definition.path;
  const body: Record<string, unknown> = {};
  const query = new URLSearchParams();

  for (const binding of definition.inputShape.bindings) {
    const value = values[binding.name];
    if (binding.source === "path") path = path.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    if (binding.source === "query") query.set(binding.field, String(value));
    if (binding.source === "body") body[binding.field] = value;
  }

  const queryString = query.toString();
  return {
    key,
    definition,
    args,
    path: queryString ? `${path}?${queryString}` : path,
    body,
    preflightRejection: `reject stale or replayed ${key} state`,
  };
});

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
    insert: vi.fn().mockResolvedValue("voting-whisper-command-request-1"),
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
        label: "voting and whisperblock workflow operator",
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
  app.use(createWhisperblockPrimitiveRouter(context as never));
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
    throw new Error("voting and whisperblock command fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function call(port: number, testCase: (typeof cases)[number], apiKey: string) {
  return fetch(`http://127.0.0.1:${port}${testCase.path}`, {
    method: testCase.definition.httpMethod,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(testCase.body),
    signal: AbortSignal.timeout(2_500),
  });
}

describe("voting power and whisperblock command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({ to: diamondAddress, data: "0xfeed" });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvoting-whisper-command-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) delete process.env.API_LAYER_SIGNER_MAP_JSON;
    else process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
  });

  it.each(cases)("preflights $key through its mounted workflow route before mutation", async (testCase) => {
    const { context, providerRouter, txStore } = buildContext();
    const { server, port } = await startServer(context);
    try {
      const response = await call(port, testCase, "operator-key");
      expect(response.status, `${testCase.key}: ${await response.text()}`).toBe(202);
      expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.args);
      expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.definition.signature, testCase.args);
      expect(txStore.insert).toHaveBeenCalledOnce();
      expect(mocks.walletSendTransaction).toHaveBeenCalledOnce();
      expect(mocks.contractStaticCall.mock.invocationCallOrder[0]).toBeLessThan(txStore.insert.mock.invocationCallOrder[0]!);
      expect(txStore.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.walletSendTransaction.mock.invocationCallOrder[0]!);
      expect(providerRouter.withProvider).toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects unauthorized $key before contract access or mutation", async (testCase) => {
    const { context, providerRouter, txStore } = buildContext();
    const { server, port } = await startServer(context);
    try {
      expect((await call(port, testCase, "read-only-key")).status).toBe(403);
      expect(providerRouter.withProvider).not.toHaveBeenCalled();
      expect(mocks.contractStaticCall).not.toHaveBeenCalled();
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects stale or replayed $key preflight without mutation", async (testCase) => {
    mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.preflightRejection));
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);
    try {
      const response = await call(port, testCase, "operator-key");
      expect(response.status).toBe(500);
      expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.args);
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });
});
