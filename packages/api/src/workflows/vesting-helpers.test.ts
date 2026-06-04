import { describe, expect, it } from "vitest";

import { HttpError } from "../shared/errors.js";
import {
  extractReleasedAmount,
  extractReleasedAmountFromLogs,
  getReleasableFromSummary,
  getReleasedAmount,
  getTotalAmount,
  isAlreadyRevokedError,
  isVestingSchedulePresent,
  normalizeCreateVestingExecutionError,
  normalizeReleaseVestingExecutionError,
  normalizeRevokeVestingExecutionError,
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
    expect(getReleasableFromSummary({ releasable: "8" })).toBe(8n);
    expect(getReleasableFromSummary(null)).toBe(0n);
    expect(getReleasableFromSummary("not-a-record")).toBe(0n);
    expect(extractReleasedAmount(null)).toBeNull();
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

  it("returns zeroed vesting state when a beneficiary has no schedule", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: false }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100" } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: false } }),
      getVestingReleasableAmount: async () => ({ statusCode: 200, body: "5" }),
      getVestingTotalAmount: async () => ({ statusCode: 200, body: { totalVested: "10", totalReleased: "2", releasable: "8" } }),
    };

    const result = await readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000bb",
      "0x00000000000000000000000000000000000000aa",
    );

    expect(result.exists.body).toBe(false);
    expect(result.schedule.body).toBeNull();
    expect(result.details.body).toBeNull();
    expect(result.releasable.body).toBe("0");
    expect(result.totals.body).toEqual({ totalVested: "0", totalReleased: "0", releasable: "0" });
  });

  it("rethrows readback failures when the schedule is not revoked", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: true }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100", revoked: false } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: false } }),
      getVestingReleasableAmount: async () => {
        throw new Error("execution reverted: NoScheduleFound(address)");
      },
      getVestingTotalAmount: async () => ({ statusCode: 200, body: { totalVested: "10", totalReleased: "2", releasable: "8" } }),
    };

    await expect(readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      undefined,
      "0x00000000000000000000000000000000000000aa",
    )).rejects.toThrow("NoScheduleFound");
  });

  it("rethrows totals readback failures when the schedule is not revoked", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: true }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100", revoked: false } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: false } }),
      getVestingReleasableAmount: async () => ({ statusCode: 200, body: "5" }),
      getVestingTotalAmount: async () => {
        throw new Error("execution reverted: totals failed");
      },
    };

    await expect(readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      undefined,
      "0x00000000000000000000000000000000000000aa",
    )).rejects.toThrow("totals failed");
  });

  it("returns live readbacks unchanged for active non-revoked schedules", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: true }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100", releasedAmount: "20", revoked: false } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: false, beneficiary: "0x00000000000000000000000000000000000000aa" } }),
      getVestingReleasableAmount: async () => ({ statusCode: 200, body: "5" }),
      getVestingTotalAmount: async () => ({ statusCode: 200, body: { totalVested: "100", totalReleased: "20", releasable: "5" } }),
    };

    const result = await readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      "0x00000000000000000000000000000000000000bb",
      "0x00000000000000000000000000000000000000aa",
    );

    expect(result.schedule.body).toEqual({ totalAmount: "100", releasedAmount: "20", revoked: false });
    expect(result.details.body).toEqual({ revoked: false, beneficiary: "0x00000000000000000000000000000000000000aa" });
    expect(result.releasable.body).toBe("5");
    expect(result.totals.body).toEqual({ totalVested: "100", totalReleased: "20", releasable: "5" });
  });

  it("treats detail-only revoked schedules as zeroed when post-state amount reads return AlreadyRevoked", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: true }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100", revoked: false } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: true } }),
      getVestingReleasableAmount: async () => {
        throw new Error("execution reverted: AlreadyRevoked(bytes32)");
      },
      getVestingTotalAmount: async () => {
        throw new Error("execution reverted: AlreadyRevoked(bytes32)");
      },
    };

    const result = await readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      undefined,
      "0x00000000000000000000000000000000000000aa",
    );

    expect(result.releasable.body).toBe("0");
    expect(result.totals.body).toEqual({ totalVested: "0", totalReleased: "0", releasable: "0" });
  });

  it("rethrows totals readback failures for revoked schedules when the revert is not AlreadyRevoked", async () => {
    const vesting = {
      hasVestingSchedule: async () => ({ statusCode: 200, body: true }),
      getStandardVestingSchedule: async () => ({ statusCode: 200, body: { totalAmount: "100", revoked: true } }),
      getVestingDetails: async () => ({ statusCode: 200, body: { revoked: false } }),
      getVestingReleasableAmount: async () => ({ statusCode: 200, body: "5" }),
      getVestingTotalAmount: async () => {
        throw new Error("execution reverted: totals failed while revoked");
      },
    };

    await expect(readVestingState(
      vesting,
      { apiKey: "test", label: "test", roles: ["service"], allowGasless: false },
      undefined,
      "0x00000000000000000000000000000000000000aa",
    )).rejects.toThrow("totals failed while revoked");
  });

  it("normalizes create-vesting execution errors into workflow-specific HttpErrors", () => {
    const diagnostics = { txHash: "0xcreate" };

    expect(normalizeCreateVestingExecutionError({ message: "execution reverted: UnauthorizedUser(address)", diagnostics }, "team"))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "create-beneficiary-vesting blocked by insufficient caller authority: signer lacks VESTING_MANAGER_ROLE for team schedules",
        diagnostics,
      });
    expect(normalizeCreateVestingExecutionError({ diagnostics: { data: "0xf4d678b8" } }, "team"))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "create-beneficiary-vesting requires caller token balance to reserve the vesting amount",
      });
    expect(normalizeCreateVestingExecutionError(new Error("execution reverted: ScheduleExists(address)"), "team"))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "create-beneficiary-vesting blocked by wrong beneficiary state: beneficiary already has a vesting schedule",
      });
    expect(normalizeCreateVestingExecutionError(new Error("execution reverted: InvalidAmount()"), "team"))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "create-beneficiary-vesting requires a non-zero amount",
      });
    expect(normalizeCreateVestingExecutionError(new Error("execution reverted (unknown custom error) data=\"0x1a3b45fd\""), "team"))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "create-beneficiary-vesting requires a valid beneficiary address",
      });
  });

  it("preserves unknown create/release errors and normalizes selector-only diagnostics", () => {
    expect(
      normalizeCreateVestingExecutionError(
        { diagnostics: { nested: [{ selector: "0x2ce551cb" }, true, 7n] } },
        "team",
      ),
    ).toMatchObject<HttpError>({
      statusCode: 409,
      message: "create-beneficiary-vesting blocked by wrong beneficiary state: beneficiary already has a vesting schedule",
    });

    const createUnknown = new Error("execution reverted: unknown create");
    expect(normalizeCreateVestingExecutionError(createUnknown, "team")).toBe(createUnknown);

    const releaseUnknown = new Error("execution reverted: unknown release");
    expect(normalizeReleaseVestingExecutionError(releaseUnknown)).toBe(releaseUnknown);
  });

  it("preserves unknown vesting errors while traversing primitive diagnostic payloads", () => {
    const releaseUnknown = {
      message: "execution reverted: unknown release",
      diagnostics: {
        gateOpen: false,
        remaining: 7n,
      },
    };

    expect(normalizeReleaseVestingExecutionError(releaseUnknown)).toBe(releaseUnknown);
  });

  it("normalizes release-vesting execution errors, including cliff-period diagnostics", () => {
    expect(normalizeReleaseVestingExecutionError(new Error("execution reverted: NoScheduleFound(address)")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "release-beneficiary-vesting blocked by wrong beneficiary state: schedule not found",
      });
    expect(normalizeReleaseVestingExecutionError(new Error("execution reverted (unknown custom error) data=\"0x90315de1\"")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "release-beneficiary-vesting blocked by wrong beneficiary state: schedule already revoked",
      });
    expect(
      normalizeReleaseVestingExecutionError(
        new Error(
          "execution reverted (unknown custom error) data=\"0x4b53d0ef0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a\"",
        ),
      ),
    ).toMatchObject<HttpError>({
      statusCode: 409,
      message: "release-beneficiary-vesting blocked by setup/state: beneficiary is still in cliff period until 42",
    });
    expect(normalizeReleaseVestingExecutionError(new Error("execution reverted: NothingToRelease()")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "release-beneficiary-vesting blocked by setup/state: no releasable amount",
      });
    expect(normalizeReleaseVestingExecutionError(new Error("execution reverted: InCliffPeriod()")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "release-beneficiary-vesting blocked by setup/state: beneficiary is still in cliff period until unknown",
      });
  });

  it("normalizes revoke-vesting execution errors and preserves unknown failures", () => {
    expect(normalizeRevokeVestingExecutionError(new Error("execution reverted: UnauthorizedUser(address)")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "revoke-beneficiary-vesting blocked by insufficient caller authority: signer lacks VESTING_MANAGER_ROLE",
      });
    expect(normalizeRevokeVestingExecutionError(new Error("execution reverted: NoScheduleFound(address)")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "revoke-beneficiary-vesting blocked by wrong beneficiary state: schedule not found",
      });
    expect(normalizeRevokeVestingExecutionError(new Error("execution reverted: NotRevocable()")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "revoke-beneficiary-vesting blocked by wrong beneficiary state: schedule is not revocable",
      });
    expect(normalizeRevokeVestingExecutionError(new Error("execution reverted: AlreadyRevoked(bytes32)")))
      .toMatchObject<HttpError>({
        statusCode: 409,
        message: "revoke-beneficiary-vesting blocked by wrong beneficiary state: schedule already revoked",
      });

    const unknown = new Error("execution reverted: unknown");
    expect(normalizeRevokeVestingExecutionError(unknown)).toBe(unknown);
  });
});
