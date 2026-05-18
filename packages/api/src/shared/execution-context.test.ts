import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const invokeRead = vi.fn();
  const queryEvent = vi.fn();
  const validateWireParams = vi.fn();
  const decodeParamsFromWire = vi.fn();
  const serializeResultToWire = vi.fn();
  const submitSmartWalletCall = vi.fn();
  const walletSendTransaction = vi.fn().mockResolvedValue({
    hash: "0xsubmitted",
  });
  const contractStaticCall = vi.fn().mockResolvedValue(["preview-value"]);
  const contractPopulateTransaction = vi.fn().mockResolvedValue({
    to: "0x0000000000000000000000000000000000000001",
    data: "0xfeed",
  });
  const contractGetFunction = vi.fn((_signature: string) => ({
    staticCall: contractStaticCall,
    populateTransaction: contractPopulateTransaction,
  }));
  const buildDebugTransaction = vi.fn().mockImplementation((request, signer) => ({ request, signer }));
  const createAlchemyClient = vi.fn().mockReturnValue({ mocked: true });
  const decodeReceiptLogs = vi.fn().mockReturnValue([]);
  const readActorStates = vi.fn().mockResolvedValue([]);
  const simulateTransactionWithAlchemy = vi.fn().mockResolvedValue({ topLevelCall: {} });
  const traceCallWithAlchemy = vi.fn().mockResolvedValue({ status: "ok" });
  const traceTransactionWithAlchemy = vi.fn().mockResolvedValue({ status: "ok" });
  const loadApiKeys = vi.fn().mockReturnValue({ founderKey: { apiKey: "founder-key" } });
  return {
    invokeRead,
    queryEvent,
    validateWireParams,
    decodeParamsFromWire,
    serializeResultToWire,
    submitSmartWalletCall,
    walletSendTransaction,
    contractStaticCall,
    contractPopulateTransaction,
    contractGetFunction,
    buildDebugTransaction,
    createAlchemyClient,
    decodeReceiptLogs,
    readActorStates,
    simulateTransactionWithAlchemy,
    traceCallWithAlchemy,
    traceTransactionWithAlchemy,
    loadApiKeys,
  };
});

vi.mock("../../../client/src/runtime/invoke.js", () => ({
  invokeRead: mocked.invokeRead,
  queryEvent: mocked.queryEvent,
}));

vi.mock("../../../client/src/runtime/abi-codec.js", () => ({
  validateWireParams: mocked.validateWireParams,
  decodeParamsFromWire: mocked.decodeParamsFromWire,
  serializeResultToWire: mocked.serializeResultToWire,
}));

vi.mock("./cdp-smart-wallet.js", () => ({
  submitSmartWalletCall: mocked.submitSmartWalletCall,
}));

vi.mock("./alchemy-diagnostics.js", () => ({
  buildDebugTransaction: mocked.buildDebugTransaction,
  createAlchemyClient: mocked.createAlchemyClient,
  decodeReceiptLogs: mocked.decodeReceiptLogs,
  readActorStates: mocked.readActorStates,
  simulateTransactionWithAlchemy: mocked.simulateTransactionWithAlchemy,
  traceCallWithAlchemy: mocked.traceCallWithAlchemy,
  traceTransactionWithAlchemy: mocked.traceTransactionWithAlchemy,
}));

vi.mock("./auth.js", () => ({
  loadApiKeys: mocked.loadApiKeys,
}));

vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");

  class MockVoidSigner {
    constructor(
      readonly address: string,
      readonly provider: unknown,
    ) {}
  }

  class MockWallet {
    readonly address: string;
    constructor(
      readonly privateKey: string,
      readonly provider: unknown,
    ) {
      this.address = `wallet:${privateKey}`;
    }

    async getAddress() {
      return this.address;
    }

    async sendTransaction(request: unknown) {
      const response = await mocked.walletSendTransaction(request);
      return {
        request,
        ...response,
      };
    }
  }

  class MockContract {
    constructor(
      readonly address: string,
      readonly abi: unknown,
      readonly runner: unknown,
    ) {}

    getFunction(_signature: string) {
      return mocked.contractGetFunction(_signature);
    }
  }

  return {
    ...actual,
    Contract: MockContract,
    VoidSigner: MockVoidSigner,
    Wallet: MockWallet,
  };
});

import {
  createApiExecutionContext,
  enforceRateLimit,
  executeHttpEventDefinition,
  executeHttpMethodDefinition,
  getTransactionRequest,
  getTransactionStatus,
  resolveBufferedGasLimit,
  resolveRetryNonce,
} from "./execution-context.js";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.API_LAYER_GASLESS_ALLOWLIST;
  delete process.env.API_LAYER_GASLESS_SPEND_CAPS_JSON;
  delete process.env.API_LAYER_SIGNER_MAP_JSON;
  mocked.walletSendTransaction.mockResolvedValue({
    hash: "0xsubmitted",
  });
  mocked.contractStaticCall.mockResolvedValue(["preview-value"]);
  mocked.contractPopulateTransaction.mockResolvedValue({
    to: "0x0000000000000000000000000000000000000001",
    data: "0xfeed",
  });
  mocked.contractGetFunction.mockImplementation((_signature: string) => ({
    staticCall: mocked.contractStaticCall,
    populateTransaction: mocked.contractPopulateTransaction,
  }));
  mocked.buildDebugTransaction.mockImplementation((request, signer) => ({ request, signer }));
  mocked.createAlchemyClient.mockReturnValue({ mocked: true });
  mocked.decodeReceiptLogs.mockReturnValue([]);
  mocked.readActorStates.mockResolvedValue([]);
  mocked.simulateTransactionWithAlchemy.mockResolvedValue({ topLevelCall: {} });
  mocked.traceCallWithAlchemy.mockResolvedValue({ status: "ok" });
  mocked.traceTransactionWithAlchemy.mockResolvedValue({ status: "ok" });
  mocked.loadApiKeys.mockReturnValue({ founderKey: { apiKey: "founder-key" } });
});

