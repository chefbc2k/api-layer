import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { accessControlMethodDefinitions } from "../modules/access-control/primitives/generated/mapping.js";
import { createAccessControlPrimitiveRouter } from "../modules/access-control/primitives/generated/routes.js";
import { emergencyMethodDefinitions } from "../modules/emergency/primitives/generated/mapping.js";
import { createEmergencyPrimitiveRouter } from "../modules/emergency/primitives/generated/routes.js";
import { governanceMethodDefinitions } from "../modules/governance/primitives/generated/mapping.js";
import { createGovernancePrimitiveRouter } from "../modules/governance/primitives/generated/routes.js";

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

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";

const targets = [
  { key: "AccessControlFacet.grantRole", rejection: "reject unauthorized or replayed role grant" },
  { key: "AccessControlFacet.renounceRole", rejection: "reject stale or unauthorized role renunciation" },
  { key: "EmergencyFacet.emergencyResume", rejection: "reject replayed or unauthorized emergency resume" },
  { key: "EmergencyFacet.emergencyStop", rejection: "reject replayed or unauthorized emergency stop" },
  { key: "EmergencyFacet.executeResponse", rejection: "reject unauthorized or replayed emergency response" },
  { key: "EmergencyFacet.executeScheduledResume", rejection: "reject stale or replayed scheduled resume" },
  { key: "EmergencyFacet.extendPausedUntil", rejection: "reject unauthorized or stale pause extension" },
  { key: "EmergencyFacet.freezeAssets", rejection: "reject unauthorized or replayed asset freeze" },
  { key: "EmergencyFacet.reportIncident", rejection: "reject stale or unauthorized incident report" },
  { key: "EmergencyFacet.scheduleEmergencyResume", rejection: "reject stale or unauthorized resume schedule" },
  { key: "EmergencyFacet.triggerEmergency", rejection: "reject stale or replayed emergency trigger" },
  { key: "EmergencyFacet.unfreezeAssets", rejection: "reject unauthorized or replayed asset unfreeze" },
  { key: "ProposalFacet.prCastVote", rejection: "reject stale or replayed proposal vote" },
  { key: "ProposalFacet.prExecute", rejection: "reject stale or unauthorized proposal execution" },
  { key: "ProposalFacet.prQueue", rejection: "reject replayed or unauthorized proposal queue" },
  { key: "TimelockFacet.cancel", rejection: "reject stale or unauthorized timelock cancellation" },
  { key: "TimelockFacet.schedule", rejection: "reject stale, replayed, or unauthorized timelock schedule" },
] as const;

type AbiInput = {
  name: string;
  type: string;
  components?: AbiInput[];
};

function fixtureValue(input: AbiInput, runtime: boolean): unknown {
  if (input.type.endsWith("[]")) {
    return [fixtureValue({ ...input, type: input.type.slice(0, -2) }, runtime)];
  }
  if (input.type.startsWith("tuple")) {
    return Object.fromEntries(
      (input.components ?? []).map((component) => [component.name, fixtureValue(component, runtime)]),
    );
  }
  if (input.type === "address") return fixtureAccount;
  if (input.type === "bool") return true;
  if (input.type === "string") return "fixture";
  if (input.type === "bytes") return "0x1234";
  if (input.type.startsWith("bytes")) return `0x${"11".repeat(Number(input.type.slice(5)))}`;
  if (/^u?int/u.test(input.type)) return runtime ? 1n : "1";
  throw new Error(`missing fixture value for ${input.type}`);
}

const allDefinitions = [
  ...accessControlMethodDefinitions,
  ...emergencyMethodDefinitions,
  ...governanceMethodDefinitions,
];

const cases = targets.map((target) => {
  const definition = allDefinitions.find((candidate) => candidate.key === target.key);
  if (!definition) throw new Error(`missing route definition for ${target.key}`);

  const wireValues = Object.fromEntries(
    (definition.inputs as AbiInput[]).map((input) => [input.name, fixtureValue(input, false)]),
  );
  const runtimeArgs = (definition.inputs as AbiInput[]).map((input) => fixtureValue(input, true));
  let path = definition.path;
  const body: Record<string, unknown> = {};
  for (const binding of definition.inputShape.bindings) {
    const value = wireValues[binding.name];
    if (binding.source === "path") path = path.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    if (binding.source === "body") body[binding.field] = value;
  }

  return {
    ...target,
    definition,
    path,
    body,
    runtimeArgs,
  };
});

const successfulStaticResults: Partial<Record<(typeof targets)[number]["key"], unknown>> = {
  "EmergencyFacet.reportIncident": 1n,
  "ProposalFacet.prCastVote": 1n,
};

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
    insert: vi.fn().mockResolvedValue("access-emergency-governance-request-1"),
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
        label: "control-plane operator",
        signerId: "fixture-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "control-plane reader",
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
  app.use(createAccessControlPrimitiveRouter(context as never));
  app.use(createEmergencyPrimitiveRouter(context as never));
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
    throw new Error("access, emergency, and governance fixture server did not bind a TCP port");
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

describe("access-control, emergency, and governance command route preflight safety", () => {
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
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xaccess-emergency-governance-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(cases)("preflights $key through its mounted route before mutation", async (testCase) => {
    mocks.contractStaticCall.mockResolvedValue(successfulStaticResults[testCase.key] ?? null);
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);

    try {
      const response = await call(port, testCase, "operator-key");
      expect(response.status, `${testCase.key}: ${await response.text()}`).toBe(202);
      expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
      expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
      expect(txStore.insert).toHaveBeenCalledOnce();
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
  });

  it.each(cases)("rejects read-only $key before contract access or mutation", async (testCase) => {
    const { context, providerRouter, txStore } = buildContext();
    const { server, port } = await startServer(context);

    try {
      const response = await call(port, testCase, "read-only-key");
      expect(response.status).toBe(403);
      expect(mocks.contractStaticCall).not.toHaveBeenCalled();
      expect(mocks.contractPopulateTransaction).not.toHaveBeenCalled();
      expect(providerRouter.withProvider).not.toHaveBeenCalled();
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects stale, replayed, or unauthorized $key preflight without mutation", async (testCase) => {
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
