import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMarketplacePrimitiveService: vi.fn(),
}));

vi.mock("../modules/marketplace/primitives/generated/index.js", () => ({
  createMarketplacePrimitiveService: mocks.createMarketplacePrimitiveService,
}));

import { runInspectRevenuePostureWorkflow } from "./inspect-revenue-posture.js";

describe("runInspectRevenuePostureWorkflow", () => {
  const auth = {
    apiKey: "finance-key",
    label: "finance",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getRevenueMetrics: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalVolume: "100", totalFees: "5", totalRoyalties: "2", totalReferrals: "1" } }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "20" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "4" })
        .mockResolvedValueOnce({ statusCode: 200, body: "5" })
        .mockResolvedValueOnce({ statusCode: 200, body: "7" })
        .mockResolvedValueOnce({ statusCode: 200, body: "8" }),
      getAssetRevenue: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { grossRevenue: "10" } })
        .mockResolvedValueOnce({ statusCode: 200, body: { grossRevenue: "15" } }),
      getTreasuryWithdrawalLimit: vi.fn().mockResolvedValue({ statusCode: 200, body: ["1000", "86400", "60", "100", "1700000000"] }),
      getBuybackStatus: vi.fn().mockResolvedValue({ statusCode: 200, body: { paused: false, accumulator: "12" } }),
    });
  });

  it("inspects revenue posture with treasury controls and additional payees", async () => {
    const result = await runInspectRevenuePostureWorkflow(context, auth, undefined, {
      assetTokenIds: ["11", "12"],
      additionalPayees: [
        "0x0000000000000000000000000000000000000011",
        "0x0000000000000000000000000000000000000012",
      ],
      includeTreasuryControls: true,
    });

    expect(result.funding).toEqual({
      paymentToken: "0x00000000000000000000000000000000000000cc",
      marketplacePaused: false,
      paymentPaused: false,
      treasury: "0x00000000000000000000000000000000000000dd",
      devFund: "0x00000000000000000000000000000000000000ee",
      unionTreasury: "0x00000000000000000000000000000000000000ff",
    });
    expect(result.revenue.assetRevenues).toEqual([
      { tokenId: "11", revenue: { grossRevenue: "10" } },
      { tokenId: "12", revenue: { grossRevenue: "15" } },
    ]);
    expect(result.pending.additionalPayees).toEqual([
      { payee: "0x0000000000000000000000000000000000000011", pending: "5" },
      { payee: "0x0000000000000000000000000000000000000012", pending: "7" },
    ]);
    expect(result.treasuryControls).toEqual({
      treasuryWithdrawalLimit: ["1000", "86400", "60", "100", "1700000000"],
      buybackStatus: { paused: false, accumulator: "12" },
    });
  });

  it("returns posture without treasury controls when not requested", async () => {
    const result = await runInspectRevenuePostureWorkflow(context, auth, undefined, {});

    expect(result.revenue.assetRevenues).toEqual([]);
    expect(result.pending.additionalPayees).toEqual([]);
    expect(result.treasuryControls).toBeNull();
    expect(result.summary.includeTreasuryControls).toBe(false);
  });
});
