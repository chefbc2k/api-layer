import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatasetsPrimitiveRouter } from "../modules/datasets/primitives/generated/routes.js";
import { datasetsMethodDefinitions } from "../modules/datasets/primitives/generated/mapping.js";
import { createLicensingPrimitiveRouter } from "../modules/licensing/primitives/generated/routes.js";
import { licensingMethodDefinitions } from "../modules/licensing/primitives/generated/mapping.js";
import { createVoiceAssetsPrimitiveRouter } from "../modules/voice-assets/primitives/generated/routes.js";
import { voiceAssetsMethodDefinitions } from "../modules/voice-assets/primitives/generated/mapping.js";

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
    constructor(readonly privateKey: string, readonly provider: unknown) {}
    async getAddress() { return this.address; }
    async sendTransaction(request: unknown) { return mocks.walletSendTransaction(request); }
  }
  class MockContract {
    constructor(readonly address: string, readonly abi: unknown, readonly runner: unknown) {}
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

// Each selected gap is exercised through its real mounted route with an
// authorized preflight, a read-only denial, and an injected contract rejection.
const targetSpecs = [
  {
    key: "VoiceDatasetFacet.burnDataset",
    negativePath: "reject stale dataset ownership or unauthorized burn before mutation",
  },
  {
    key: "VoiceDatasetFacet.setMaxAssetsPerDataset",
    negativePath: "reject unauthorized or stale dataset capacity update before mutation",
  },
  {
    key: "VoiceLicenseFacet.createLicenseWithMarketplace",
    negativePath: "reject stale marketplace template or replayed license creation before mutation",
  },
  {
    key: "VoiceLicenseFacet.issueLicense",
    negativePath: "reject unauthorized issuer or replayed license grant before mutation",
  },
  {
    key: "VoiceLicenseFacet.recordLicensedUsage",
    negativePath: "reject replayed usage reference or unauthorized recorder before mutation",
  },
  {
    key: "VoiceLicenseFacet.updateLicenseTerms",
    negativePath: "reject stale template terms or unauthorized updater before mutation",
  },
  {
    key: "VoiceLicenseFacet.withdrawLicenseRevenue",
    negativePath: "reject replayed withdrawal or unauthorized claimant before mutation",
  },
  {
    key: "VoiceLicenseTemplateFacet.createLicenseFromTemplate",
    negativePath: "reject stale template or replayed template license before mutation",
  },
  {
    key: "VoiceMetadataFacet.setAnalysisVersion",
    negativePath: "reject unauthorized or stale analysis-version update before mutation",
  },
  {
    key: "VoiceMetadataFacet.updateClassificationCategory",
    negativePath: "reject stale voice classification or unauthorized category update before mutation",
  },
  {
    key: "VoiceMetadataFacet.updateGeographicData",
    negativePath: "reject stale voice state or unauthorized geographic update before mutation",
  },
  {
    key: "VoiceMetadataFacet.updateVoiceClassifications",
    negativePath: "reject replayed analysis result or unauthorized classification update before mutation",
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

const allDefinitions = [
  ...datasetsMethodDefinitions,
  ...licensingMethodDefinitions,
  ...voiceAssetsMethodDefinitions,
];

const cases = targetSpecs.map((spec) => {
  const definition = allDefinitions.find((candidate) => candidate.key === spec.key);
  if (!definition) throw new Error(`missing route definition for ${spec.key}`);
  const values = Object.fromEntries((definition.inputs as AbiInput[]).map((input) => [input.name, fixtureValue(input)]));
  let path = definition.path;
  const body: Record<string, unknown> = {};
  for (const binding of definition.inputShape.bindings) {
    const value = values[binding.name];
    if (binding.source === "path") path = path.replace(`:${binding.field}`, encodeURIComponent(String(value)));
    if (binding.source === "body") body[binding.field] = value;
  }
  return { ...spec, definition, path, body };
});

const successfulStaticResults: Partial<Record<(typeof targetSpecs)[number]["key"], unknown>> = {
  "VoiceLicenseTemplateFacet.createLicenseFromTemplate": `0x${"22".repeat(32)}`,
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
      work: (provider: typeof provider, providerName: string) => Promise<unknown>,
    ) => work(provider, "fixture-rpc")),
  };
  const txStore = {
    insert: vi.fn().mockResolvedValue("voice-dataset-license-metadata-request-1"),
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
  return { context, txStore };
}

async function startServer(context: ReturnType<typeof buildContext>["context"]) {
  const app = express();
  app.set("apiExecutionContext", context);
  app.use(express.json());
  app.use(createDatasetsPrimitiveRouter(context as never));
  app.use(createLicensingPrimitiveRouter(context as never));
  app.use(createVoiceAssetsPrimitiveRouter(context as never));
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

describe("voice dataset, license, and metadata command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ "fixture-operator": `0x${"11".repeat(32)}` });
    mocks.contractStaticCall.mockResolvedValue(null);
    mocks.contractPopulateTransaction.mockResolvedValue({ to: diamondAddress, data: "0xfeed" });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xvoice-dataset-license-metadata-write" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) delete process.env.API_LAYER_SIGNER_MAP_JSON;
    else process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
  });

  it.each(cases)("preflights $key through its mounted workflow route before mutation", async (testCase) => {
    mocks.contractStaticCall.mockResolvedValue(successfulStaticResults[testCase.key] ?? null);
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);
    try {
      const response = await call(port, testCase, "operator-key");
      expect(response.status, `${testCase.key}: ${await response.text()}`).toBe(202);
      expect(mocks.contractStaticCall).toHaveBeenCalledOnce();
      expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.definition.signature, expect.any(Array));
      expect(mocks.contractPopulateTransaction).toHaveBeenCalledOnce();
      expect(txStore.insert).toHaveBeenCalledOnce();
      expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({ method: testCase.key, status: "submitting" }));
      expect(mocks.walletSendTransaction).toHaveBeenCalledOnce();
      expect(mocks.contractStaticCall.mock.invocationCallOrder[0]).toBeLessThan(txStore.insert.mock.invocationCallOrder[0]!);
      expect(txStore.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.walletSendTransaction.mock.invocationCallOrder[0]!);
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects read-only access to $key before contract access or mutation", async (testCase) => {
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);
    try {
      const response = await call(port, testCase, "read-only-key");
      expect(response.status, testCase.key).toBe(403);
      expect(mocks.contractStaticCall).not.toHaveBeenCalled();
      expect(mocks.contractPopulateTransaction).not.toHaveBeenCalled();
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it.each(cases)("rejects stale, replayed, or unauthorized $key preflight without mutation", async (testCase) => {
    mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.negativePath));
    const { context, txStore } = buildContext();
    const { server, port } = await startServer(context);
    try {
      const response = await call(port, testCase, "operator-key");
      const payload = await response.json() as { error?: string; diagnostics?: { cause?: string } };
      expect(response.status, testCase.key).toBe(500);
      expect(payload.error).toContain(testCase.negativePath);
      expect(payload.diagnostics?.cause).toContain(testCase.negativePath);
      expect(mocks.contractStaticCall).toHaveBeenCalledOnce();
      expect(txStore.insert).not.toHaveBeenCalled();
      expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });
});
