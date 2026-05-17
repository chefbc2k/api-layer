import { afterEach, describe, expect, it, vi } from "vitest";

import { isAlchemyRpcUrl, readConfigFromEnv, readRuntimeConfigSources } from "./config.js";

async function importConfigWithFs(fsOverrides: {
  existsSync?: (path: string) => boolean;
  readFileSync?: (path: string, encoding: string) => string;
}) {
  vi.resetModules();
  vi.doMock("node:fs", () => ({
    existsSync: fsOverrides.existsSync ?? vi.fn(() => false),
    readFileSync: fsOverrides.readFileSync ?? vi.fn(() => ""),
  }));
  return import("./config.js");
}

afterEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.unmock("node:fs");
});

describe("runtime config", () => {
  it("detects Alchemy endpoints and enables diagnostics defaults when an API key is present", () => {
    const config = readConfigFromEnv({
      CHAIN_ID: "84532",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      RPC_URL: "https://rpc.example.com/base-sepolia",
      ALCHEMY_RPC_URL: "https://base-sepolia.g.alchemy.com/v2/test-key",
      ALCHEMY_API_KEY: "test-key",
    });

    expect(config.alchemyEndpointDetected).toBe(true);
    expect(config.alchemyDiagnosticsEnabled).toBe(true);
    expect(config.alchemySimulationEnabled).toBe(true);
    expect(config.alchemyRpcUrl).toContain("alchemy");
  });

  it("keeps diagnostics off by default for non-Alchemy endpoints without an API key", () => {
    const config = readConfigFromEnv({
      CHAIN_ID: "84532",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      RPC_URL: "https://rpc.example.com/base-sepolia",
      ALCHEMY_RPC_URL: "https://rpc.example.com/base-sepolia-secondary",
    });

    expect(config.alchemyEndpointDetected).toBe(false);
    expect(config.alchemyDiagnosticsEnabled).toBe(false);
    expect(config.alchemySimulationEnabled).toBe(false);
  });

  it("recognizes canonical Alchemy URLs", () => {
    expect(isAlchemyRpcUrl("https://base-sepolia.g.alchemy.com/v2/key")).toBe(true);
    expect(isAlchemyRpcUrl("https://rpc.example.com")).toBe(false);
  });

  it("treats undefined and invalid strings with alchemy markers as supported Alchemy endpoints", () => {
    expect(isAlchemyRpcUrl(undefined)).toBe(false);
    expect(isAlchemyRpcUrl("not-a-url-but-alchemy-proxied")).toBe(true);
    expect(isAlchemyRpcUrl("not-a-url")).toBe(false);
  });

  it("prefers explicit runtime overrides over repo defaults", () => {
    const config = readConfigFromEnv({
      CHAIN_ID: "84532",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      RPC_URL: "https://override-rpc.example.com/base-sepolia",
      ALCHEMY_RPC_URL: "https://override-alchemy.example.com/base-sepolia",
    });

    expect(config.cbdpRpcUrl).toBe("https://override-rpc.example.com/base-sepolia");
    expect(config.alchemyRpcUrl).toBe("https://override-alchemy.example.com/base-sepolia");
  });

  it("reports missing and present runtime config sources, including CBDP fallback keys", () => {
    const sources = readRuntimeConfigSources({
      CBDP_RPC_URL: "https://cbdp.example.com/base-sepolia",
      CHAIN_ID: "84532",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      PRIVATE_KEY: "founder-key",
    });

    expect(sources.values.RPC_URL).toEqual({
      value: "https://cbdp.example.com/base-sepolia",
      source: ".env",
    });
    expect(sources.values.CHAIN_ID).toEqual({ value: "84532", source: ".env" });
    expect(sources.values.ORACLE_WALLET_PRIVATE_KEY).toEqual({ source: "missing" });
  });

  it("applies numeric and boolean overrides from the environment", () => {
    const config = readConfigFromEnv({
      CBDP_RPC_URL: "https://cbdp.example.com/base-sepolia",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      API_LAYER_PROVIDER_RECOVERY_COOLDOWN_MS: "1500",
      API_LAYER_PROVIDER_ERROR_WINDOW_MS: "2500",
      API_LAYER_PROVIDER_ERROR_THRESHOLD: "2",
      API_LAYER_ENABLE_GASLESS: "true",
      API_LAYER_FINALITY_CONFIRMATIONS: "7",
      API_LAYER_ENABLE_ALCHEMY_DIAGNOSTICS: "false",
      API_LAYER_ENABLE_ALCHEMY_SIMULATION: "true",
      API_LAYER_ENFORCE_ALCHEMY_SIMULATION: "true",
      API_LAYER_ALCHEMY_SIMULATION_BLOCK: "latest",
      API_LAYER_ALCHEMY_TRACE_TIMEOUT: "9s",
    });

    expect(config.chainId).toBe(84532);
    expect(config.cbdpRpcUrl).toBe("https://cbdp.example.com/base-sepolia");
    expect(config.alchemyRpcUrl).toBe("https://cbdp.example.com/base-sepolia");
    expect(config.providerRecoveryCooldownMs).toBe(1500);
    expect(config.providerErrorWindowMs).toBe(2500);
    expect(config.providerErrorThreshold).toBe(2);
    expect(config.enableGasless).toBe(true);
    expect(config.finalityConfirmations).toBe(7);
    expect(config.alchemyDiagnosticsEnabled).toBe(false);
    expect(config.alchemySimulationEnabled).toBe(true);
    expect(config.alchemySimulationEnforced).toBe(true);
    expect(config.alchemySimulationBlock).toBe("latest");
    expect(config.alchemyTraceTimeout).toBe("9s");
    expect(config.alchemyEndpointDetected).toBe(false);
  });

  it("accepts native boolean and numeric values when callers provide already-parsed env data", () => {
    const config = readConfigFromEnv({
      CBDP_RPC_URL: "https://cbdp.example.com/base-sepolia",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      API_LAYER_ENABLE_GASLESS: true as never,
      API_LAYER_ENABLE_ALCHEMY_DIAGNOSTICS: false as never,
      API_LAYER_ENABLE_ALCHEMY_SIMULATION: true as never,
      API_LAYER_ENFORCE_ALCHEMY_SIMULATION: false as never,
      API_LAYER_PROVIDER_RECOVERY_COOLDOWN_MS: 1234 as never,
    } as NodeJS.ProcessEnv);

    expect(config.enableGasless).toBe(true);
    expect(config.alchemyDiagnosticsEnabled).toBe(false);
    expect(config.alchemySimulationEnabled).toBe(true);
    expect(config.alchemySimulationEnforced).toBe(false);
    expect(config.providerRecoveryCooldownMs).toBe(1234);
  });

  it("treats 0, blank, and whitespace boolean env values as explicit disables", () => {
    const config = readConfigFromEnv({
      CBDP_RPC_URL: "https://cbdp.example.com/base-sepolia",
      ALCHEMY_RPC_URL: "https://base-sepolia.g.alchemy.com/v2/test-key",
      ALCHEMY_API_KEY: "test-key",
      DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000001",
      API_LAYER_ENABLE_GASLESS: "0",
      API_LAYER_ENABLE_ALCHEMY_DIAGNOSTICS: "",
      API_LAYER_ENABLE_ALCHEMY_SIMULATION: "   ",
      API_LAYER_ENFORCE_ALCHEMY_SIMULATION: " 0 ",
    });

    expect(config.alchemyEndpointDetected).toBe(true);
    expect(config.enableGasless).toBe(false);
    expect(config.alchemyDiagnosticsEnabled).toBe(false);
    expect(config.alchemySimulationEnabled).toBe(false);
    expect(config.alchemySimulationEnforced).toBe(false);
  });

  it("loads repo env files once and lets process env override cached file values", async () => {
    const existsSync = vi.fn(() => true);
    const readFileSync = vi.fn(() => [
      "RPC_URL=https://repo-rpc.example.com",
      "DIAMOND_ADDRESS=0x0000000000000000000000000000000000000002",
      "CHAIN_ID=84533",
    ].join("\n"));
    const originalEnv = { ...process.env };

    process.env.CHAIN_ID = "84532";
    process.env.RPC_URL = "https://runtime-rpc.example.com";

    try {
      const configModule = await importConfigWithFs({ existsSync, readFileSync });

      expect(configModule.loadRepoEnv()).toMatchObject({
        CHAIN_ID: "84532",
        RPC_URL: "https://runtime-rpc.example.com",
        DIAMOND_ADDRESS: "0x0000000000000000000000000000000000000002",
      });
      expect(configModule.loadRepoEnv()).toMatchObject({
        CHAIN_ID: "84532",
        RPC_URL: "https://runtime-rpc.example.com",
      });
      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(readFileSync).toHaveBeenCalledTimes(1);
    } finally {
      process.env = originalEnv;
    }
  });

  it("returns an empty repo env object when the repo .env file is absent", async () => {
    const existsSync = vi.fn(() => false);
    const readFileSync = vi.fn();
    const originalEnv = { ...process.env };

    delete process.env.RPC_URL;

    try {
      const configModule = await importConfigWithFs({ existsSync, readFileSync });

      expect(configModule.loadRepoEnv()).not.toHaveProperty("RPC_URL");
      expect(existsSync).toHaveBeenCalledTimes(1);
      expect(readFileSync).not.toHaveBeenCalled();
    } finally {
      process.env = originalEnv;
    }
  });
});
