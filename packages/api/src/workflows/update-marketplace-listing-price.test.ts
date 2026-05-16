import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMarketplacePrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/marketplace/primitives/generated/index.js", () => ({
  createMarketplacePrimitiveService: mocks.createMarketplacePrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runUpdateMarketplaceListingPriceWorkflow } from "./update-marketplace-listing-price.js";

describe("runUpdateMarketplaceListingPriceWorkflow", () => {
  const auth = { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates listing price and confirms price readback plus event query", async () => {
    const sequence: string[] = [];
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("listing-before");
          return { statusCode: 200, body: { tokenId: "11", price: "25000000", isActive: true } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("listing-after");
          return { statusCode: 200, body: { tokenId: "11", price: "30000000", isActive: true } };
        }),
      updateListingPrice: vi.fn().mockImplementation(async () => {
        sequence.push("update-price");
        return { statusCode: 202, body: { txHash: "0xupdate" } };
      }),
      getAssetState: vi.fn().mockImplementation(async () => {
        sequence.push("asset-state");
        return { statusCode: 200, body: "1" };
      }),
      getOriginalOwner: vi.fn().mockImplementation(async () => {
        sequence.push("original-owner");
        return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
      }),
      isInEscrow: vi.fn().mockImplementation(async () => {
        sequence.push("in-escrow");
        return { statusCode: 200, body: true };
      }),
      listingPriceUpdatedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("price-events");
        return [{ transactionHash: "0xupdate-receipt" }];
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-update");
      return "0xupdate-receipt";
    });

    const result = await runUpdateMarketplaceListingPriceWorkflow({
      providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => {
        sequence.push(`receipt:${label}`);
        return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1201 })) });
      }) },
    } as never, auth as never, undefined, {
      tokenId: "11",
      newPrice: "30000000",
    });

    expect(sequence).toEqual([
      "listing-before",
      "update-price",
      "wait-update",
      "receipt:workflow.updateMarketplaceListingPrice.update.receipt",
      "listing-after",
      "asset-state",
      "original-owner",
      "in-escrow",
      "price-events",
    ]);
    expect(result.listing.eventCount).toBe(1);
    expect((result.listing.after as Record<string, unknown>).price).toBe("30000000");
  });

  it("skips event confirmation when no receipt block is available after price update", async () => {
    const marketplace = {
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "12", price: "1000", isActive: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "12", price: "1200", isActive: true } }),
      updateListingPrice: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xupdate" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      listingPriceUpdatedEventQuery: vi.fn(),
    };
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runUpdateMarketplaceListingPriceWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, undefined, {
      tokenId: "12",
      newPrice: "1200",
    });

    expect(result.listing).toMatchObject({
      txHash: null,
      eventCount: 0,
    });
    expect(marketplace.listingPriceUpdatedEventQuery).not.toHaveBeenCalled();
  });

  it("retries the post-update listing read until the new price becomes visible", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: never[]) => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
    const marketplace = {
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "13", price: "1000", isActive: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "13", price: "1000", isActive: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "13", price: "1200", isActive: true } }),
      updateListingPrice: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xupdate" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      listingPriceUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xupdate-receipt" }]),
    };
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xupdate-receipt");

    try {
      const result = await runUpdateMarketplaceListingPriceWorkflow({
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1202 })),
          })),
        },
      } as never, auth as never, "0x00000000000000000000000000000000000000aa", {
        tokenId: "13",
        newPrice: "1200",
      });

      expect((result.listing.after as Record<string, unknown>).price).toBe("1200");
      expect(marketplace.getListing).toHaveBeenCalledTimes(3);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("falls back to synthetic 500 listing reads when stabilization returns null before the price settles", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: never[]) => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
    const getListing = vi.fn();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      getListing.mockResolvedValueOnce(null);
    }
    getListing.mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "15", price: "1000", isActive: true } });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      getListing.mockResolvedValueOnce(null);
    }
    getListing.mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "15", price: "1400", isActive: true } });
    const marketplace = {
      getListing,
      updateListingPrice: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xupdate" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      listingPriceUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xupdate-fallback" }]),
    };
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xupdate-fallback");

    try {
      const result = await runUpdateMarketplaceListingPriceWorkflow({
        providerRouter: {
          withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
            getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1203 })),
          })),
        },
      } as never, auth as never, undefined, {
        tokenId: "15",
        newPrice: "1400",
      });

      expect((result.listing.before as Record<string, unknown>).price).toBe("1000");
      expect((result.listing.after as Record<string, unknown>).price).toBe("1400");
      expect(marketplace.getListing).toHaveBeenCalledTimes(42);
      expect(result.listing.eventCount).toBe(1);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });
});
