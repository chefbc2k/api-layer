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
});
