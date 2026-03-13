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
});
