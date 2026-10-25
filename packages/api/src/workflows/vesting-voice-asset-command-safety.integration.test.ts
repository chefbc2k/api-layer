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

import { tokenomicsMethodDefinitions } from "../modules/tokenomics/primitives/generated/mapping.js";
import { createTokenomicsPrimitiveRouter } from "../modules/tokenomics/primitives/generated/routes.js";
import { licensingMethodDefinitions } from "../modules/licensing/primitives/generated/mapping.js";
import { createLicensingPrimitiveRouter } from "../modules/licensing/primitives/generated/routes.js";
import { voiceAssetsMethodDefinitions } from "../modules/voice-assets/primitives/generated/mapping.js";
import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";
import type { AbiParameter, HttpMethodDefinition } from "../shared/route-types.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const fixtureAccount = "0x00000000000000000000000000000000000000bb";
const secondAccount = "0x00000000000000000000000000000000000000cc";
const thirdAccount = "0x00000000000000000000000000000000000000dd";
const voiceHash = `0x${"44".repeat(32)}`;
const usageReference = `0x${"55".repeat(32)}`;
const usageRef = `0x${"66".repeat(32)}`;
const licenseHash = `0x${"77".repeat(32)}`;
const templateHash = `0x${"88".repeat(32)}`;

const vestingKeys = [
  "VestingFacet.releaseTokensFor",
  "VestingFacet.releaseVestedTokens",
  "VestingFacet.transferVestingSchedule",
] as const;

// Every listed VoiceAsset command is also exercised below through explicit
// unauthorized and stale/replayed rejection paths before any mutation.
const voiceAssetKeys = [
  "VoiceAssetFacet.approveVoiceAsset",
  "VoiceAssetFacet.customizeRoyaltyRate",
  "VoiceAssetFacet.lockVoiceAsset",
  "VoiceAssetFacet.recordRoyaltyPayment",
  "VoiceAssetFacet.recordRoyaltyPaymentFrom",
  "VoiceAssetFacet.recordUsage",
  "VoiceAssetFacet.recordUsageFrom",
  "VoiceAssetFacet.revokeUser",
  "VoiceAssetFacet.setDefaultPlatformFee",
  "VoiceAssetFacet.setDefaultRoyaltyRate",
  "VoiceAssetFacet.setRegistrationPaused",
  "VoiceAssetFacet.unlockVoiceAsset",
] as const;

const licenseTemplateKeys = [
  "VoiceLicenseTemplateFacet.createLicenseFromTemplate",
] as const;

const wireFixtures: Record<string, unknown> = {
  beneficiary: fixtureAccount,
  newBeneficiary: secondAccount,
  to: secondAccount,
  tokenId: "41",
  voiceHash,
  royaltyRate: "750",
  amount: "2500000",
  usageReference,
  usageRef,
  user: thirdAccount,
  caller: thirdAccount,
  fee: "250",
  rate: "750",
  paused: true,
  templateHash,
  customizations: {
    licenseHash,
    duration: "2592000",
    price: "1000000",
    maxUses: "10",
    transferable: true,
    rights: ["commercial", "distribution"],
    restrictions: ["no-resale"],
  },
};

function requiredDefinition(definitions: HttpMethodDefinition[], key: string): HttpMethodDefinition {
  const definition = definitions.find((candidate) => candidate.key === key);
  if (!definition) {
    throw new Error(`missing generated route definition for ${key}`);
  }
  return definition;
}

function requiredFixture(name: string): unknown {
  if (!Object.hasOwn(wireFixtures, name)) {
    throw new Error(`missing mounted-route fixture for ${name}`);
  }
  return wireFixtures[name];
}

function runtimeValue(input: AbiParameter, wireValue: unknown): unknown {
  if (input.type.endsWith("[]")) {
    if (!Array.isArray(wireValue)) {
      throw new Error(`expected fixture array for ${input.type}`);
    }
    return wireValue.map((item) => runtimeValue({ ...input, type: input.type.slice(0, -2) }, item));
  }
  if (input.type.startsWith("tuple")) {
    if (typeof wireValue !== "object" || wireValue === null || Array.isArray(wireValue)) {
      throw new Error(`expected fixture object for ${input.type}`);
    }
    return Object.fromEntries((input.components ?? []).map((component) => [
      component.name,
      runtimeValue(component, (wireValue as Record<string, unknown>)[component.name ?? ""]),
    ]));
  }
  if (/^u?int\d*$/.test(input.type)) {
    return BigInt(String(wireValue));
  }
  return wireValue;
}

function previewFor(definition: HttpMethodDefinition): unknown {
  if (definition.outputs.length === 0) {
    return null;
  }
  if (definition.outputs[0]?.type === "bytes32") {
    return licenseHash;
  }
  return 37n;
}

function buildCommandCase(definition: HttpMethodDefinition) {
  if (definition.inputs.length !== definition.inputShape.bindings.length) {
    throw new Error(`${definition.key} input and HTTP binding counts differ`);
  }

  let path = definition.path;
  const body: Record<string, unknown> = {};
  const query = new URLSearchParams();
  const wireParams = definition.inputShape.bindings.map((binding) => requiredFixture(binding.name));

  definition.inputShape.bindings.forEach((binding, index) => {
    const value = wireParams[index];
    if (binding.source === "path") {
      path = path.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    } else if (binding.source === "query") {
      query.set(binding.field, String(value));
    } else {
      body[binding.field] = value;
    }
  });

  const queryString = query.toString();
  const runtimeArgs = definition.inputs.map((input, index) => runtimeValue(input, wireParams[index]));
  const preview = previewFor(definition);

  return {
    key: definition.key,
    signature: definition.signature,
    method: definition.httpMethod,
    path: queryString ? `${path}?${queryString}` : path,
    body,
    wireParams,
    runtimeArgs,
    preview,
    preflightRejection: `stale or replayed ${definition.key} request rejected`,
  };
}

const vestingVoiceAssetAndLicenseCases = [
  ...vestingKeys.map((key) => buildCommandCase(requiredDefinition(tokenomicsMethodDefinitions, key))),
  ...voiceAssetKeys.map((key) => buildCommandCase(requiredDefinition(voiceAssetsMethodDefinitions, key))),
  ...licenseTemplateKeys.map((key) => buildCommandCase(requiredDefinition(licensingMethodDefinitions, key))),
];

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
  app.use(createLicensingPrimitiveRouter(context as never));
  app.use(createTokenomicsPrimitiveRouter(context as never));
  app.use(createVoiceAssetsPrimitiveRouter(context as never));
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
    throw new Error("vesting and voice asset fixture server did not bind a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

describe("VestingFacet, VoiceAssetFacet, and license-template command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "fixture-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockImplementation((signature: string) => (
      vestingVoiceAssetAndLicenseCases.find((testCase) => testCase.signature === signature)?.preview ?? null
    ));
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

  it.each(vestingVoiceAssetAndLicenseCases)(
    "preflights $key through its generated mounted route before persistence and send",
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
          requestId: "vesting-voice-asset-request-1",
          txHash: "0xvesting-voice-asset-write",
          result: testCase.preview === null ? null : testCase.preview.toString(),
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
          params: testCase.wireParams,
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

  it.each(vestingVoiceAssetAndLicenseCases)(
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

  it.each(vestingVoiceAssetAndLicenseCases)(
    "rejects stale or replayed $key during preflight without persistence or send",
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

        expect(response.status, `${testCase.key}: ${JSON.stringify(payload)}`).toBe(500);
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
