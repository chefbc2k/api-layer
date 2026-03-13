import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTokenomicsPrimitiveService: vi.fn(),
}));

vi.mock("../modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

import { runInspectBeneficiaryVestingWorkflow } from "./inspect-beneficiary-vesting.js";

describe("runInspectBeneficiaryVestingWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the structured beneficiary vesting read model", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getStandardVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalAmount: "500", revoked: false } }),
      getVestingDetails: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalAmount: "500", releasedAmount: "25" } }),
      getVestingReleasableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "10" }),
      getVestingTotalAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalVested: "100", totalReleased: "25", releasable: "10" } }),
    });

    const result = await runInspectBeneficiaryVestingWorkflow({} as never, {
      apiKey: "test-key",
    } as never, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000bb",
    });

    expect(result).toEqual({
      vesting: {
        exists: true,
        schedule: { totalAmount: "500", revoked: false },
        details: { totalAmount: "500", releasedAmount: "25" },
        releasable: "10",
        totals: { totalVested: "100", totalReleased: "25", releasable: "10" },
      },
      summary: {
        beneficiary: "0x00000000000000000000000000000000000000bb",
        hasSchedule: true,
      },
    });
  });

  it("returns a stable empty state when no schedule exists", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      hasVestingSchedule: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getStandardVestingSchedule: vi.fn(),
      getVestingDetails: vi.fn(),
      getVestingReleasableAmount: vi.fn(),
      getVestingTotalAmount: vi.fn(),
    });

    const result = await runInspectBeneficiaryVestingWorkflow({} as never, {
      apiKey: "test-key",
    } as never, undefined, {
      beneficiary: "0x00000000000000000000000000000000000000cc",
    });

    expect(result).toEqual({
      vesting: {
        exists: false,
        schedule: null,
        details: null,
        releasable: "0",
        totals: { totalVested: "0", totalReleased: "0", releasable: "0" },
      },
      summary: {
        beneficiary: "0x00000000000000000000000000000000000000cc",
        hasSchedule: false,
      },
    });
  });
});
