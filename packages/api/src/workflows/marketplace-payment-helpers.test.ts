import { describe, expect, it, vi } from "vitest";

import { readMarketplacePaymentConfig, readPendingPaymentsSnapshot } from "./marketplace-payment-helpers.js";

describe("marketplace payment helpers", () => {
  it("reads payment config and normalizes addresses", async () => {
    const marketplace = {
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000CC" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000DD" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000EE" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000FF" }),
      getPendingPayments: vi.fn(),
    };

    await expect(readMarketplacePaymentConfig(marketplace, { apiKey: "test-key" } as never, undefined)).resolves.toEqual({
      paymentToken: "0x00000000000000000000000000000000000000cc",
      marketplacePaused: false,
      paymentPaused: true,
      treasury: "0x00000000000000000000000000000000000000dd",
      devFund: "0x00000000000000000000000000000000000000ee",
      unionTreasury: "0x00000000000000000000000000000000000000ff",
    });
  });

  it("returns nulls for non-boolean pause flags and non-address readbacks", async () => {
    const marketplace = {
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: { unexpected: true } }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: "paused" }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: 1 }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: null }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "not-an-address" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: undefined }),
      getPendingPayments: vi.fn(),
    };

    await expect(readMarketplacePaymentConfig(marketplace, { apiKey: "test-key" } as never, undefined)).resolves.toEqual({
      paymentToken: null,
      marketplacePaused: null,
      paymentPaused: null,
      treasury: null,
      devFund: null,
      unionTreasury: null,
    });
  });

  it("reads pending payments snapshots and tolerates missing payees", async () => {
    const marketplace = {
      getUsdcToken: vi.fn(),
      isPaused: vi.fn(),
      paymentPaused: vi.fn(),
      getTreasuryAddress: vi.fn(),
      getDevFundAddress: vi.fn(),
      getUnionTreasuryAddress: vi.fn(),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "4" }),
    };

    await expect(readPendingPaymentsSnapshot(marketplace, { apiKey: "test-key" } as never, undefined, {
      seller: "0x00000000000000000000000000000000000000aa",
      treasury: "0x00000000000000000000000000000000000000bb",
      devFund: "0x00000000000000000000000000000000000000cc",
      unionTreasury: "0x00000000000000000000000000000000000000dd",
      payee: null,
    })).resolves.toEqual({
      seller: "1",
      treasury: "2",
      devFund: "3",
      unionTreasury: "4",
      payee: null,
    });
  });

  it("omits payee when it is not requested and preserves extra keyed readbacks", async () => {
    const marketplace = {
      getUsdcToken: vi.fn(),
      isPaused: vi.fn(),
      paymentPaused: vi.fn(),
      getTreasuryAddress: vi.fn(),
      getDevFundAddress: vi.fn(),
      getUnionTreasuryAddress: vi.fn(),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: 11 })
        .mockResolvedValueOnce({ statusCode: 200, body: 12n })
        .mockResolvedValueOnce({ statusCode: 200, body: { malformed: true } }),
    };

    await expect(readPendingPaymentsSnapshot(marketplace, { apiKey: "test-key" } as never, "0x00000000000000000000000000000000000000aa", {
      seller: "0x00000000000000000000000000000000000000aa",
      treasury: null,
      devFund: "0x00000000000000000000000000000000000000bb",
      unionTreasury: null,
      collaborator: "0x00000000000000000000000000000000000000cc",
    } as never)).resolves.toEqual({
      seller: "11",
      treasury: null,
      devFund: "12",
      unionTreasury: null,
      collaborator: null,
    });
  });
});