function buildReadDefinition(overrides: Record<string, unknown> = {}) {
  return {
    key: "Facet.readMethod",
    facetName: "VoiceAssetFacet",
    wrapperKey: "readMethod",
    methodName: "readMethod",
    signature: "readMethod()",
    category: "read",
    mutability: "view",
    liveRequired: false,
    cacheClass: "none",
    cacheTtlSeconds: null,
    executionSources: ["auto", "live", "cache"],
    gaslessModes: [],
    inputs: [],
    outputs: [{ type: "uint256" }],
    domain: "test",
    resource: "test",
    classification: "read",
    httpMethod: "GET",
    path: "/read",
    inputShape: { kind: "none", bindings: [] },
    outputShape: { kind: "scalar" },
    operationId: "readMethod",
    rateLimitKind: "read",
    supportsGasless: false,
    notes: "",
    ...overrides,
  };
}

function buildWriteDefinition(overrides: Record<string, unknown> = {}) {
  return {
    ...buildReadDefinition({
      key: "VoiceAssetFacet.setApprovalForAll",
      facetName: "VoiceAssetFacet",
      wrapperKey: "setApprovalForAll",
      methodName: "setApprovalForAll",
      signature: "setApprovalForAll",
      category: "write",
      mutability: "nonpayable",
      executionSources: ["auto", "live", "indexed"],
      gaslessModes: ["signature", "cdpSmartWallet"],
      inputs: [
        { type: "address" },
        { type: "bool" },
      ],
      outputs: [{ type: "bool" }],
      httpMethod: "POST",
      path: "/write",
      outputShape: { kind: "scalar" },
      operationId: "delegate",
      rateLimitKind: "write",
      supportsGasless: true,
    }),
    ...overrides,
  };
}

function buildContext(overrides: Record<string, unknown> = {}) {
  return {
    addressBook: {
      resolveFacetAddress: vi.fn().mockReturnValue("0x0000000000000000000000000000000000000001"),
      toJSON: vi.fn().mockReturnValue({ diamond: "0x0000000000000000000000000000000000000001" }),
    },
    cache: {},
    providerRouter: {
      withProvider: vi.fn().mockImplementation(async (_kind: string, _label: string, work: (provider: unknown, providerName: string) => Promise<unknown>) => {
        const provider = {
          getTransactionReceipt: vi.fn().mockResolvedValue(null),
          getTransactionCount: vi.fn().mockResolvedValue(4),
          estimateGas: vi.fn().mockResolvedValue(50_000n),
        };
        return work(provider, "primary");
      }),
    },
    config: {
      alchemyDiagnosticsEnabled: false,
      alchemySimulationEnabled: false,
      alchemySimulationEnforced: false,
      alchemyEndpointDetected: false,
      alchemyRpcUrl: "https://alchemy.example",
      alchemySimulationBlock: "latest",
      alchemyTraceTimeout: 5_000,
    },
    alchemy: null,
    rateLimiter: {
      enforce: vi.fn().mockResolvedValue(undefined),
    },
    txStore: {
      insert: vi.fn().mockResolvedValue("req-1"),
      update: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ id: "req-1" }),
    },
    signerRunners: new Map(),
    signerQueues: new Map(),
    signerNonces: new Map(),
    ...overrides,
  };
}

function buildRequest(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      apiKey: "founder-key",
      label: "founder",
      signerId: "founder",
      allowGasless: true,
      roles: ["service"],
    },
    api: {
      gaslessMode: "none",
      executionSource: "auto",
    },
    walletAddress: "0x00000000000000000000000000000000000000aa",
    wireParams: [],
    ...overrides,
  };
}

describe("resolveBufferedGasLimit", () => {
  it("buffers a populated gasLimit without re-estimating", async () => {
    const provider = {
      estimateGas: vi.fn(),
    };

    const gasLimit = await resolveBufferedGasLimit(
      provider,
      {
        to: "0x0000000000000000000000000000000000000001",
        gasLimit: 100_000n,
      },
      "0x0000000000000000000000000000000000000002",
    );

    expect(gasLimit).toBe(170_000n);
    expect(provider.estimateGas).not.toHaveBeenCalled();
  });

  it("estimates gas when missing and includes the signer as from", async () => {
    const provider = {
      estimateGas: vi.fn().mockResolvedValue(200_000n),
    };

    const gasLimit = await resolveBufferedGasLimit(
      provider,
      {
        to: "0x0000000000000000000000000000000000000001",
        data: "0x1234",
      },
      "0x0000000000000000000000000000000000000002",
    );

    expect(provider.estimateGas).toHaveBeenCalledWith({
      to: "0x0000000000000000000000000000000000000001",
      data: "0x1234",
      from: "0x0000000000000000000000000000000000000002",
    });
    expect(gasLimit).toBe(290_000n);
  });
});

