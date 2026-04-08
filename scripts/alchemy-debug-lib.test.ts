import { describe, expect, it, vi, beforeEach } from "vitest";

const mocked = vi.hoisted(() => {
  const spawn = vi.fn();
  const execFileSync = vi.fn();
  const mkdtemp = vi.fn();
  const readFile = vi.fn();
  const rm = vi.fn();
  const createAlchemyClient = vi.fn();
  const decodeReceiptLogs = vi.fn();
  const readActorStates = vi.fn();
  const simulateTransactionWithAlchemy = vi.fn();
  const traceTransactionWithAlchemy = vi.fn();
  const verifyExpectedEventWithAlchemy = vi.fn();
  return {
    spawn,
    execFileSync,
    mkdtemp,
    readFile,
    rm,
    createAlchemyClient,
    decodeReceiptLogs,
    readActorStates,
    simulateTransactionWithAlchemy,
    traceTransactionWithAlchemy,
    verifyExpectedEventWithAlchemy,
  };
});

vi.mock("node:child_process", () => ({
  execFileSync: mocked.execFileSync,
  spawn: mocked.spawn,
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    mkdtemp: mocked.mkdtemp,
    readFile: mocked.readFile,
    rm: mocked.rm,
  };
});

vi.mock("../packages/api/src/shared/alchemy-diagnostics.js", () => ({
  createAlchemyClient: mocked.createAlchemyClient,
  decodeReceiptLogs: mocked.decodeReceiptLogs,
  readActorStates: mocked.readActorStates,
  simulateTransactionWithAlchemy: mocked.simulateTransactionWithAlchemy,
  traceTransactionWithAlchemy: mocked.traceTransactionWithAlchemy,
  verifyExpectedEventWithAlchemy: mocked.verifyExpectedEventWithAlchemy,
}));

import {
  buildSimulationReport,
  buildTxDebugReport,
  closeRuntimeEnvironment,
  isLoopbackRpcUrl,
  printRuntimeHeader,
  resolveRuntimeConfig,
  runScenarioCommand,
} from "./alchemy-debug-lib.js";

function createChildProcess() {
  const handlers = new Map<string, Array<(...args: any[]) => void>>();
  return {
    stdout: {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers.set(`stdout:${event}`, [...(handlers.get(`stdout:${event}`) ?? []), handler]);
      }),
    },
    stderr: {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers.set(`stderr:${event}`, [...(handlers.get(`stderr:${event}`) ?? []), handler]);
      }),
    },
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }),
    emit(event: string, ...args: any[]) {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args);
      }
    },
    emitStdout(text: string) {
      for (const handler of handlers.get("stdout:data") ?? []) {
        handler(Buffer.from(text));
      }
    },
    emitStderr(text: string) {
      for (const handler of handlers.get("stderr:data") ?? []) {
        handler(Buffer.from(text));
      }
    },
  };
}

