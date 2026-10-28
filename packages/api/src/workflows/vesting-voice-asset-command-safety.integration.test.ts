import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tokenomicsMethodDefinitions } from "../modules/tokenomics/primitives/generated/mapping.js";
import { createTokenomicsPrimitiveRouter } from "../modules/tokenomics/primitives/generated/routes.js";
import { voiceAssetsMethodDefinitions } from "../modules/voice-assets/primitives/generated/mapping.js";
import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";

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
  {
    key: "VestingFacet.releaseTokensFor",
    negativeError: "stale beneficiary state rejects VestingFacet.releaseTokensFor preflight",
  },
  {
    key: "VestingFacet.releaseVestedTokens",
    negativeError: "replayed release rejects VestingFacet.releaseVestedTokens preflight",
  },
  {
    key: "VestingFacet.transferVestingSchedule",
    negativeError: "unauthorized beneficiary rejects VestingFacet.transferVestingSchedule preflight",
  },
  {
    key: "VoiceAssetFacet.approveVoiceAsset",
    negativeError: "unauthorized approval rejects VoiceAssetFacet.approveVoiceAsset preflight",
  },
  {
    key: "VoiceAssetFacet.customizeRoyaltyRate",
    negativeError: "stale royalty state rejects VoiceAssetFacet.customizeRoyaltyRate preflight",
  },
  {
    key: "VoiceAssetFacet.lockVoiceAsset",
    negativeError: "replayed lock rejects VoiceAssetFacet.lockVoiceAsset preflight",
  },
  {
    key: "VoiceAssetFacet.recordRoyaltyPayment",
    negativeError: "replayed usage reference rejects VoiceAssetFacet.recordRoyaltyPayment preflight",
  },
  {
    key: "VoiceAssetFacet.recordRoyaltyPaymentFrom",
    negativeError: "unauthorized payer rejects VoiceAssetFacet.recordRoyaltyPaymentFrom preflight",
  },
  {
    key: "VoiceAssetFacet.recordUsage",
    negativeError: "replayed usage reference rejects VoiceAssetFacet.recordUsage preflight",
  },
  {
    key: "VoiceAssetFacet.recordUsageFrom",
    negativeError: "unauthorized caller rejects VoiceAssetFacet.recordUsageFrom preflight",
  },
  {
    key: "VoiceAssetFacet.revokeUser",
    negativeError: "unauthorized revocation rejects VoiceAssetFacet.revokeUser preflight",
  },
  {
    key: "VoiceAssetFacet.setDefaultPlatformFee",
    negativeError: "replayed fee configuration rejects VoiceAssetFacet.setDefaultPlatformFee preflight",
  },
  {
    key: "VoiceAssetFacet.setDefaultRoyaltyRate",
    negativeError: "stale royalty configuration rejects VoiceAssetFacet.setDefaultRoyaltyRate preflight",
  },
  {
    key: "VoiceAssetFacet.setRegistrationPaused",
    negativeError: "replayed pause configuration rejects VoiceAssetFacet.setRegistrationPaused preflight",
  },
  {
    key: "VoiceAssetFacet.unlockVoiceAsset",
    negativeError: "stale lock state rejects VoiceAssetFacet.unlockVoiceAsset preflight",
  },
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
  if (/^u?int/.test(input.type)) return "1";
  throw new Error(`missing fixture value for ${input.type}`);
}

function runtimeValue(input: AbiInput, wireValue: unknown): unknown {
  if (input.type.endsWith("[]")) {
    const itemInput = { ...input, type: input.type.slice(0, -2) };
    return (wireValue as unknown[]).map((item) => runtimeValue(itemInput, item));
  }
  if (input.type.startsWith("tuple")) {
    const tuple = wireValue as Record<string, unknown>;
    return Object.fromEntries((input.components ?? []).map((component) => [
      component.name,
      runtimeValue(component, tuple[component.name]),
    ]));
  }
  if (/^u?int/.test(input.type)) return BigInt(String(wireValue));
  return wireValue;
}

const allDefinitions = [
  ...tokenomicsMethodDefinitions,
  ...voiceAssetsMethodDefinitions,
];

const cases = targets.map((target) => {
  const definition = allDefinitions.find((candidate) => candidate.key === target.key);
  if (!definition) throw new Error(`missing route definition for ${target.key}`);

  const inputs = definition.inputs as AbiInput[];
  if (inputs.length !== definition.inputShape.bindings.length) {
    throw new Error(`route bindings do not align with ABI inputs for ${target.key}`);
  }

  const wireArgs = inputs.map((input) => fixtureValue(input));
  const runtimeArgs = inputs.map((input, index) => runtimeValue(input, wireArgs[index]));
  let path = definition.path;
  const body: Record<string, unknown> = {};
  definition.inputShape.bindings.forEach((binding, index) => {
    const value = wireArgs[index];
    if (binding.source === "path") {
      path = path.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    }
    if (binding.source === "body") {
      body[binding.field] = value;
    }
  });

  return {
    ...target,
    body,
    definition,
    path,
    runtimeArgs,
    wireArgs,
  };
});

const successfulStaticResults: Partial<Record<(typeof targets)[number]["key"], unknown>> = {
  "VestingFacet.releaseTokensFor": 1n,
  "VestingFacet.releaseVestedTokens": 1n,
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
    insert: vi.fn().mockResolvedValue("vesting-voice-asset-request-1"),
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
        label: "vesting and voice asset operator",
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
  app.use(createTokenomicsPrimitiveRouter(context as never));
  app.use(createVoiceAssetsPrimitiveRouter(context as never));
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
    throw new Error("vesting and voice asset fixture server did not bind a TCP port");
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

describe("vesting and voice asset command route preflight safety", () => {
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
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvesting-voice-asset-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(cases)(
    "preflights $key through its mounted workflow route before persistence or send",
    async (testCase) => {
      const preview = successfulStaticResults[testCase.key] ?? null;
      mocks.contractStaticCall.mockResolvedValue(preview);
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await call(port, testCase, "operator-key");
        const payload = await response.json();

        expect(response.status, testCase.key).toBe(202);
        expect(payload).toEqual({
          requestId: "vesting-voice-asset-request-1",
          txHash: "0xvesting-voice-asset-write",
          result: testCase.definition.outputs.length > 0 ? "1" : null,
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
          params: testCase.wireArgs,
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

  it.each(cases)(
    "rejects read-only $key before contract access or mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await call(port, testCase, "read-only-key");

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

  it.each(cases)(
    "rejects stale, replayed, or unauthorized $key preflight without mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.negativeError));
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await call(port, testCase, "operator-key");
        const payload = await response.json() as { error: string; diagnostics?: { cause?: string } };

        expect(response.status, testCase.key).toBe(500);
        expect(payload.error).toContain(testCase.negativeError);
        expect(payload.diagnostics?.cause).toContain(testCase.negativeError);
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.definition.signature, testCase.runtimeArgs);
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
  );
});
