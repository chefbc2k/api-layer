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

import { runCancelMarketplaceListingWorkflow } from "./cancel-marketplace-listing.js";

describe("runCancelMarketplaceListingWorkflow", () => {
  const auth = { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels listing and confirms inactive state plus cancellation event", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: false } }),
      cancelListing: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcancel" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      listingCancelledEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xcancel-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcancel-receipt");

    const result = await runCancelMarketplaceListingWorkflow({
      providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1301 })) })) },
    } as never, auth as never, undefined, {
      tokenId: "11",
    });

    expect((result.listing.after as Record<string, unknown>).isActive).toBe(false);
    expect(result.listing.eventCount).toBe(1);
  });

  it("skips receipt and event inspection when cancel listing does not return a tx hash", async () => {
    const listingCancelledEventQuery = vi.fn();
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: false } }),
      cancelListing: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcancel" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      listingCancelledEventQuery,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runCancelMarketplaceListingWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, undefined, {
      tokenId: "11",
    });

    expect(result.listing.txHash).toBeNull();
    expect(result.listing.eventCount).toBe(0);
    expect(listingCancelledEventQuery).not.toHaveBeenCalled();
  });

  it("retries stabilized listing reads when interim listing responses are null", async () => {
    const listingCancelledEventQuery = vi.fn().mockResolvedValue([{ transactionHash: "0xcancel-retry" }]);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: never[]) => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: true } })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: false } }),
      cancelListing: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcancel" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      listingCancelledEventQuery,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcancel-retry");

    try {
      const result = await runCancelMarketplaceListingWorkflow({
        providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1302 })) })) },
      } as never, auth as never, undefined, {
        tokenId: "11",
      });

      expect((result.listing.before as Record<string, unknown>).isActive).toBe(true);
      expect((result.listing.after as Record<string, unknown>).isActive).toBe(false);
      expect(result.listing.eventCount).toBe(1);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("falls back to synthetic 500 listing reads when stabilization returns null before succeeding", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: never[]) => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
    const getListing = vi.fn();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      getListing.mockResolvedValueOnce(null);
    }
    getListing.mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "14", isActive: true } });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      getListing.mockResolvedValueOnce(null);
    }
    getListing.mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "14", isActive: false } });
    const listingCancelledEventQuery = vi.fn().mockResolvedValue([{ transactionHash: "0xcancel-fallback" }]);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getListing,
      cancelListing: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcancel" } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      listingCancelledEventQuery,
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcancel-fallback");

    try {
      const result = await runCancelMarketplaceListingWorkflow({
        providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1303 })) })) },
      } as never, auth as never, undefined, {
        tokenId: "14",
      });

      expect((result.listing.before as Record<string, unknown>).tokenId).toBe("14");
      expect((result.listing.after as Record<string, unknown>).isActive).toBe(false);
      expect(getListing).toHaveBeenCalledTimes(42);
      expect(result.listing.eventCount).toBe(1);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

});
