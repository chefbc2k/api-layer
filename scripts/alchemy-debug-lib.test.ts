import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./alchemy-debug-lib.js";

describe("resolveRuntimeConfig", () => {
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
});
