import { describe, expect, it, vi, beforeEach } from "vitest";

const mocked = vi.hoisted(() => {
  const spawn = vi.fn();
  const execFileSync = vi.fn();
  const existsSync = vi.fn();
  const mkdtemp = vi.fn();
  const readFile = vi.fn();
  const rm = vi.fn();
  const loadRepoEnv = vi.fn();
  const readConfigFromEnv = vi.fn();
  const readRuntimeConfigSources = vi.fn();
  const createAlchemyClient = vi.fn();
  const decodeReceiptLogs = vi.fn();
  const jsonRpcProvider = vi.fn();
  const readActorStates = vi.fn();
  const simulateTransactionWithAlchemy = vi.fn();
  const traceTransactionWithAlchemy = vi.fn();
  const verifyExpectedEventWithAlchemy = vi.fn();
  return {
    spawn,
    execFileSync,
    existsSync,
    mkdtemp,
    readFile,
    rm,
    loadRepoEnv,
    readConfigFromEnv,
    readRuntimeConfigSources,
    createAlchemyClient,
    decodeReceiptLogs,
    jsonRpcProvider,
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

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: mocked.existsSync,
  };
});

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    mkdtemp: mocked.mkdtemp,
    readFile: mocked.readFile,
    rm: mocked.rm,
  };
});

vi.mock("ethers", () => ({
  JsonRpcProvider: mocked.jsonRpcProvider,
}));

