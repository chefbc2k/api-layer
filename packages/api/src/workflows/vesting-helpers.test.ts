import { describe, expect, it } from "vitest";

import {
  extractReleasedAmount,
  extractReleasedAmountFromLogs,
  getReleasableFromSummary,
  getReleasedAmount,
  getTotalAmount,
  isAlreadyRevokedError,
  isVestingSchedulePresent,
  isVestingScheduleRevoked,
  readVestingState,
} from "./vesting-helpers.js";

describe("vesting helpers", () => {
  it("reads schedule presence and state from object payloads", () => {
    expect(isVestingSchedulePresent({ totalAmount: "100" })).toBe(true);
    expect(isVestingSchedulePresent({})).toBe(false);
    expect(isVestingScheduleRevoked({ revoked: true })).toBe(true);
    expect(isVestingScheduleRevoked({ revoked: false })).toBe(false);
    expect(getReleasedAmount({ releasedAmount: "25" })).toBe(25n);
    expect(getTotalAmount({ totalAmount: "100" })).toBe(100n);
    expect(getReleasableFromSummary({ releasable: "15" })).toBe(15n);
  });

  it("supports tuple-style totals and scalar release extraction", () => {
    expect(getReleasableFromSummary(["100", "20", "5"])).toBe(5n);
    expect(getReleasableFromSummary(null)).toBe(0n);
    expect(extractReleasedAmount({ result: "12" })).toBe("12");
    expect(extractReleasedAmount({ result: 13 })).toBe("13");
    expect(extractReleasedAmount({ result: 14n })).toBe("14");
    expect(extractReleasedAmount({ result: false })).toBeNull();
  });

  it("extracts released amounts from matching logs only", () => {
    expect(extractReleasedAmountFromLogs([{ transactionHash: "0xaaa", amount: "9" }], "0xaaa")).toBe("9");
    expect(extractReleasedAmountFromLogs([{ transactionHash: "0xaaa", amount: 7n }], "0xaaa")).toBe("7");
    expect(extractReleasedAmountFromLogs([{ transactionHash: "0xaaa" }], "0xaaa")).toBeNull();
    expect(extractReleasedAmountFromLogs([{ transactionHash: "0xaaa", amount: "9" }], "0xbbb")).toBeNull();
  });

  it("recognizes AlreadyRevoked errors", () => {
    expect(isAlreadyRevokedError(new Error("execution reverted: AlreadyRevoked(bytes32)"))).toBe(true);
    expect(isAlreadyRevokedError(new Error("execution reverted (unknown custom error) data=\"0x90315de1\""))).toBe(true);
    expect(isAlreadyRevokedError(new Error("execution reverted: NoScheduleFound(address)"))).toBe(false);
  });

  it("normalizes revoked post-state readbacks when amount queries revert", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: true }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100", revoked: true } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: true } }),
      getVestingReleasableAmount: async () => {
        throw new Error("execution reverted: AlreadyRevoked(bytes32)");
      },
      getVestingTotalAmount: async () => {
        throw new Error("execution reverted (unknown custom error) data=\"0x90315de1\"");
      },
    };

    const result = await readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      undefined,
      "0x00000000000000000000000000000000000000aa",
    );

    expect(result.schedule.body).toEqual({ totalAmount: "100", revoked: true });
    expect(result.releasable.body).toBe("0");
    expect(result.totals.body).toEqual({ totalVested: "0", totalReleased: "0", releasable: "0" });
  });
});
