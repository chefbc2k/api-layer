import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readListingWithStabilization,
  readMarketplaceEscrowState,
  readOwnerOf,
  safeReadRoute,
} from "./marketplace-listing-helpers.js";

describe("marketplace listing helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("stabilizes listing reads and supports direct owner reads", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const marketplace = {
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { pending: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: true } }),
      getAssetState: vi.fn(),
      getOriginalOwner: vi.fn(),
      isInEscrow: vi.fn(),
    };
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
    };

    await expect(readListingWithStabilization(marketplace, { apiKey: "test-key" } as never, undefined, "11")).resolves.toEqual({
      statusCode: 200,
      body: { tokenId: "11", isActive: true },
    });
    await expect(readOwnerOf(voiceAssets, { apiKey: "test-key" } as never, undefined, "11")).resolves.toEqual({
      statusCode: 200,
      body: "0x0000000000000000000000000000000000000ddd",
    });

    expect(marketplace.getListing).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it("returns the last listing read when stabilization never completes and tolerates read failures in escrow state", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const marketplace = {
      getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { pending: true } }),
      getAssetState: vi.fn().mockRejectedValue(new Error("asset-state unavailable")),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockRejectedValue(new Error("in-escrow unavailable")),
    };

    await expect(readListingWithStabilization(marketplace, { apiKey: "test-key" } as never, undefined, "11")).resolves.toEqual({
      statusCode: 200,
      body: { pending: true },
    });
    await expect(readMarketplaceEscrowState(marketplace, { apiKey: "test-key" } as never, undefined, "11")).resolves.toEqual({
      assetState: null,
      originalOwner: "0x00000000000000000000000000000000000000aa",
      inEscrow: null,
    });

    expect(marketplace.getListing).toHaveBeenCalledTimes(20);
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it("returns null for safe read failures", async () => {
    await expect(safeReadRoute(async () => {
      throw new Error("boom");
    })).resolves.toBeNull();
  });
});
