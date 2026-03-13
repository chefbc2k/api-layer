import { describe, expect, it } from "vitest";

import {
  extractReleasedAmount,
  extractReleasedAmountFromLogs,
  getReleasableFromSummary,
  getReleasedAmount,
  getTotalAmount,
  isVestingSchedulePresent,
  isVestingScheduleRevoked,
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
});