describe("alchemy-debug-lib", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.API_LAYER_SCENARIO_DIAGNOSTICS_PATH;
    delete process.env.API_LAYER_SCENARIO_COMMAND;
    delete process.env.API_LAYER_AUTO_FORK;
  });

  it("keeps the configured RPC when verification succeeds", async () => {
    const calls: string[] = [];
    const result = await resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "https://rpc.example.com/base-sepolia",
        ALCHEMY_RPC_URL: "https://alchemy.example.com/base-sepolia",
      },
      async (rpcUrl, expectedChainId) => {
        calls.push(`${rpcUrl}:${expectedChainId}`);
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://rpc.example.com/base-sepolia");
    expect(result.config.alchemyRpcUrl).toBe("https://alchemy.example.com/base-sepolia");
    expect(result.rpcResolution.source).toBe("configured");
    expect(result.rpcResolution.fallbackReason).toBeNull();
    expect(calls).toEqual(["https://rpc.example.com/base-sepolia:84532"]);
  });

  it("falls back to the Base Sepolia fixture RPC when the local fork is unreachable", async () => {
    const calls: string[] = [];
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "https://base-sepolia.g.alchemy.com/v2/YI7-0F2FoH3vK3Du6loG4",
      },
    }));
    const result = await resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
        ALCHEMY_RPC_URL: "http://127.0.0.1:8548",
      },
      async (rpcUrl, expectedChainId) => {
        calls.push(`${rpcUrl}:${expectedChainId}`);
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/YI7-0F2FoH3vK3Du6loG4");
    expect(result.config.alchemyRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/YI7-0F2FoH3vK3Du6loG4");
    expect(result.rpcResolution.source).toBe("base-sepolia-fixture");
    expect(result.rpcResolution.fallbackReason).toContain("ECONNREFUSED");
    expect(result.rpcResolution.fixturePath).toContain(".runtime/base-sepolia-operator-fixtures.json");
    expect(calls).toEqual([
      "http://127.0.0.1:8548:84532",
      "https://base-sepolia.g.alchemy.com/v2/YI7-0F2FoH3vK3Du6loG4:84532",
    ]);
  });

  it("detects loopback RPC URLs from both valid and malformed inputs", () => {
    expect(isLoopbackRpcUrl("http://127.0.0.1:8548")).toBe(true);
    expect(isLoopbackRpcUrl("https://localhost:8545")).toBe(true);
    expect(isLoopbackRpcUrl(" localhost fallback")).toBe(true);
    expect(isLoopbackRpcUrl("https://rpc.example.com")).toBe(false);
  });

  it("prints runtime headers with RPC resolution metadata", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    printRuntimeHeader({
      configSources: {
        envPath: "/tmp/.env",
        values: { NETWORK: { value: "base-sepolia" }, PRIVATE_KEY: { value: "0xabc" } },
      },
      config: {
        chainId: 84532,
        diamondAddress: "0x1",
        cbdpRpcUrl: "https://rpc.example.com",
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        effectiveRpcUrl: "https://rpc.example.com",
        source: "base-sepolia-fixture",
        fallbackReason: "ECONNREFUSED",
        fixturePath: "/tmp/fixture.json",
      },
      scenarioCommit: "abc123",
    } as any);

    expect(consoleLog).toHaveBeenCalledWith(JSON.stringify({
      envPath: "/tmp/.env",
      network: "base-sepolia",
      chainId: 84532,
      diamondAddress: "0x1",
      rpcUrl: "https://rpc.example.com",
      configuredRpcUrl: "http://127.0.0.1:8548",
      rpcSource: "base-sepolia-fixture",
      rpcFallbackReason: "ECONNREFUSED",
      signerAddress: "configured",
      scenarioBaselineCommit: "abc123",
    }, null, 2));
  });

  it("builds transaction debug reports through the configured provider path", async () => {
    mocked.decodeReceiptLogs.mockReturnValue([{ eventName: "Transfer" }]);
    mocked.traceTransactionWithAlchemy.mockResolvedValue({ status: "ok" });
    mocked.readActorStates.mockResolvedValue([{ address: "0xfrom" }, { address: "0xto" }]);
    const receipt = { logs: [{ topics: [] }] };
    const transaction = { from: "0xfrom", to: "0xto" };
    const runtime = {
      alchemy: {
        core: {
          getTransactionReceipt: vi.fn().mockResolvedValue(receipt),
          getTransaction: vi.fn().mockResolvedValue(transaction),
        },
      },
      provider: {},
      config: {
        alchemyDiagnosticsEnabled: true,
        alchemyTraceTimeout: 5_000,
      },
    };

    await expect(buildTxDebugReport(runtime as any, "0xhash")).resolves.toEqual({
      txHash: "0xhash",
      source: "alchemy",
      receipt,
      decodedLogs: [{ eventName: "Transfer" }],
      trace: { status: "ok" },
      actors: [{ address: "0xfrom" }, { address: "0xto" }],
    });
    expect(mocked.decodeReceiptLogs).toHaveBeenCalledWith({ logs: receipt.logs });
    expect(mocked.readActorStates).toHaveBeenCalledWith(runtime.provider, ["0xfrom", "0xto"]);
  });

  it("disables tracing and skips actor reads when there are no tx addresses", async () => {
    mocked.decodeReceiptLogs.mockReturnValue([]);
    const runtime = {
      alchemy: null,
      provider: {
        getTransactionReceipt: vi.fn().mockResolvedValue({ logs: [] }),
        getTransaction: vi.fn().mockResolvedValue({ from: null, to: null }),
      },
      config: {
        alchemyDiagnosticsEnabled: false,
      },
    };

    await expect(buildTxDebugReport(runtime as any, "0xhash")).resolves.toEqual({
      txHash: "0xhash",
      source: "rpc",
      receipt: { logs: [] },
      decodedLogs: [],
      trace: { status: "disabled" },
      actors: [],
    });
    expect(mocked.traceTransactionWithAlchemy).not.toHaveBeenCalled();
    expect(mocked.readActorStates).not.toHaveBeenCalled();
  });

  it("builds simulation reports with expected-event verification", async () => {
    mocked.simulateTransactionWithAlchemy.mockResolvedValue({ status: "simulated" });
    mocked.verifyExpectedEventWithAlchemy.mockResolvedValue({ matched: true });
    const runtime = {
      alchemy: { client: true },
      config: {
        diamondAddress: "0xdiamond",
        alchemyDiagnosticsEnabled: true,
        alchemySimulationEnabled: true,
        alchemySimulationBlock: "latest",
      },
    };

    await expect(buildSimulationReport(runtime as any, {
      calldata: "0xfeed",
      from: "0xfrom",
      expectedEvent: {
        facetName: "VoiceAssetFacet",
        eventName: "VoiceAssetRegistered",
        indexedMatches: { owner: "0xfrom" },
      },
    })).resolves.toEqual({
      request: {
        calldata: "0xfeed",
        from: "0xfrom",
        expectedEvent: {
          facetName: "VoiceAssetFacet",
          eventName: "VoiceAssetRegistered",
          indexedMatches: { owner: "0xfrom" },
        },
      },
      alchemyEnabled: true,
      simulation: { status: "simulated" },
      eventVerification: { matched: true },
    });
    expect(mocked.simulateTransactionWithAlchemy).toHaveBeenCalledWith(runtime.alchemy, {
      from: "0xfrom",
      to: "0xdiamond",
      data: "0xfeed",
      gas: undefined,
      gasPrice: undefined,
      value: undefined,
    }, "latest");
  });

  it("returns disabled simulation reports when Alchemy simulation is off", async () => {
    const runtime = {
      alchemy: { client: true },
      config: {
        diamondAddress: "0xdiamond",
        alchemyDiagnosticsEnabled: false,
        alchemySimulationEnabled: false,
        alchemySimulationBlock: "latest",
      },
    };

    await expect(buildSimulationReport(runtime as any, {
      calldata: "0xfeed",
      from: "0xfrom",
      to: "0xoverride",
    })).resolves.toEqual({
      request: {
        calldata: "0xfeed",
        from: "0xfrom",
        to: "0xoverride",
      },
      alchemyEnabled: false,
      simulation: { status: "disabled" },
      eventVerification: null,
    });
    expect(mocked.simulateTransactionWithAlchemy).not.toHaveBeenCalled();
    expect(mocked.verifyExpectedEventWithAlchemy).not.toHaveBeenCalled();
  });

  it("closes runtime environments by destroying the provider", async () => {
    const provider = { destroy: vi.fn().mockResolvedValue(undefined) };
    await expect(closeRuntimeEnvironment({ provider } as any)).resolves.toBeUndefined();
    expect(provider.destroy).toHaveBeenCalledTimes(1);
  });

  it("runs API scenarios, captures diagnostics, and cleans up temp files", async () => {
    const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    mocked.mkdtemp.mockResolvedValue("/tmp/api-layer-scenario-123");
    mocked.readFile.mockResolvedValue(JSON.stringify({ invocations: [{ response: { txHash: "0xhash" } }] }));
    const child = createChildProcess();
    mocked.spawn.mockReturnValue(child);

    const promise = runScenarioCommand({
      env: { CUSTOM_ENV: "1" },
      contractsRoot: "/contracts",
    } as any, "api", "pnpm scenario");

    await Promise.resolve();
    child.emitStdout("api stdout");
    child.emitStderr("api stderr");
    child.emit("exit", 0);

    await expect(promise).resolves.toEqual({
      mode: "api",
      command: "pnpm scenario",
      exitCode: 0,
      stdout: "api stdout",
      stderr: "api stderr",
      diagnostics: { invocations: [{ response: { txHash: "0xhash" } }] },
    });
    expect(mocked.spawn).toHaveBeenCalledWith("pnpm", ["tsx", "scripts/run-base-sepolia-api-scenario.ts"], expect.objectContaining({
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: expect.objectContaining({
        CUSTOM_ENV: "1",
        API_LAYER_SCENARIO_DIAGNOSTICS_PATH: "/tmp/api-layer-scenario-123/api.json",
        API_LAYER_SCENARIO_COMMAND: "pnpm scenario",
      }),
    }));
    expect(mocked.rm).toHaveBeenCalledWith("/tmp/api-layer-scenario-123", { recursive: true, force: true });
    expect(stdoutWrite).toHaveBeenCalledWith("api stdout");
    expect(stderrWrite).toHaveBeenCalledWith("api stderr");
  });

  it("runs contract scenarios without diagnostics payloads", async () => {
    mocked.mkdtemp.mockResolvedValue("/tmp/api-layer-scenario-999");
    const child = createChildProcess();
    mocked.spawn.mockReturnValue(child);

    const promise = runScenarioCommand({
      env: { CUSTOM_ENV: "1" },
      contractsRoot: "/contracts",
    } as any, "contract", "pnpm hardhat run");

    await Promise.resolve();
    child.emit("exit", 3);

    await expect(promise).resolves.toEqual({
      mode: "contract",
      command: "pnpm hardhat run",
      exitCode: 3,
      stdout: "",
      stderr: "",
      diagnostics: null,
    });
    expect(mocked.readFile).not.toHaveBeenCalled();
    expect(mocked.spawn).toHaveBeenCalledWith("pnpm hardhat run", expect.objectContaining({
      cwd: "/contracts",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    }));
    expect(mocked.rm).toHaveBeenCalledWith("/tmp/api-layer-scenario-999", { recursive: true, force: true });
  });
});
