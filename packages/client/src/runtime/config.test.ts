import { describe, expect, it } from "vitest";

import { isAlchemyRpcUrl, readConfigFromEnv } from "./config.js";

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
});
