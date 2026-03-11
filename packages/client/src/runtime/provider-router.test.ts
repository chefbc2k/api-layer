import { describe, expect, it, vi } from "vitest";

import { ProviderRouter } from "./provider-router.js";

describe("ProviderRouter", () => {
  it("falls back to the secondary provider on retryable errors", async () => {
    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 60_000,
    });

    let attempts = 0;
    const result = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("HTTP 429 from upstream");
      }
      return providerName;
    });

    expect(result).toBe("alchemy");
  });

  it("recovers the primary provider after cooldown when health probe succeeds", async () => {
    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 0,
    });

    let failPrimary = true;
    await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => {
      if (providerName === "cbdp" && failPrimary) {
        failPrimary = false;
        throw new Error("HTTP 5xx from upstream");
      }
      return providerName;
    });

    const cbdpProvider = (router as unknown as {
      providers: Record<string, { provider: { getBlockNumber: () => Promise<number> } }>;
    }).providers.cbdp.provider;
    vi.spyOn(cbdpProvider, "getBlockNumber").mockResolvedValue(123);

    const result = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => providerName);
    expect(result).toBe("cbdp");
    expect(router.getStatus().cbdp.active).toBe(true);
  });
});
