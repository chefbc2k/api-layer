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

import { createDatasetsPrimitiveRouter } from "../modules/datasets/primitives/generated/routes.js";
import { createLicensingPrimitiveRouter } from "../modules/licensing/primitives/generated/routes.js";

const originalSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
const diamondAddress = "0x0000000000000000000000000000000000000001";
const licensee = "0x00000000000000000000000000000000000000bb";
const voiceHash = `0x${"22".repeat(32)}`;
const templateHash = `0x${"33".repeat(32)}`;
const licenseHash = `0x${"44".repeat(32)}`;
const usageReference = `0x${"55".repeat(32)}`;

const datasetAndLicenseWriteCases = [
  {
    key: "VoiceDatasetFacet.burnDataset",
    signature: "burnDataset(uint256)",
    method: "DELETE",
    path: "/v1/datasets/commands/burn-dataset",
    body: { datasetId: "7" },
    runtimeArgs: [7n],
    preview: null,
    negativePath: "stale dataset burn rejected",
  },
  {
    key: "VoiceDatasetFacet.setMaxAssetsPerDataset",
    signature: "setMaxAssetsPerDataset(uint256)",
    method: "PATCH",
    path: "/v1/datasets/commands/set-max-assets-per-dataset",
    body: { maxAssets: "250" },
    runtimeArgs: [250n],
    preview: null,
    negativePath: "unauthorized dataset capacity update rejected",
  },
  {
    key: "VoiceLicenseFacet.createLicenseWithMarketplace",
    signature: "createLicenseWithMarketplace(bytes32,bytes32,uint256,uint256,bool,string)",
    method: "POST",
    path: "/v1/licensing/licenses/create-license-with-marketplace",
    body: {
      voiceHash,
      templateHash,
      price: "125000",
      duration: "2592000",
      transferable: true,
      terms: "commercial narration",
    },
    runtimeArgs: [voiceHash, templateHash, 125_000n, 2_592_000n, true, "commercial narration"],
    preview: null,
    negativePath: "duplicate marketplace license rejected",
  },
  {
    key: "VoiceLicenseFacet.issueLicense",
    signature: "issueLicense(bytes32,address,bytes32,uint256)",
    method: "POST",
    path: "/v1/licensing/licenses/issue-license",
    body: { voiceHash, licensee, templateHash, duration: "604800" },
    runtimeArgs: [voiceHash, licensee, templateHash, 604_800n],
    preview: null,
    negativePath: "unauthorized license issuance rejected",
  },
  {
    key: "VoiceLicenseFacet.recordLicensedUsage",
    signature: "recordLicensedUsage(bytes32,bytes32)",
    method: "POST",
    path: "/v1/licensing/commands/record-licensed-usage",
    body: { voiceHash, usageRef: usageReference },
    runtimeArgs: [voiceHash, usageReference],
    preview: null,
    negativePath: "replayed licensed usage rejected",
  },
  {
    key: "VoiceLicenseFacet.updateLicenseTerms",
    signature: "updateLicenseTerms(bytes32,bytes32,uint256,uint256,string)",
    method: "PATCH",
    path: "/v1/licensing/commands/update-license-terms",
    body: {
      voiceHash,
      templateHash,
      newPrice: "175000",
      newDuration: "5184000",
      newTerms: "updated commercial narration",
    },
    runtimeArgs: [voiceHash, templateHash, 175_000n, 5_184_000n, "updated commercial narration"],
    preview: null,
    negativePath: "stale license terms rejected",
  },
  {
    key: "VoiceLicenseFacet.withdrawLicenseRevenue",
    signature: "withdrawLicenseRevenue()",
    method: "POST",
    path: "/v1/licensing/commands/withdraw-license-revenue",
    body: {},
    runtimeArgs: [],
    preview: null,
    negativePath: "replayed license revenue withdrawal rejected",
  },
  {
    key: "VoiceLicenseTemplateFacet.createLicenseFromTemplate",
    signature: "createLicenseFromTemplate(bytes32,bytes32,(bytes32,uint256,uint256,uint256,bool,string[],string[]))",
    method: "POST",
    path: "/v1/licensing/license-templates/create-license-from-template",
    body: {
      voiceHash,
      templateHash,
      customizations: {
        licenseHash,
        duration: "7776000",
        price: "225000",
        maxUses: "50",
        transferable: false,
        rights: ["commercial", "broadcast"],
        restrictions: ["no-model-training"],
      },
    },
    runtimeArgs: [voiceHash, templateHash, {
      licenseHash,
      duration: 7_776_000n,
      price: 225_000n,
      maxUses: 50n,
      transferable: false,
      rights: ["commercial", "broadcast"],
      restrictions: ["no-model-training"],
    }],
    preview: licenseHash,
    negativePath: "stale license template customization rejected",
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
    insert: vi.fn().mockResolvedValue("dataset-license-safety-request-1"),
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
        label: "dataset and license safety operator",
        signerId: "dataset-license-safety-operator",
        roles: ["operator"],
        allowGasless: false,
      },
      "read-only-key": {
        apiKey: "read-only-key",
        label: "dataset and license safety reader",
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
  app.use(createDatasetsPrimitiveRouter(context as never));
  app.use(createLicensingPrimitiveRouter(context as never));
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
    throw new Error("dataset and license safety fixture server did not bind a TCP port");
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
  testCase: (typeof datasetAndLicenseWriteCases)[number],
  apiKey: "operator-key" | "read-only-key",
) {
  return fetch(`http://127.0.0.1:${port}${testCase.path}`, {
    method: testCase.method,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(testCase.body),
    signal: AbortSignal.timeout(2_500),
  });
}

describe("dataset and license command route preflight safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "dataset-license-safety-operator": `0x${"11".repeat(32)}`,
    });
    mocks.contractStaticCall.mockImplementation((signature: string) => {
      if (signature === "createLicenseFromTemplate(bytes32,bytes32,(bytes32,uint256,uint256,uint256,bool,string[],string[]))") {
        return licenseHash;
      }
      return null;
    });
    mocks.contractPopulateTransaction.mockResolvedValue({
      to: diamondAddress,
      data: "0xfeed",
    });
    mocks.walletSendTransaction.mockResolvedValue({ hash: "0xdataset-license-safety" });
    mocks.readActorStates.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSignerMap === undefined) {
      delete process.env.API_LAYER_SIGNER_MAP_JSON;
    } else {
      process.env.API_LAYER_SIGNER_MAP_JSON = originalSignerMap;
    }
  });

  it.each(datasetAndLicenseWriteCases)(
    "preflights $key through its mounted route before mutation",
    async (testCase) => {
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");
        const payload = await response.json();

        expect(response.status, `${testCase.key}: ${JSON.stringify(payload)}`).toBe(202);
        expect(payload).toEqual({
          requestId: "dataset-license-safety-request-1",
          txHash: "0xdataset-license-safety",
          result: testCase.preview,
        });
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(mocks.contractPopulateTransaction).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
          method: testCase.key,
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

  it.each(datasetAndLicenseWriteCases)(
    "rejects read-only access to $key before preflight or mutation",
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

  it.each(datasetAndLicenseWriteCases)(
    "rejects stale, replayed, or unauthorized $key during preflight without mutation",
    async (testCase) => {
      mocks.contractStaticCall.mockRejectedValueOnce(new Error(testCase.negativePath));
      const { context, txStore } = buildContext();
      const { server, port } = await startServer(context);

      try {
        const response = await invokeCase(port, testCase, "operator-key");
        const payload = await response.json() as { error: string; diagnostics?: { cause?: string } };

        expect(response.status, testCase.key).toBe(500);
        expect(payload.error).toContain(testCase.negativePath);
        expect(payload.diagnostics?.cause).toContain(testCase.negativePath);
        expect(mocks.contractStaticCall).toHaveBeenCalledWith(testCase.signature, testCase.runtimeArgs);
        expect(txStore.insert).not.toHaveBeenCalled();
        expect(mocks.walletSendTransaction).not.toHaveBeenCalled();
      } finally {
        await closeServer(server);
      }
    },
  );
});
