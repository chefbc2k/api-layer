import { describe, expect, it } from "vitest";

import { ProviderRouter } from "./provider-router.js";

describe("ProviderRouter", () => {
  it("falls back to the secondary provider on retryable errors", async () => {
    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "http://127.0.0.1:8545",
      alchemyRpcUrl: "http://127.0.0.1:8546",
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
});

