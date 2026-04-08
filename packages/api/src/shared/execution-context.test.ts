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
