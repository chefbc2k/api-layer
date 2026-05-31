import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadRuntimeEnvironment: vi.fn(),
  closeRuntimeEnvironment: vi.fn(),
}));

vi.mock("./alchemy-debug-lib.js", () => ({
  loadRuntimeEnvironment: mocks.loadRuntimeEnvironment,
  closeRuntimeEnvironment: mocks.closeRuntimeEnvironment,
}));

describe("show-validated-baseline", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("prints the validated baseline details and closes the full runtime environment", async () => {
    const runtime = {
      configSources: {
        envPath: "/tmp/.env",
        values: {
          NETWORK: { value: "base-sepolia" },
        },
      },
      config: {
        chainId: 84532,
        diamondAddress: "0x00000000000000000000000000000000000000aa",
        cbdpRpcUrl: "https://rpc.example.com/base-sepolia",
        alchemyRpcUrl: "https://alchemy.example.com/base-sepolia",
        alchemyApiKey: "key",
      },
      rpcResolution: {
        configuredRpcUrl: "http://127.0.0.1:8548",
        source: "base-sepolia-fixture",
        fallbackReason: "connect ECONNREFUSED 127.0.0.1:8548",
      },
      env: {
        PRIVATE_KEY: "0xabc",
        ORACLE_WALLET_PRIVATE_KEY: "0xdef",
      },
      scenarioCommit: "deadbeef",
    };
    mocks.loadRuntimeEnvironment.mockResolvedValue(runtime);
    mocks.closeRuntimeEnvironment.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    await import("./show-validated-baseline.ts");

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      envPath: "/tmp/.env",
      network: "base-sepolia",
      chainId: 84532,
      diamondAddress: "0x00000000000000000000000000000000000000aa",
      rpcUrl: "https://rpc.example.com/base-sepolia",
      configuredRpcUrl: "http://127.0.0.1:8548",
      rpcSource: "base-sepolia-fixture",
      rpcFallbackReason: "connect ECONNREFUSED 127.0.0.1:8548",
      alchemyRpcUrl: "https://alchemy.example.com/base-sepolia",
      alchemyApiKeyConfigured: true,
      signerConfigured: true,
      oracleSignerConfigured: true,
      scenarioBaselineCommit: "deadbeef",
    }, null, 2));
    expect(mocks.closeRuntimeEnvironment).toHaveBeenCalledWith(runtime);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("reports runtime bootstrap failures and exits with status 1", async () => {
    const boom = new Error("baseline load failed");
    mocks.loadRuntimeEnvironment.mockRejectedValue(boom);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);

    await import("./show-validated-baseline.ts");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(boom);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mocks.closeRuntimeEnvironment).not.toHaveBeenCalled();
  });
});
