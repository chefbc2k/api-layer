import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTimeout as nodeClearTimeout, setTimeout as nodeSetTimeout } from "node:timers";

import { ProviderRouter } from "./provider-router.js";

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  globalThis.setTimeout = globalThis.setTimeout ?? nodeSetTimeout;
  globalThis.clearTimeout = globalThis.clearTimeout ?? nodeClearTimeout;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-08T08:00:00.000Z"));
});

describe("ProviderRouter", () => {
  it("keeps cbdp active until retryable errors reach the rolling threshold", async () => {
    vi.setSystemTime(new Date("2026-04-08T08:05:00.000Z"));

    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 2,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 60_000,
    });

    await expect(
      router.withProvider("events", "VoiceAssetFacet.AssetRegistered", async () => {
        throw new Error("service unavailable");
      }),
    ).rejects.toThrow("service unavailable");
    expect(router.getStatus()).toEqual({
      cbdp: { active: true, errorCount: 1 },
      alchemy: { active: false, errorCount: 0 },
    });

    vi.setSystemTime(new Date("2026-04-08T08:05:10.000Z"));

    await expect(
      router.withProvider("events", "VoiceAssetFacet.AssetRegistered", async () => {
        throw new Error("service unavailable");
      }),
    ).rejects.toThrow("service unavailable");
    expect(router.getStatus()).toEqual({
      cbdp: { active: false, errorCount: 2 },
      alchemy: { active: true, errorCount: 0 },
    });
  });

  it("prunes expired errors before counting health and failover state", async () => {
    vi.setSystemTime(new Date("2026-04-08T08:10:00.000Z"));

    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 2,
      errorWindowMs: 1_000,
      recoveryCooldownMs: 60_000,
    });

    await expect(
      router.withProvider("read", "AccessControlFacet.getQuorum", async () => {
        throw new Error("timeout while reading upstream");
      }),
    ).rejects.toThrow("timeout while reading upstream");
    expect(router.getStatus().cbdp).toEqual({ active: true, errorCount: 1 });

    vi.setSystemTime(new Date("2026-04-08T08:10:02.500Z"));

    await expect(
      router.withProvider("read", "AccessControlFacet.getQuorum", async () => {
        throw new Error("timeout while reading upstream");
      }),
    ).rejects.toThrow("timeout while reading upstream");

    expect(router.getStatus().cbdp).toEqual({ active: true, errorCount: 1 });
  });

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

  it("stays on alchemy and refreshes cooldown when the primary recovery probe fails", async () => {
    vi.setSystemTime(new Date("2026-04-08T08:15:00.000Z"));

    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 5_000,
    });

    let firstAttempt = true;
    await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => {
      if (providerName === "cbdp" && firstAttempt) {
        firstAttempt = false;
        throw new Error("HTTP 5xx from upstream");
      }
      return providerName;
    });

    const providers = (router as unknown as {
      providers: Record<string, { provider: { getBlockNumber: () => Promise<number> } }>;
    }).providers;
    vi.spyOn(providers.cbdp.provider, "getBlockNumber").mockRejectedValue(new Error("still unhealthy"));

    const firstAlchemyResult = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => providerName);
    expect(firstAlchemyResult).toBe("alchemy");
    expect(providers.cbdp.provider.getBlockNumber).toHaveBeenCalledTimes(0);

    vi.setSystemTime(new Date("2026-04-08T08:15:06.000Z"));
    const secondAlchemyResult = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => providerName);
    expect(secondAlchemyResult).toBe("alchemy");
    expect(providers.cbdp.provider.getBlockNumber).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-04-08T08:15:08.000Z"));
    const thirdAlchemyResult = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => providerName);
    expect(thirdAlchemyResult).toBe("alchemy");
    expect(providers.cbdp.provider.getBlockNumber).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-04-08T08:15:12.000Z"));
    const fourthAlchemyResult = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => providerName);
    expect(fourthAlchemyResult).toBe("alchemy");
    expect(providers.cbdp.provider.getBlockNumber).toHaveBeenCalledTimes(2);
    expect(router.getStatus().alchemy.active).toBe(true);
  });

  it("retries back to cbdp when active alchemy fails without changing the active provider", async () => {
    vi.setSystemTime(new Date("2026-04-08T08:20:00.000Z"));

    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 60_000,
    });

    let activateFailover = true;
    await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => {
      if (providerName === "cbdp" && activateFailover) {
        activateFailover = false;
        throw new Error("HTTP 429 from upstream");
      }
      return providerName;
    });

    const attempts: string[] = [];
    const result = await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => {
      attempts.push(providerName);
      if (providerName === "alchemy") {
        throw new Error("service unavailable");
      }
      return providerName;
    });

    expect(result).toBe("cbdp");
    expect(attempts).toEqual(["alchemy", "cbdp"]);
    expect(router.getStatus()).toEqual({
      cbdp: { active: false, errorCount: 1 },
      alchemy: { active: true, errorCount: 1 },
    });
  });

  it("keeps writes pinned to cbdp even while read traffic is failed over to alchemy", async () => {
    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 60_000,
    });

    let firstRead = true;
    await router.withProvider("read", "AccessControlFacet.getQuorum", async (_provider, providerName) => {
      if (providerName === "cbdp" && firstRead) {
        firstRead = false;
        throw new Error("HTTP 429 from upstream");
      }
      return providerName;
    });

    const attempts: string[] = [];
    const result = await router.withProvider("write", "VoiceAssetFacet.registerVoiceAsset", async (_provider, providerName) => {
      attempts.push(providerName);
      return providerName;
    });

    expect(result).toBe("cbdp");
    expect(attempts).toEqual(["cbdp"]);
    expect(router.getStatus().alchemy.active).toBe(true);
  });

  it("does not fail over writes to the secondary provider", async () => {
    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 60_000,
    });

    const attempts: string[] = [];
    await expect(
      router.withProvider("write", "VoiceAssetFacet.registerVoiceAsset", async (_provider, providerName) => {
        attempts.push(providerName);
        throw new Error("HTTP 429 from upstream");
      }),
    ).rejects.toThrow("HTTP 429 from upstream");

    expect(attempts).toEqual(["cbdp"]);
  });

  it("does not trip provider failover on non-retryable contract reverts", async () => {
    const router = new ProviderRouter({
      chainId: 84532,
      cbdpRpcUrl: "https://primary-rpc.example/base-sepolia",
      alchemyRpcUrl: "https://secondary-rpc.example/base-sepolia",
      errorThreshold: 1,
      errorWindowMs: 60_000,
      recoveryCooldownMs: 60_000,
    });

    await expect(
      router.withProvider("read", "UpgradeControllerFacet.getUpgrade", async () => {
        throw new Error("execution reverted: OperationNotFound(bytes32)");
      }),
    ).rejects.toThrow("OperationNotFound");

    expect(router.getStatus().cbdp.active).toBe(true);
    expect(router.getStatus().cbdp.errorCount).toBe(0);
  });

  it.each([
    "rate limit exceeded upstream",
    "too many requests from upstream",
    "compute units per second exhausted",
    "throughput limit reached",
    "bad gateway from upstream",
  ])("treats \"%s\" as retryable upstream pressure", async (message) => {
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
        throw new Error(message);
      }
      return providerName;
    });

    expect(result).toBe("alchemy");
    expect(router.getStatus()).toEqual({
      cbdp: { active: false, errorCount: 1 },
      alchemy: { active: true, errorCount: 0 },
    });
  });

});
