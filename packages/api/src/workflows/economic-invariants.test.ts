import { describe, expect, it } from "vitest";

import {
  allocateBasisPointSplit,
  assertConservedDeltas,
  assertExactAmountDelta,
  assertNoEconomicSideEffects,
  readEconomicAmount,
} from "./economic-invariants.js";

describe("economic invariant assertions", () => {
  it("normalizes bigint, safe-number, and signed string amounts", () => {
    expect(readEconomicAmount(4n, "amount")).toBe(4n);
    expect(readEconomicAmount(5, "amount")).toBe(5n);
    expect(readEconomicAmount("-6", "amount")).toBe(-6n);
  });

  it("rejects unsafe and malformed amounts", () => {
    expect(() => readEconomicAmount(Number.MAX_SAFE_INTEGER + 1, "amount")).toThrow("safe integer");
    expect(() => readEconomicAmount("1.5", "amount")).toThrow("integer amount");
  });

  it("proves exact lock, unlock, mint, burn, and transfer deltas", () => {
    expect(assertExactAmountDelta("stake.lock", "100", "60", -40n).delta).toBe("-40");
    expect(assertExactAmountDelta("withdraw.unlock", "10", "25", 15n).delta).toBe("15");
    expect(assertExactAmountDelta("supply.mint", "1000", "1025", 25n).delta).toBe("25");
    expect(assertExactAmountDelta("supply.burn", "1025", "1005", -20n).delta).toBe("-20");
    expect(assertConservedDeltas("transfer", [-15n, 15n])).toBe("0");
  });

  it("rejects over-crediting, under-debiting, and non-conserved movement", () => {
    expect(() => assertExactAmountDelta("reward.claim", "5", "26", 20n)).toThrow("expected delta 20, observed 21");
    expect(() => assertConservedDeltas("treasury.move", [-100n, 60n, 25n, 14n])).toThrow("expected net 0, observed -1");
  });

  it("proves repeat calls, failed transactions, and partial failures have no side effects", () => {
    const snapshot = {
      payer: "900",
      payee: "100",
      supply: "1000",
      pending: 0,
    };
    expect(() => assertNoEconomicSideEffects("failed-transaction", snapshot, { ...snapshot })).not.toThrow();
    expect(() => assertNoEconomicSideEffects("partial-failure", snapshot, { ...snapshot, pending: 1 })).toThrow("expected delta 0, observed 1");
    expect(() => assertNoEconomicSideEffects("repeat-call", snapshot, { payer: "900", payee: "100", supply: "1000" })).toThrow("snapshot key pending is missing");
  });

  it("allocates rounding dust deterministically while conserving the payment total", () => {
    expect(allocateBasisPointSplit("101", {
      seller: 8_500,
      treasury: 1_000,
      devFund: 500,
    }, "seller")).toEqual({
      seller: "86",
      treasury: "10",
      devFund: "5",
    });
  });

  it("rejects invalid split definitions", () => {
    expect(() => allocateBasisPointSplit("-1", { seller: 10_000 }, "seller")).toThrow("non-negative");
    expect(() => allocateBasisPointSplit("1", {}, "seller")).toThrow("requires shares");
    expect(() => allocateBasisPointSplit("1", { seller: 10_000 }, "treasury")).toThrow("remainder recipient");
    expect(() => allocateBasisPointSplit("1", { seller: 9_999.5, treasury: 0.5 }, "seller")).toThrow("non-negative integer");
    expect(() => allocateBasisPointSplit("1", { seller: 9_999 }, "seller")).toThrow("must total 10000");
  });
});