describe("resolveRetryNonce", () => {
  it("advances beyond both pending and local nonce tracking on the first retry", () => {
    expect(resolveRetryNonce(7, 7)).toBe(8);
    expect(resolveRetryNonce(7, 9)).toBe(10);
  });

  it("keeps advancing monotonically across repeated nonce-expired retries", () => {
    const firstRetryNonce = resolveRetryNonce(12, 12);
    const secondRetryNonce = resolveRetryNonce(12, firstRetryNonce, firstRetryNonce);
    const thirdRetryNonce = resolveRetryNonce(13, secondRetryNonce, secondRetryNonce);

    expect(firstRetryNonce).toBe(13);
    expect(secondRetryNonce).toBe(14);
    expect(thirdRetryNonce).toBe(15);
  });
});

describe("enforceRateLimit", () => {
  it("uses read, write, and gasless buckets for API-key and wallet throttles", async () => {
    const context = {
      rateLimiter: {
        enforce: vi.fn().mockResolvedValue(undefined),
      },
    };
    const auth = { apiKey: "read-key" };

    await enforceRateLimit(context as never, { rateLimitKind: "read" }, auth as never, { gaslessMode: "none", executionSource: "auto" });
    await enforceRateLimit(context as never, { rateLimitKind: "write" }, auth as never, { gaslessMode: "none", executionSource: "auto" }, "0xabc");
    await enforceRateLimit(context as never, { rateLimitKind: "write" }, auth as never, { gaslessMode: "signature", executionSource: "auto" }, "0xdef");

    expect(context.rateLimiter.enforce.mock.calls).toEqual([
      ["read", "read-key"],
      ["write", "read-key"],
      ["write", "read-key:0xabc"],
      ["gasless", "read-key"],
      ["gasless", "read-key:0xdef"],
    ]);
  });
});

describe("getTransactionStatus", () => {
  it("decodes logs and traces Alchemy receipts when diagnostics are enabled", async () => {
    const receipt = {
      logs: [{ address: "0x0000000000000000000000000000000000000001" }],
      status: 1,
    };
    mocked.decodeReceiptLogs.mockReturnValueOnce([{ eventName: "AssetRegistered" }]);
    mocked.traceTransactionWithAlchemy.mockResolvedValueOnce({ status: "ok", steps: 1 });
    const context = {
      alchemy: {
        core: {
          getTransactionReceipt: vi.fn().mockResolvedValue(receipt),
        },
      },
      config: {
        alchemyDiagnosticsEnabled: true,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
        alchemyTraceTimeout: 7_500,
      },
    };

    await expect(getTransactionStatus(context as never, "0xtx")).resolves.toEqual({
      source: "alchemy",
      receipt: {
        logs: [{ address: "0x0000000000000000000000000000000000000001" }],
        status: 1,
      },
      diagnostics: {
        alchemy: {
          enabled: true,
          simulationEnabled: true,
          simulationEnforced: false,
          endpointDetected: true,
          rpcUrl: "https://alchemy.example",
          available: true,
        },
        decodedLogs: [{ eventName: "AssetRegistered" }],
        trace: { status: "ok", steps: 1 },
      },
    });

    expect(mocked.decodeReceiptLogs).toHaveBeenCalledWith({ logs: receipt.logs });
    expect(mocked.traceTransactionWithAlchemy).toHaveBeenCalledWith(context.alchemy, "0xtx", 7_500);
  });

  it("returns Alchemy-backed status when diagnostics are available", async () => {
    const context = {
      alchemy: {
        core: {
          getTransactionReceipt: vi.fn().mockResolvedValue(null),
        },
      },
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
      },
    };

    await expect(getTransactionStatus(context as never, "0xtx")).resolves.toEqual({
      source: "alchemy",
      receipt: null,
      diagnostics: {
        alchemy: {
          enabled: false,
          simulationEnabled: true,
          simulationEnforced: false,
          endpointDetected: true,
          rpcUrl: "https://alchemy.example",
          available: true,
        },
        decodedLogs: [],
        trace: { status: "disabled" },
      },
    });
  });

  it("falls back to the provider router when no Alchemy client exists", async () => {
    const context = {
      alchemy: null,
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_kind: string, _label: string, work: (provider: unknown) => Promise<unknown>) => {
          const provider = {
            getTransactionReceipt: vi.fn().mockResolvedValue(null),
          };
          return work(provider);
        }),
      },
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: false,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: false,
        alchemyRpcUrl: "https://alchemy.example",
      },
    };

    await expect(getTransactionStatus(context as never, "0xtx")).resolves.toEqual({
      source: "rpc",
      receipt: null,
      diagnostics: {
        alchemy: {
          enabled: false,
          simulationEnabled: false,
          simulationEnforced: false,
          endpointDetected: false,
          rpcUrl: "https://alchemy.example",
          available: false,
        },
        decodedLogs: [],
        trace: { status: "disabled" },
      },
    });
    expect(context.providerRouter.withProvider).toHaveBeenCalledWith("read", "tx.status", expect.any(Function));
  });

  it("decodes rpc receipt logs when falling back from Alchemy", async () => {
    const receipt = {
      logs: [{ address: "0x0000000000000000000000000000000000000009" }],
      status: 1,
    };
    mocked.decodeReceiptLogs.mockReturnValueOnce([{ eventName: "FallbackDecoded" }]);
    const context = {
      alchemy: null,
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_kind: string, _label: string, work: (provider: unknown) => Promise<unknown>) => {
          const provider = {
            getTransactionReceipt: vi.fn().mockResolvedValue(receipt),
          };
          return work(provider);
        }),
      },
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: false,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: false,
        alchemyRpcUrl: "https://alchemy.example",
      },
    };

    await expect(getTransactionStatus(context as never, "0xtx")).resolves.toEqual({
      source: "rpc",
      receipt,
      diagnostics: {
        alchemy: {
          enabled: false,
          simulationEnabled: false,
          simulationEnforced: false,
          endpointDetected: false,
          rpcUrl: "https://alchemy.example",
          available: false,
        },
        decodedLogs: [{ eventName: "FallbackDecoded" }],
        trace: { status: "disabled" },
      },
    });

    expect(mocked.decodeReceiptLogs).toHaveBeenCalledWith(receipt);
  });
});