vi.mock("../packages/client/src/runtime/config.js", () => ({
  loadRepoEnv: mocked.loadRepoEnv,
  readConfigFromEnv: mocked.readConfigFromEnv,
  readRuntimeConfigSources: mocked.readRuntimeConfigSources,
}));

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
  loadRuntimeEnvironment,
  printRuntimeHeader,
  resolveRuntimeConfig,
  startLocalForkIfNeeded,
  verifyNetwork,
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
    delete process.env.API_LAYER_ANVIL_BIN;
    delete process.env.API_LAYER_PARENT_REPO_DIR;

    mocked.existsSync.mockReturnValue(false);
    mocked.readConfigFromEnv.mockImplementation((env: NodeJS.ProcessEnv) => ({
      chainId: Number(env.CHAIN_ID ?? "84532"),
      diamondAddress: env.DIAMOND_ADDRESS ?? "0x0000000000000000000000000000000000000001",
      cbdpRpcUrl: env.RPC_URL ?? "https://rpc.example.com/base-sepolia",
      alchemyRpcUrl: env.ALCHEMY_RPC_URL ?? env.RPC_URL ?? "https://rpc.example.com/base-sepolia",
      alchemyDiagnosticsEnabled: env.ALCHEMY_DIAGNOSTICS_ENABLED === "1",
      alchemySimulationEnabled: env.ALCHEMY_SIMULATION_ENABLED === "1",
      alchemySimulationBlock: env.ALCHEMY_SIMULATION_BLOCK ?? "latest",
      alchemyTraceTimeout: Number(env.ALCHEMY_TRACE_TIMEOUT ?? "5000"),
    }));
    mocked.readRuntimeConfigSources.mockImplementation((env: NodeJS.ProcessEnv) => ({
      envPath: "/tmp/.env",
      values: {
        NETWORK: { value: env.NETWORK ?? "base-sepolia" },
        PRIVATE_KEY: { value: env.PRIVATE_KEY ?? undefined },
      },
    }));
    mocked.loadRepoEnv.mockReturnValue({
      NETWORK: "base-sepolia",
      CHAIN_ID: "84532",
      DIAMOND_ADDRESS: "0x00000000000000000000000000000000000000aa",
      RPC_URL: "https://rpc.example.com/base-sepolia",
      ALCHEMY_RPC_URL: "https://alchemy.example.com/base-sepolia",
      PRIVATE_KEY: "0xabc",
      ALCHEMY_DIAGNOSTICS_ENABLED: "1",
      ALCHEMY_SIMULATION_ENABLED: "1",
    });
    mocked.createAlchemyClient.mockReturnValue({ client: "alchemy" });
    mocked.jsonRpcProvider.mockImplementation((rpcUrl: string, chainId: number) => ({
      rpcUrl,
      chainId,
      getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(chainId) }),
      destroy: vi.fn().mockResolvedValue(undefined),
    }));
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

  it("loads repo env by default and preserves the fixture path when the configured RPC is already valid", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));

    const result = await resolveRuntimeConfig(undefined, async () => undefined);

    expect(mocked.loadRepoEnv).toHaveBeenCalledTimes(1);
    expect(result.rpcResolution).toMatchObject({
      source: "configured",
      fixturePath: expect.stringContaining(".runtime/base-sepolia-operator-fixtures.json"),
    });
  });

  it("falls back to the Base Sepolia fixture RPC when the local fork is unreachable", async () => {
    const calls: string[] = [];
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
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

  it("stringifies non-Error RPC verification failures when recording the fallback reason", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "https://base-sepolia.g.alchemy.com/v2/non-error-fallback",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
        ALCHEMY_RPC_URL: "http://127.0.0.1:8548",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw "offline";
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/non-error-fallback");
    expect(result.rpcResolution.fallbackReason).toBe("offline");
    expect(result.rpcResolution.fixturePath).toContain(".runtime/base-sepolia-operator-fixtures.json");
  });

  it("preserves a configured non-loopback alchemy RPC while falling back only the primary RPC", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "https://base-sepolia.g.alchemy.com/v2/fallback-only-primary",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
        ALCHEMY_RPC_URL: "https://alchemy.example.com/dedicated",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/fallback-only-primary");
    expect(result.config.alchemyRpcUrl).toBe("https://alchemy.example.com/dedicated");
  });

  it("stringifies non-Error verification failures when reporting fallback reasons", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "https://base-sepolia.g.alchemy.com/v2/string-throw",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        NETWORK: "ethereum",
        CHAIN_ID: "1",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw "rpc offline";
        }
      },
    );

    expect(result.rpcResolution.fallbackReason).toBe("rpc offline");
  });

  it("uses a persisted fork origin when the fixture rpcUrl was overwritten with loopback", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "http://127.0.0.1:8548",
        forkedFrom: "https://base-sepolia.g.alchemy.com/v2/from-fork-origin",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        NETWORK: "ethereum",
        CHAIN_ID: "1",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/from-fork-origin");
    expect(result.rpcResolution.source).toBe("base-sepolia-fixture");
  });

  it("uses a persisted upstream RPC URL when fixture metadata omits rpcUrl", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        upstreamRpcUrl: "https://base-sepolia.g.alchemy.com/v2/upstream-only",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        NETWORK: "ethereum",
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/upstream-only");
    expect(result.rpcResolution.source).toBe("base-sepolia-fixture");
  });

  it("falls back to a loopback fixture rpc when no upstream fixture origin is persisted", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "http://127.0.0.1:9555",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        NETWORK: "ethereum",
        CHAIN_ID: "1",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("http://127.0.0.1:9555");
    expect(result.config.alchemyRpcUrl).toBe("http://127.0.0.1:9555");
    expect(result.rpcResolution.source).toBe("base-sepolia-fixture");
  });

  it("prefers the official Base Sepolia public RPC over stale loopback fixture metadata", async () => {
    const calls: string[] = [];
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "http://127.0.0.1:9555",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        NETWORK: "base-sepolia",
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

    expect(result.config.cbdpRpcUrl).toBe("https://sepolia.base.org");
    expect(result.config.alchemyRpcUrl).toBe("https://sepolia.base.org");
    expect(result.rpcResolution.source).toBe("base-sepolia-fixture");
    expect(calls).toEqual([
      "http://127.0.0.1:8548:84532",
      "https://sepolia.base.org:84532",
    ]);
  });

  it("falls back to the official Base Sepolia public RPC when fixture metadata is unusable", async () => {
    const calls: string[] = [];
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "",
        upstreamRpcUrl: "",
        forkedFrom: "",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        NETWORK: "base-sepolia",
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

    expect(result.config.cbdpRpcUrl).toBe("https://sepolia.base.org");
    expect(result.config.alchemyRpcUrl).toBe("https://sepolia.base.org");
    expect(result.rpcResolution.source).toBe("base-sepolia-fixture");
    expect(calls).toEqual([
      "http://127.0.0.1:8548:84532",
      "https://sepolia.base.org:84532",
    ]);
  });

  it("treats unreadable fixture payloads as missing fallback metadata", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue("{not-json");

    await expect(resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
      },
    )).rejects.toThrow("connect ECONNREFUSED 127.0.0.1:8548");
  });

  it("rethrows the original verification error when no fixture fallback is available", async () => {
    await expect(resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
      },
    )).rejects.toThrow("connect ECONNREFUSED 127.0.0.1:8548");
    expect(mocked.readFile).not.toHaveBeenCalled();
  });

  it("rethrows the original verification error when parsed fixture metadata contains no usable RPC candidates", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "",
        upstreamRpcUrl: "",
        forkedFrom: "",
      },
    }));

    await expect(resolveRuntimeConfig(
      {
        NETWORK: "ethereum",
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
      },
      async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
      },
    )).rejects.toThrow("connect ECONNREFUSED 127.0.0.1:8548");
  });

  it("does not inspect fixture fallbacks when a non-loopback configured RPC fails verification", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));

    await expect(resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "https://rpc.example.com/base-sepolia",
      },
      async () => {
        throw new Error("upstream rpc unavailable");
      },
    )).rejects.toThrow("upstream rpc unavailable");
    expect(mocked.readFile).not.toHaveBeenCalled();
  });

  it("keeps the configured alchemy RPC when loopback fallback only replaces the primary URL", async () => {
    mocked.existsSync.mockImplementation((target: string) => target.includes(".runtime/base-sepolia-operator-fixtures.json"));
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "https://base-sepolia.g.alchemy.com/v2/fallback",
      },
    }));

    const result = await resolveRuntimeConfig(
      {
        CHAIN_ID: "84532",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
        RPC_URL: "http://127.0.0.1:8548",
        ALCHEMY_RPC_URL: "https://alchemy.example.com/base-sepolia",
      },
      async (rpcUrl) => {
        if (rpcUrl === "http://127.0.0.1:8548") {
          throw new Error("connect ECONNREFUSED 127.0.0.1:8548");
        }
      },
    );

    expect(result.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/fallback");
    expect(result.config.alchemyRpcUrl).toBe("https://alchemy.example.com/base-sepolia");
  });

  it("detects loopback RPC URLs from both valid and malformed inputs", () => {
    expect(isLoopbackRpcUrl("http://127.0.0.1:8548")).toBe(true);
    expect(isLoopbackRpcUrl("https://localhost:8545")).toBe(true);
    expect(isLoopbackRpcUrl(" localhost fallback")).toBe(true);
    expect(isLoopbackRpcUrl("totally malformed")).toBe(false);
    expect(isLoopbackRpcUrl("https://rpc.example.com")).toBe(false);
    expect(isLoopbackRpcUrl("ws://rpc.example.com/socket")).toBe(false);
  });

  it("verifies chain id and always destroys the temporary provider", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    mocked.jsonRpcProvider.mockImplementationOnce(() => ({
      getNetwork: vi.fn().mockResolvedValue({ chainId: 84532n }),
      destroy,
    }));

    await expect(verifyNetwork("https://rpc.example.com", 84532)).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects mismatched chain ids while still destroying the provider", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    mocked.jsonRpcProvider.mockImplementationOnce(() => ({
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
      destroy,
    }));

    await expect(verifyNetwork("https://rpc.example.com", 84532)).rejects.toThrow(
      "expected chainId 84532, received 1 from https://rpc.example.com",
    );
    expect(destroy).toHaveBeenCalledTimes(1);
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

  it("prints missing signer metadata when no private key is configured", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    printRuntimeHeader({
      configSources: {
        envPath: "/tmp/.env",
        values: { NETWORK: { value: "base-sepolia" }, PRIVATE_KEY: { value: undefined } },
      },
      config: {
        chainId: 84532,
        diamondAddress: "0x1",
        cbdpRpcUrl: "https://rpc.example.com",
      },
      rpcResolution: {
        configuredRpcUrl: "https://rpc.example.com",
        effectiveRpcUrl: "https://rpc.example.com",
        source: "configured",
        fallbackReason: null,
        fixturePath: null,
      },
      scenarioCommit: null,
    } as any);

    expect(consoleLog).toHaveBeenCalledWith(JSON.stringify({
      envPath: "/tmp/.env",
      network: "base-sepolia",
      chainId: 84532,
      diamondAddress: "0x1",
      rpcUrl: "https://rpc.example.com",
      configuredRpcUrl: "https://rpc.example.com",
      rpcSource: "configured",
      rpcFallbackReason: null,
      signerAddress: "missing",
      scenarioBaselineCommit: null,
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

  it("skips decoded logs when no receipt exists and deduplicates actor reads", async () => {
    mocked.readActorStates.mockResolvedValue([{ address: "0xsame" }]);
    const runtime = {
      alchemy: null,
      provider: {
        getTransactionReceipt: vi.fn().mockResolvedValue(null),
        getTransaction: vi.fn().mockResolvedValue({ from: "0xsame", to: "0xsame" }),
      },
      config: {
        alchemyDiagnosticsEnabled: false,
      },
    };

    await expect(buildTxDebugReport(runtime as any, "0xhash")).resolves.toEqual({
      txHash: "0xhash",
      source: "rpc",
      receipt: null,
      decodedLogs: [],
      trace: { status: "disabled" },
      actors: [{ address: "0xsame" }],
    });
    expect(mocked.decodeReceiptLogs).not.toHaveBeenCalled();
    expect(mocked.readActorStates).toHaveBeenCalledWith(runtime.provider, ["0xsame"]);
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

  it("terminates an auto-started fork when closing the runtime environment", async () => {
    const provider = { destroy: vi.fn().mockResolvedValue(undefined) };
    const forkProcess = { kill: vi.fn() };

    await expect(closeRuntimeEnvironment({ provider, forkProcess } as any)).resolves.toBeUndefined();

    expect(provider.destroy).toHaveBeenCalledTimes(1);
    expect(forkProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("skips auto-fork bootstrapping when fallback mode is not active", async () => {
    await expect(startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://rpc.example.com/base-sepolia",
      },
      rpcResolution: {
        configuredRpcUrl: "https://rpc.example.com/base-sepolia",
        source: "configured",
      },
    } as any)).resolves.toEqual({
      rpcUrl: "https://rpc.example.com/base-sepolia",
      forkProcess: null,
      forkedFrom: null,
    });
    expect(mocked.spawn).not.toHaveBeenCalled();
  });

  it("skips auto-fork bootstrapping when auto-forking is explicitly disabled", async () => {
    process.env.API_LAYER_AUTO_FORK = "0";

    await expect(startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any)).resolves.toEqual({
      rpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
      forkProcess: null,
      forkedFrom: null,
    });
    expect(mocked.spawn).not.toHaveBeenCalled();
  });

  it("reuses an already-running loopback fork when the configured listener is healthy", async () => {
    await expect(startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any)).resolves.toEqual({
      rpcUrl: "http://127.0.0.1:8548",
      forkProcess: null,
      forkedFrom: "https://base-sepolia.g.alchemy.com/v2/live",
    });
    expect(mocked.spawn).not.toHaveBeenCalled();
  });

  it("starts an anvil fork when the configured listener is loopback and verification eventually succeeds", async () => {
    vi.useFakeTimers();
    process.env.API_LAYER_ANVIL_BIN = "custom-anvil";
    const child = {
      exitCode: null,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
    };
    mocked.spawn.mockReturnValue(child as any);
    mocked.jsonRpcProvider
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockRejectedValue(new Error("not ready")),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockResolvedValue({ chainId: 84532n }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }));

    const promise = startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any);

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual({
      rpcUrl: "http://127.0.0.1:8548",
      forkProcess: child,
      forkedFrom: "https://base-sepolia.g.alchemy.com/v2/live",
    });
    expect(mocked.spawn).toHaveBeenCalledWith("custom-anvil", [
      "--host",
      "127.0.0.1",
      "--port",
      "8548",
      "--chain-id",
      "84532",
      "--fork-url",
      "https://base-sepolia.g.alchemy.com/v2/live",
    ], expect.objectContaining({
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    }));
  });

  it("uses the default https port when auto-forking a loopback listener without an explicit port", async () => {
    vi.useFakeTimers();
    const child = {
      exitCode: null,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
    };
    mocked.spawn.mockReturnValue(child as any);
    mocked.jsonRpcProvider
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockRejectedValue(new Error("not ready")),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockResolvedValue({ chainId: 84532n }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }));

    const promise = startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "https://localhost",
        source: "base-sepolia-fixture",
      },
    } as any);

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual({
      rpcUrl: "https://localhost",
      forkProcess: child,
      forkedFrom: "https://base-sepolia.g.alchemy.com/v2/live",
    });
    expect(mocked.spawn).toHaveBeenCalledWith("anvil", [
      "--host",
      "localhost",
      "--port",
      "443",
      "--chain-id",
      "84532",
      "--fork-url",
      "https://base-sepolia.g.alchemy.com/v2/live",
    ], expect.objectContaining({
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    }));
  });

  it("fails fast when the fork process exits before bootstrap completes", async () => {
    mocked.spawn.mockReturnValue({
      exitCode: 12,
      kill: vi.fn(),
      stdout: { on: vi.fn((_: string, handler: (chunk: Buffer) => void) => handler(Buffer.from("fork died"))) },
      stderr: { on: vi.fn() },
    } as any);
    mocked.jsonRpcProvider.mockImplementationOnce(() => ({
      getNetwork: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8548")),
      destroy: vi.fn().mockResolvedValue(undefined),
    }));

    await expect(startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any)).rejects.toThrow("anvil exited before contract integration bootstrap: fork died");
  });

  it("reports the numeric exit code when the fork process exits before writing startup output", async () => {
    mocked.spawn.mockReturnValue({
      exitCode: 12,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
    } as any);
    mocked.jsonRpcProvider.mockImplementationOnce(() => ({
      getNetwork: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8548")),
      destroy: vi.fn().mockResolvedValue(undefined),
    }));

    await expect(startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any)).rejects.toThrow("anvil exited before contract integration bootstrap: 12");
  });

  it("retries fork bootstrap when the configured port is transiently unavailable", async () => {
    vi.useFakeTimers();
    const failedChild = {
      exitCode: 1,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn((_: string, handler: (chunk: Buffer) => void) => handler(Buffer.from("Address already in use (os error 48)"))) },
    };
    const healthyChild = {
      exitCode: null,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
    };
    mocked.spawn
      .mockReturnValueOnce(failedChild as any)
      .mockReturnValueOnce(healthyChild as any);
    mocked.jsonRpcProvider
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8548")),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8548")),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce(() => ({
        getNetwork: vi.fn().mockResolvedValue({ chainId: 84532n }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }));

    const promise = startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual({
      rpcUrl: "http://127.0.0.1:8548",
      forkProcess: healthyChild,
      forkedFrom: "https://base-sepolia.g.alchemy.com/v2/live",
    });
    expect(mocked.spawn).toHaveBeenCalledTimes(2);
  });

  it("times out fork bootstrap after repeated verification failures", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const child = {
      exitCode: null,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn((_: string, handler: (chunk: Buffer) => void) => handler(Buffer.from("still booting"))) },
    };
    mocked.spawn.mockReturnValue(child as any);
    mocked.jsonRpcProvider.mockImplementation(() => ({
      getNetwork: vi.fn().mockRejectedValue(new Error("not ready")),
      destroy: vi.fn().mockResolvedValue(undefined),
    }));

    const promise = startLocalForkIfNeeded({
      config: {
        cbdpRpcUrl: "https://base-sepolia.g.alchemy.com/v2/live",
        chainId: 84532,
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
      },
    } as any);

    await expect(promise).rejects.toThrow(
      "timed out waiting for anvil fork on http://127.0.0.1:8548: still booting",
    );
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    setTimeoutSpy.mockRestore();
  }, 30_000);

  it("loads the runtime environment, resolves the contracts root, and records the scenario commit", async () => {
    process.env.API_LAYER_PARENT_REPO_DIR = "contracts-root";
    mocked.existsSync.mockImplementation((target: string) =>
      target.endsWith("/contracts-root/package.json") ||
      target.endsWith("/contracts-root/scripts/deployment"),
    );
    mocked.execFileSync.mockReturnValue("deadbeef\n");

    const runtime = await loadRuntimeEnvironment();

    expect(runtime.contractsRoot).toMatch(/contracts-root$/);
    expect(runtime.env).toEqual(expect.objectContaining({
      RPC_URL: "https://rpc.example.com/base-sepolia",
    }));
    expect(runtime.scenarioCommit).toBe("deadbeef");
    expect(runtime.alchemy).toEqual({ client: "alchemy" });
    expect(mocked.createAlchemyClient).toHaveBeenCalledWith(expect.objectContaining({
      cbdpRpcUrl: "https://rpc.example.com/base-sepolia",
      alchemyRpcUrl: "https://alchemy.example.com/base-sepolia",
    }));
  });

  it("boots a loopback fork for the runtime environment when the configured listener is down but fixture RPC metadata is available", async () => {
    vi.useFakeTimers();
    process.env.API_LAYER_PARENT_REPO_DIR = "contracts-root";
    mocked.existsSync.mockImplementation((target: string) =>
      target.includes(".runtime/base-sepolia-operator-fixtures.json") ||
      target.endsWith("/contracts-root/package.json") ||
      target.endsWith("/contracts-root/scripts/deployment"),
    );
    mocked.readFile.mockResolvedValue(JSON.stringify({
      network: {
        rpcUrl: "https://base-sepolia.g.alchemy.com/v2/fork-source",
      },
    }));
    mocked.execFileSync.mockReturnValue("deadbeef\n");
    const child = {
      exitCode: null,
      kill: vi.fn(),
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
    };
    mocked.spawn.mockReturnValue(child as any);
    mocked.loadRepoEnv.mockReturnValue({
      NETWORK: "base-sepolia",
      CHAIN_ID: "84532",
      DIAMOND_ADDRESS: "0x00000000000000000000000000000000000000aa",
      RPC_URL: "http://127.0.0.1:8548",
      ALCHEMY_RPC_URL: "https://alchemy.example.com/base-sepolia",
      PRIVATE_KEY: "0xabc",
      ALCHEMY_DIAGNOSTICS_ENABLED: "1",
      ALCHEMY_SIMULATION_ENABLED: "1",
    });
    mocked.jsonRpcProvider
      .mockImplementationOnce((rpcUrl: string, chainId: number) => ({
        rpcUrl,
        chainId,
        getNetwork: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8548")),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce((rpcUrl: string, chainId: number) => ({
        rpcUrl,
        chainId,
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(chainId) }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce((rpcUrl: string, chainId: number) => ({
        rpcUrl,
        chainId,
        getNetwork: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:8548")),
        destroy: vi.fn().mockResolvedValue(undefined),
      }))
      .mockImplementationOnce((rpcUrl: string, chainId: number) => ({
        rpcUrl,
        chainId,
        getNetwork: vi.fn().mockResolvedValue({ chainId: BigInt(chainId) }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }));

    const runtimePromise = loadRuntimeEnvironment();
    await vi.advanceTimersByTimeAsync(500);
    const runtime = await runtimePromise;

    expect(runtime.config.cbdpRpcUrl).toBe("https://base-sepolia.g.alchemy.com/v2/fork-source");
    expect(runtime.provider).toMatchObject({
      rpcUrl: "http://127.0.0.1:8548",
      chainId: 84532,
    });
    expect(runtime.forkProcess).toBe(child);
    expect(runtime.forkedFrom).toBe("https://base-sepolia.g.alchemy.com/v2/fork-source");
    expect(mocked.spawn).toHaveBeenCalledWith("anvil", [
      "--host",
      "127.0.0.1",
      "--port",
      "8548",
      "--chain-id",
      "84532",
      "--fork-url",
      "https://base-sepolia.g.alchemy.com/v2/fork-source",
    ], expect.objectContaining({
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    }));
  });

  it("accepts absolute contract-root overrides without re-resolving them", async () => {
    process.env.API_LAYER_PARENT_REPO_DIR = "/tmp/contracts-root";
    mocked.existsSync.mockImplementation((target: string) =>
      target === "/tmp/contracts-root/package.json" ||
      target === "/tmp/contracts-root/scripts/deployment",
    );
    mocked.execFileSync.mockReturnValue("feedface\n");

    const runtime = await loadRuntimeEnvironment();

    expect(runtime.contractsRoot).toBe("/tmp/contracts-root");
    expect(runtime.scenarioCommit).toBe("feedface");
  });

  it("prefers the default parent-directory contracts workspace when no explicit override is set", async () => {
    mocked.existsSync.mockImplementation((target: string) =>
      target.endsWith("/Public/package.json") ||
      target.endsWith("/Public/scripts/deployment"),
    );
    mocked.execFileSync.mockReturnValue("cafebabe\n");

    const runtime = await loadRuntimeEnvironment();

    expect(runtime.contractsRoot).toMatch(/\/Public$/);
    expect(runtime.scenarioCommit).toBe("cafebabe");
  });

  it("returns a null scenario commit when git metadata is unavailable", async () => {
    process.env.API_LAYER_PARENT_REPO_DIR = "contracts-root";
    mocked.existsSync.mockImplementation((target: string) =>
      target.endsWith("/contracts-root/package.json") ||
      target.endsWith("/contracts-root/scripts/deployment"),
    );
    mocked.execFileSync.mockImplementation(() => {
      throw new Error("git unavailable");
    });

    const runtime = await loadRuntimeEnvironment();
    expect(runtime.scenarioCommit).toBeNull();
  });

  it("fails loading the runtime environment when no contracts workspace can be located", async () => {
    await expect(loadRuntimeEnvironment()).rejects.toThrow(
      "unable to locate contracts workspace; set API_LAYER_PARENT_REPO_DIR",
    );
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

  it("returns null diagnostics when the API scenario diagnostics file is unreadable", async () => {
    mocked.mkdtemp.mockResolvedValue("/tmp/api-layer-scenario-456");
    mocked.readFile.mockRejectedValue(new Error("diagnostics missing"));
    const child = createChildProcess();
    mocked.spawn.mockReturnValue(child);

    const promise = runScenarioCommand({
      env: { CUSTOM_ENV: "1" },
      contractsRoot: "/contracts",
    } as any, "api", "pnpm scenario");

    await Promise.resolve();
    child.emit("exit", null);

    await expect(promise).resolves.toEqual({
      mode: "api",
      command: "pnpm scenario",
      exitCode: 1,
      stdout: "",
      stderr: "",
      diagnostics: null,
    });
    expect(mocked.rm).toHaveBeenCalledWith("/tmp/api-layer-scenario-456", { recursive: true, force: true });
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
