import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMarketplacePrimitiveService: vi.fn(),
  createVoiceAssetsPrimitiveService: vi.fn(),
}));

vi.mock("../modules/marketplace/primitives/generated/index.js", () => ({
  createMarketplacePrimitiveService: mocks.createMarketplacePrimitiveService,
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

import { runInspectMarketplaceListingWorkflow } from "./inspect-marketplace-listing.js";

describe("runInspectMarketplaceListingWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the listing, escrow, and owner read model", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { tokenId: "11", isActive: true } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
    });

    const result = await runInspectMarketplaceListingWorkflow({} as never, { apiKey: "test-key" } as never, undefined, {
      tokenId: "11",
    });

    expect(result).toEqual({
      listing: { tokenId: "11", isActive: true },
      escrow: {
        assetState: "1",
        originalOwner: "0x00000000000000000000000000000000000000aa",
        inEscrow: true,
      },
      ownership: {
        owner: "0x0000000000000000000000000000000000000ddd",
      },
      summary: {
        tokenId: "11",
        hasListing: true,
        inEscrow: true,
      },
    });
  });

  it("returns stable nulls when listing or owner reads are unavailable", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing: vi.fn().mockResolvedValue({ statusCode: 500, body: null }),
      getAssetState: vi.fn().mockRejectedValue(new Error("asset state unavailable")),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockRejectedValue(new Error("owner unavailable")),
    });

    const result = await runInspectMarketplaceListingWorkflow({} as never, { apiKey: "test-key" } as never, undefined, {
      tokenId: "12",
    });

    expect(result).toEqual({
      listing: null,
      escrow: {
        assetState: null,
        originalOwner: "0x00000000000000000000000000000000000000aa",
        inEscrow: false,
      },
      ownership: {
        owner: null,
      },
      summary: {
        tokenId: "12",
        hasListing: false,
        inEscrow: false,
      },
    });
    setTimeoutSpy.mockRestore();
  });
});