describe("executeHttpMethodDefinition", () => {
  it("rejects invalid execution sources before any downstream work", async () => {
    const definition = buildReadDefinition({ liveRequired: true });
    const request = buildRequest({ api: { gaslessMode: "none", executionSource: "cache" } });

    await expect(executeHttpMethodDefinition(buildContext() as never, definition as never, request as never)).rejects.toThrow(
      "Facet.readMethod requires live chain execution; cached or indexed execution is not allowed",
    );
    expect(mocked.validateWireParams).toHaveBeenCalledWith(definition, []);
  });

  it("rejects unsupported indexed and gasless modes", async () => {
    const definition = buildWriteDefinition({ gaslessModes: ["signature"] });

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        definition as never,
        buildRequest({
          api: { gaslessMode: "none", executionSource: "indexed" },
          wireParams: ["0x0000000000000000000000000000000000000001"],
        }) as never,
      ),
    ).rejects.toThrow("VoiceAssetFacet.setApprovalForAll indexed execution is not implemented");

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        definition as never,
        buildRequest({
          auth: { apiKey: "founder-key", label: "founder", signerId: "founder", allowGasless: false, roles: ["service"] },
          api: { gaslessMode: "signature", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001"],
        }) as never,
      ),
    ).rejects.toThrow("API key not permitted for gasless execution");

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        definition as never,
        buildRequest({
          api: { gaslessMode: "cdpSmartWallet", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001"],
        }) as never,
      ),
    ).rejects.toThrow("VoiceAssetFacet.setApprovalForAll does not allow gaslessMode=cdpSmartWallet");
  });

  it("rejects execution sources that are outside the declared route allowlist", async () => {
    const definition = buildReadDefinition({
      executionSources: ["auto", "live"],
      liveRequired: false,
    });

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        definition as never,
        buildRequest({
          api: { gaslessMode: "none", executionSource: "cache" },
        }) as never,
      ),
    ).rejects.toThrow("Facet.readMethod does not allow executionSource=cache");
  });

  it("uses invokeRead for view methods and serializes the result", async () => {
    const definition = buildReadDefinition();
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce([]);
    mocked.invokeRead.mockResolvedValueOnce(9n);
    mocked.serializeResultToWire.mockReturnValueOnce("9");

    await expect(
      executeHttpMethodDefinition(context as never, definition as never, buildRequest() as never),
    ).resolves.toEqual({
      statusCode: 200,
      body: "9",
    });

    expect(mocked.invokeRead).toHaveBeenCalledWith(
      expect.objectContaining({
        addressBook: context.addressBook,
        providerRouter: context.providerRouter,
        cache: context.cache,
        executionSource: "auto",
      }),
      "VoiceAssetFacet",
      "readMethod",
      [],
      false,
      null,
    );
    expect(mocked.serializeResultToWire).toHaveBeenCalledWith(definition, 9n);
  });

  it("omits signerFactory for reads without signer or wallet context", async () => {
    const definition = buildReadDefinition();
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce([]);
    mocked.invokeRead.mockResolvedValueOnce("plain-provider-read");
    mocked.serializeResultToWire.mockReturnValueOnce("plain-provider-read");

    await expect(
      executeHttpMethodDefinition(
        context as never,
        definition as never,
        buildRequest({
          auth: { apiKey: "read-key", label: "reader", allowGasless: false, roles: ["service"] },
          walletAddress: undefined,
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: "plain-provider-read",
    });

    expect(mocked.invokeRead).toHaveBeenCalledWith(
      expect.objectContaining({
        signerFactory: undefined,
      }),
      "VoiceAssetFacet",
      "readMethod",
      [],
      false,
      null,
    );
  });

  it("continues write submission after a previously rejected signer queue entry", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0x" + "11".repeat(32) });
    const context = buildContext();
    context.signerQueues.set("founder:primary", Promise.reject(new Error("prior failure")).catch(() => undefined));
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValueOnce(true);

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        txHash: "0xsubmitted",
        result: true,
      },
    });
  });

  it("uses a wallet-backed signerFactory for wallet-scoped reads", async () => {
    const definition = buildReadDefinition();
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce([]);
    mocked.invokeRead.mockImplementationOnce(async (runtime) => {
      const runner = await runtime.signerFactory?.({ name: "provider" });
      return runner;
    });
    mocked.serializeResultToWire.mockReturnValueOnce("ok");

    await expect(
      executeHttpMethodDefinition(
        context as never,
        definition as never,
        buildRequest({
          auth: { apiKey: "reader-key", label: "reader", allowGasless: false, roles: ["service"] },
          walletAddress: "0x00000000000000000000000000000000000000bb",
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: "ok",
    });

    const walletRunner = mocked.serializeResultToWire.mock.calls[0]?.[1];
    const { VoidSigner } = await import("ethers");
    expect(walletRunner).toBeInstanceOf(VoidSigner);
    expect(walletRunner).toMatchObject({
      address: "0x00000000000000000000000000000000000000bb",
    });
  });

  it("uses signer-backed reads when the API key maps to a private key", async () => {
    const definition = buildReadDefinition();
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce([]);
    mocked.invokeRead.mockImplementationOnce(async (runtime) => {
      const runner = await runtime.signerFactory?.({ name: "provider" });
      return runner;
    });
    mocked.serializeResultToWire.mockReturnValueOnce("signer-read");
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        definition as never,
        buildRequest({
          walletAddress: undefined,
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: "signer-read",
    });

    const signerRunner = mocked.serializeResultToWire.mock.calls.at(-1)?.[1];
    expect(signerRunner).toMatchObject({
      address: "wallet:0xabc",
    });
    expect(context.signerRunners.get("founder:read")).toBe(signerRunner);
  });

  it("reuses cached signer runners for repeated signer-backed reads on the same provider", async () => {
    const definition = buildReadDefinition();
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValue([]);
    mocked.invokeRead.mockImplementation(async (runtime) => runtime.signerFactory?.({ name: "provider" } as never));
    mocked.serializeResultToWire
      .mockReturnValueOnce("signer-read-one")
      .mockReturnValueOnce("signer-read-two");
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        definition as never,
        buildRequest({ walletAddress: undefined }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: "signer-read-one",
    });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        definition as never,
        buildRequest({ walletAddress: undefined }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: "signer-read-two",
    });

    const firstRunner = mocked.serializeResultToWire.mock.calls[0]?.[1];
    const secondRunner = mocked.serializeResultToWire.mock.calls[1]?.[1];
    expect(firstRunner).toBe(secondRunner);
    expect(context.signerRunners.size).toBe(1);
  });

  it("falls back to the provider runner when signer resolution fails for a read without a wallet", async () => {
    const definition = buildReadDefinition();
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce([]);
    mocked.invokeRead.mockImplementationOnce(async (runtime) => {
      const provider = { name: "provider-fallback" };
      return runtime.signerFactory?.(provider as never);
    });
    mocked.serializeResultToWire.mockReturnValueOnce("provider-read");

    await expect(
      executeHttpMethodDefinition(
        context as never,
        definition as never,
        buildRequest({
          walletAddress: undefined,
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: "provider-read",
    });

    expect(mocked.serializeResultToWire.mock.calls.at(-1)?.[1]).toEqual({
      name: "provider-fallback",
    });
  });

  it("rejects writes without a signer for direct submission", async () => {
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", 1n]);

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          auth: { apiKey: "read-key", label: "reader", allowGasless: true, roles: ["service"] },
          api: { gaslessMode: "none", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001"],
        }) as never,
      ),
    ).rejects.toThrow("write method VoiceAssetFacet.setApprovalForAll requires signerFactory");
  });

  it("rejects direct writes when the auth context omits signer identity", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      founder: "0x" + "11".repeat(32),
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          auth: {
            apiKey: "founder-key",
            label: "founder",
            signerId: undefined,
            allowGasless: false,
            roles: ["service"],
          },
          api: { gaslessMode: "none", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toThrow("write method VoiceAssetFacet.setApprovalForAll requires signerFactory");
  });

  it("rejects signature-relay writes without a signer during final submission", async () => {
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.contractStaticCall.mockResolvedValueOnce([true]);
    mocked.serializeResultToWire.mockReturnValueOnce(true);

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          auth: { apiKey: "reader-key", label: "reader", allowGasless: true, roles: ["service"] },
          api: { gaslessMode: "signature", executionSource: "auto" },
          walletAddress: "0x00000000000000000000000000000000000000bb",
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toThrow("write method VoiceAssetFacet.setApprovalForAll requires signerFactory");
  });

  it("uses the provider runner for preview-only writes when neither signer nor wallet context is available", async () => {
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.contractStaticCall.mockResolvedValueOnce([true]);

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          auth: { apiKey: "reader-key", label: "reader", allowGasless: true, roles: ["service"] },
          api: { gaslessMode: "signature", executionSource: "auto" },
          walletAddress: undefined,
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toThrow("write method VoiceAssetFacet.setApprovalForAll requires signerFactory");

    expect(mocked.contractStaticCall).toHaveBeenCalledWith("0x0000000000000000000000000000000000000001", true);
  });

  it("wraps missing signer-key preview failures with null write diagnostics", async () => {
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          walletAddress: undefined,
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "missing private key for signer founder",
      diagnostics: expect.objectContaining({
        signer: null,
        provider: null,
        actors: [],
        trace: { status: "disabled" },
      }),
    });
  });

  it("enforces the cdp smart-wallet allowlist and spend cap after preview", async () => {
    mocked.decodeParamsFromWire.mockReturnValue(["0x0000000000000000000000000000000000000001", true]);

    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    process.env.API_LAYER_GASLESS_ALLOWLIST = "SomeOtherFacet.other";
    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          api: { gaslessMode: "cdpSmartWallet", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toThrow("gasless smart-wallet action not allowlisted: VoiceAssetFacet.setApprovalForAll");

    process.env.API_LAYER_GASLESS_ALLOWLIST = "VoiceAssetFacet.setApprovalForAll";
    process.env.API_LAYER_GASLESS_SPEND_CAPS_JSON = JSON.stringify({ "VoiceAssetFacet.setApprovalForAll": "1" });
    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          api: { gaslessMode: "cdpSmartWallet", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toThrow("non-zero spend caps are not yet supported for VoiceAssetFacet.setApprovalForAll");

    process.env.API_LAYER_GASLESS_SPEND_CAPS_JSON = JSON.stringify({ "SomeOtherFacet.other": "7" });
    mocked.submitSmartWalletCall.mockResolvedValueOnce({
      userOperationHash: "0xuserop-zero-cap",
      status: "submitted",
    });

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          api: { gaslessMode: "cdpSmartWallet", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toMatchObject({
      statusCode: 202,
      body: {
        relay: {
          userOperationHash: "0xuserop-zero-cap",
        },
      },
    });
  });

  it("submits cdp smart-wallet requests and persists relay metadata", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValue(true);
    mocked.submitSmartWalletCall.mockResolvedValueOnce({
      userOperationHash: "0xuserop",
      status: "submitted",
    });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    process.env.API_LAYER_GASLESS_ALLOWLIST = "VoiceAssetFacet.setApprovalForAll";

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          api: { gaslessMode: "cdpSmartWallet", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        relay: {
          userOperationHash: "0xuserop",
          status: "submitted",
        },
        result: true,
      },
    });

    expect(context.txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: "queued",
      relayMode: "cdpSmartWallet",
      apiKeyLabel: "founder",
    }));
    expect(mocked.submitSmartWalletCall).toHaveBeenCalledWith({
      to: "0x0000000000000000000000000000000000000001",
      data: expect.any(String),
      value: "0x0",
    });
    expect(context.txStore.update).toHaveBeenCalledWith("req-1", expect.objectContaining({
      status: "submitted",
      requestHash: "0xuserop",
    }));
  });

  it("returns null request ids for cdp smart-wallet submissions when persistence is skipped", async () => {
    const context = buildContext({
      txStore: {
        insert: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
      },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.submitSmartWalletCall.mockResolvedValueOnce({
      userOperationHash: "0xuserop",
      status: "submitted",
    });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    process.env.API_LAYER_GASLESS_ALLOWLIST = "VoiceAssetFacet.setApprovalForAll";

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition({
          outputs: [],
        }) as never,
        buildRequest({
          api: { gaslessMode: "cdpSmartWallet", executionSource: "auto" },
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: null,
        relay: {
          userOperationHash: "0xuserop",
          status: "submitted",
        },
        result: null,
      },
    });

    expect(context.txStore.update).not.toHaveBeenCalled();
  });

  it("falls back to the canonical ABI signature when the manifest signature is rejected", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce([
      [{ owner: "0x0000000000000000000000000000000000000001", enabled: true }],
    ]);
    mocked.serializeResultToWire.mockReturnValue(false);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    mocked.contractGetFunction
      .mockImplementationOnce(() => {
        throw new Error("invalid function fragment");
      })
      .mockImplementation((_signature: string) => ({
        staticCall: mocked.contractStaticCall,
        populateTransaction: mocked.contractPopulateTransaction,
      }));

    await executeHttpMethodDefinition(
      context as never,
      buildWriteDefinition({
        signature: "setOperators(tuple[])",
        methodName: "setOperators",
        inputs: [{
          type: "tuple[]",
          components: [
            { name: "owner", type: "address" },
            { name: "enabled", type: "bool" },
          ],
        }],
      }) as never,
      buildRequest({
        wireParams: [[{ owner: "0x0000000000000000000000000000000000000001", enabled: true }]],
      }) as never,
    );

    expect(mocked.contractGetFunction).toHaveBeenCalledWith("setOperators(tuple[])");
    expect(mocked.contractGetFunction).toHaveBeenCalledWith("setOperators((address,bool)[])");
  });

  it("rethrows non-fragment contract lookup failures without canonical fallback", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0x" + "11".repeat(32) });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.contractGetFunction.mockImplementation(() => {
      throw new Error("resolver exploded");
    });

    await expect(
      executeHttpMethodDefinition(
        buildContext() as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toThrow("resolver exploded");

    expect(mocked.contractGetFunction).toHaveBeenCalledWith("setApprovalForAll");
    expect(mocked.contractGetFunction).not.toHaveBeenCalledWith("setApprovalForAll(address,bool)");
  });

  it("submits direct writes and stores the tx hash", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValue(false);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        txHash: "0xsubmitted",
        result: false,
      },
    });

    expect(context.txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: "submitting",
      relayMode: "direct",
    }));
    expect(context.txStore.update).toHaveBeenCalledWith("req-1", expect.objectContaining({
      status: "submitted",
      txHash: "0xsubmitted",
    }));
  });

  it("preserves submissions that return no transaction hash", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValueOnce(false);
    mocked.walletSendTransaction.mockResolvedValueOnce({ status: "pending" });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        txHash: undefined,
        result: false,
      },
    });

    expect(context.txStore.update).toHaveBeenCalledWith("req-1", expect.objectContaining({
      status: "submitted",
      txHash: undefined,
      responsePayload: { request: expect.any(Object), status: "pending" },
    }));
  });

  it("marks signature-mode writes as relaying-signature before direct submission", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValueOnce(false);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          api: { gaslessMode: "signature", executionSource: "auto" },
          walletAddress: "0x00000000000000000000000000000000000000aa",
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        txHash: "0xsubmitted",
        result: false,
      },
    });

    expect(context.txStore.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: "relaying-signature",
      relayMode: "signature",
    }));
  });

  it("returns null previews for write methods without outputs", async () => {
    const context = buildContext({
      txStore: {
        insert: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
      },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition({
          outputs: [],
        }) as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: null,
        txHash: "0xsubmitted",
        result: null,
      },
    });

    expect(context.txStore.update).not.toHaveBeenCalled();
  });

  it("retries nonce-expired submissions and advances the local nonce", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValue(false);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    mocked.walletSendTransaction
      .mockRejectedValueOnce(new Error("nonce too low"))
      .mockResolvedValueOnce({ hash: "0xretried" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        txHash: "0xretried",
        result: false,
      },
    });

    expect(mocked.walletSendTransaction).toHaveBeenCalledTimes(2);
    expect(context.signerNonces.get("founder:primary")).toBe(6);
  });

  it("fails after exhausting nonce-expired retries and returns the last retry diagnostics", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    mocked.walletSendTransaction
      .mockRejectedValueOnce(new Error("nonce too low"))
      .mockRejectedValueOnce(new Error("replacement transaction underpriced"))
      .mockRejectedValueOnce(new Error("already known"));

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "already known",
      diagnostics: expect.objectContaining({
        signer: "wallet:0xabc",
        provider: "primary",
        cause: "already known",
      }),
    });

    expect(mocked.walletSendTransaction).toHaveBeenCalledTimes(3);
    expect(context.signerNonces.get("founder:primary")).toBe(7);
  });

  it("surfaces primitive nonce-expired failures after all retries are exhausted", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });
    mocked.walletSendTransaction
      .mockRejectedValueOnce("nonce expired")
      .mockRejectedValueOnce("replacement fee too low")
      .mockRejectedValueOnce("already known");

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "already known",
      diagnostics: expect.objectContaining({
        cause: "already known",
      }),
    });
  });

  it("wraps non-nonce submission failures with failure diagnostics and simulation output", async () => {
    const context = buildContext({
      config: {
        alchemyDiagnosticsEnabled: true,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
        alchemySimulationBlock: "latest",
        alchemyTraceTimeout: 5_000,
      },
      alchemy: { mocked: true },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.simulateTransactionWithAlchemy.mockResolvedValueOnce({ topLevelCall: { gasUsed: "123" } });
    mocked.traceCallWithAlchemy.mockResolvedValueOnce({ status: "failed", reason: "execution reverted" });
    mocked.readActorStates.mockResolvedValueOnce([{ address: "wallet:0xabc", nonce: "4" }]);
    mocked.walletSendTransaction.mockRejectedValueOnce(new Error("execution reverted"));
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "execution reverted",
      diagnostics: expect.objectContaining({
        signer: "wallet:0xabc",
        provider: "primary",
        simulation: { topLevelCall: { gasUsed: "123" } },
        trace: { status: "failed", reason: "execution reverted" },
        actors: [{ address: "wallet:0xabc", nonce: "4" }],
      }),
    });
  });

  it("wraps primitive submission failures without simulation payloads", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.walletSendTransaction.mockRejectedValueOnce("plain failure");
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "plain failure",
      diagnostics: expect.objectContaining({
        cause: "plain failure",
        trace: { status: "disabled" },
      }),
    });
  });

  it("blocks writes when enforced Alchemy simulation reports an error", async () => {
    const context = buildContext({
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: true,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
        alchemySimulationBlock: "latest",
        alchemyTraceTimeout: 5_000,
      },
      alchemy: { mocked: true },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.simulateTransactionWithAlchemy.mockResolvedValueOnce({
      topLevelCall: { error: "simulation reverted" },
    });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "simulation reverted",
      diagnostics: expect.objectContaining({
        signer: "wallet:0xabc",
        provider: "primary",
        simulation: { topLevelCall: { error: "simulation reverted" } },
      }),
    });

    expect(mocked.walletSendTransaction).not.toHaveBeenCalled();
  });

  it("continues enforced writes when Alchemy returns an empty simulation error field", async () => {
    const context = buildContext({
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: true,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
        alchemySimulationBlock: "latest",
        alchemyTraceTimeout: 5_000,
      },
      alchemy: { mocked: true },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.serializeResultToWire.mockReturnValueOnce(false);
    mocked.simulateTransactionWithAlchemy.mockResolvedValueOnce({
      topLevelCall: { error: undefined },
    });
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).resolves.toEqual({
      statusCode: 202,
      body: {
        requestId: "req-1",
        txHash: "0xsubmitted",
        result: false,
      },
    });

    expect(mocked.walletSendTransaction).toHaveBeenCalledTimes(1);
  });

  it("preserves simulation diagnostics when nonce retries are exhausted", async () => {
    const context = buildContext({
      config: {
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: true,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
        alchemySimulationBlock: "latest",
        alchemyTraceTimeout: 5_000,
      },
      alchemy: { mocked: true },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.simulateTransactionWithAlchemy.mockResolvedValueOnce({ topLevelCall: { gasUsed: "999" } });
    mocked.walletSendTransaction
      .mockRejectedValueOnce(new Error("nonce too low"))
      .mockRejectedValueOnce(new Error("replacement transaction underpriced"))
      .mockRejectedValueOnce(new Error("already known"));
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ founder: "0xabc" });

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "already known",
      diagnostics: expect.objectContaining({
        simulation: { topLevelCall: { gasUsed: "999" } },
        cause: "already known",
      }),
    });
  });

  it("wraps preview failures with diagnostics and wallet fallback context", async () => {
    const context = buildContext({
      config: {
        alchemyDiagnosticsEnabled: true,
        alchemySimulationEnabled: false,
        alchemySimulationEnforced: false,
        alchemyEndpointDetected: true,
        alchemyRpcUrl: "https://alchemy.example",
        alchemySimulationBlock: "latest",
        alchemyTraceTimeout: 5_000,
      },
      alchemy: { mocked: true },
    });
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.contractStaticCall.mockRejectedValueOnce(new Error("preview reverted"));

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          auth: { apiKey: "reader-key", label: "reader", allowGasless: true, roles: ["service"] },
          api: { gaslessMode: "signature", executionSource: "auto" },
          walletAddress: "0x00000000000000000000000000000000000000aa",
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "preview reverted",
      diagnostics: expect.objectContaining({
        signer: "0x00000000000000000000000000000000000000aa",
        provider: null,
        trace: { status: "disabled" },
      }),
    });
  });

  it("preserves preview diagnostics when signer preparation also fails", async () => {
    const context = buildContext();
    mocked.decodeParamsFromWire.mockReturnValueOnce(["0x0000000000000000000000000000000000000001", true]);
    mocked.contractStaticCall.mockRejectedValueOnce(new Error("preview reverted"));

    await expect(
      executeHttpMethodDefinition(
        context as never,
        buildWriteDefinition() as never,
        buildRequest({
          wireParams: ["0x0000000000000000000000000000000000000001", true],
        }) as never,
      ),
    ).rejects.toMatchObject({
      message: "missing private key for signer founder",
      diagnostics: expect.objectContaining({
        provider: null,
        signer: "0x00000000000000000000000000000000000000aa",
        cause: "missing private key for signer founder",
      }),
    });
  });
});

describe("executeHttpEventDefinition", () => {
  it("queries events and normalizes bigint payloads", async () => {
    mocked.queryEvent.mockResolvedValueOnce([
      { amount: 3n, holder: "0x0000000000000000000000000000000000000003" },
    ]);

    await expect(
      executeHttpEventDefinition(
        buildContext() as never,
        {
          key: "VoiceAssetFacet.AssetRegistered",
          facetName: "VoiceAssetFacet",
          wrapperKey: "assetRegisteredEvent",
          eventName: "AssetRegistered",
          signature: "AssetRegistered(bytes32,address)",
          topicHash: null,
          anonymous: false,
          inputs: [],
          projection: { domain: "voice", projectionMode: "rawOnly", targets: [] },
          domain: "voice",
          operationId: "assetRegistered",
          httpMethod: "POST",
          path: "/events",
          notes: "",
        } as never,
        {
          auth: { apiKey: "read-key", label: "reader", allowGasless: false, roles: ["service"] },
          fromBlock: 1n,
          toBlock: "latest",
        } as never,
      ),
    ).resolves.toEqual({
      statusCode: 200,
      body: [
        { amount: "3", holder: "0x0000000000000000000000000000000000000003" },
      ],
    });
  });
});

describe("getTransactionRequest", () => {
  it("reads the stored request record from the tx store", async () => {
    const context = buildContext();

    await expect(getTransactionRequest(context as never, "req-1")).resolves.toEqual({ id: "req-1" });
    expect(context.txStore.get).toHaveBeenCalledWith("req-1");
  });
});

describe("createApiExecutionContext", () => {
  it("builds the execution context from config and helper factories", () => {
    const context = createApiExecutionContext();

    expect(mocked.loadApiKeys).toHaveBeenCalled();
    expect(mocked.createAlchemyClient).toHaveBeenCalled();
    expect(context.apiKeys).toEqual({ founderKey: { apiKey: "founder-key" } });
    expect(context.alchemy).toEqual({ mocked: true });
    expect(context.signerRunners.size).toBe(0);
    expect(context.signerQueues.size).toBe(0);
    expect(context.signerNonces.size).toBe(0);
  });
});
