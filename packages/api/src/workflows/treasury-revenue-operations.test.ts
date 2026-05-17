import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runInspectRevenuePostureWorkflow: vi.fn(),
  runWithdrawMarketplacePaymentsWorkflow: vi.fn(),
}));

vi.mock("./inspect-revenue-posture.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-revenue-posture.js")>("./inspect-revenue-posture.js");
  return {
    ...actual,
    runInspectRevenuePostureWorkflow: mocks.runInspectRevenuePostureWorkflow,
  };
});

vi.mock("./withdraw-marketplace-payments.js", async () => {
  const actual = await vi.importActual<typeof import("./withdraw-marketplace-payments.js")>("./withdraw-marketplace-payments.js");
  return {
    ...actual,
    runWithdrawMarketplacePaymentsWorkflow: mocks.runWithdrawMarketplacePaymentsWorkflow,
  };
});

import { runTreasuryRevenueOperationsWorkflow } from "./treasury-revenue-operations.js";

describe("runTreasuryRevenueOperationsWorkflow", () => {
  const auth = {
    apiKey: "finance-key",
    label: "finance",
    roles: ["service"],
    allowGasless: false,
  };
  const opsAuth = {
    apiKey: "ops-key",
    label: "ops",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "finance-key": auth,
      "ops-key": opsAuth,
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInspectRevenuePostureWorkflow.mockResolvedValue({
      funding: { paymentToken: "0x00000000000000000000000000000000000000cc", paymentPaused: false },
      revenue: { metrics: { totalVolume: "100" }, assetRevenues: [] },
      pending: { snapshot: { treasury: "3", devFund: "4", unionTreasury: "5" }, additionalPayees: [] },
      treasuryControls: null,
      summary: { includeTreasuryControls: false },
    });
    mocks.runWithdrawMarketplacePaymentsWorkflow.mockResolvedValue({
      preflight: { payee: "0x00000000000000000000000000000000000000aa", pendingBefore: "10" },
      withdrawal: { mode: "standard", txHash: "0xwithdraw", pendingAfter: "0", eventCount: 1, deadline: null },
      summary: { payee: "0x00000000000000000000000000000000000000aa", clearedPending: true, deadline: null },
    });
  });

  it("inspects posture and executes payout sweeps", async () => {
    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      posture: {
        additionalPayees: ["0x00000000000000000000000000000000000000aa"],
      },
      payouts: {
        sweeps: [
          {
            label: "seller",
          },
          {
            label: "ops",
            actor: {
              apiKey: "ops-key",
              walletAddress: "0x00000000000000000000000000000000000000bb",
            },
            deadline: "1000",
          },
        ],
      },
    });

    expect(mocks.runInspectRevenuePostureWorkflow).toHaveBeenCalledTimes(2);
    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).toHaveBeenNthCalledWith(
      1,
      context,
      auth,
      "0x00000000000000000000000000000000000000aa",
      { deadline: undefined },
    );
    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).toHaveBeenNthCalledWith(
      2,
      context,
      opsAuth,
      "0x00000000000000000000000000000000000000bb",
      { deadline: "1000" },
    );
    expect(result.payouts.sweeps).toHaveLength(2);
    expect(result.summary).toEqual({
      story: "treasury revenue operations",
      sweepCount: 2,
      completedSweepCount: 2,
      blockedSteps: [],
      externalPreconditions: [],
      paymentToken: "0x00000000000000000000000000000000000000cc",
    });
  });

  it("surfaces blocked payout preconditions without hiding them", async () => {
    mocks.runWithdrawMarketplacePaymentsWorkflow
      .mockResolvedValueOnce({
        preflight: { payee: "0x00000000000000000000000000000000000000aa", pendingBefore: "10" },
        withdrawal: { mode: "standard", txHash: "0xwithdraw", pendingAfter: "0", eventCount: 1, deadline: null },
        summary: { payee: "0x00000000000000000000000000000000000000aa", clearedPending: true, deadline: null },
      })
      .mockRejectedValueOnce(new HttpError(409, "withdraw-marketplace-payments requires pending payments"));

    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      payouts: {
        sweeps: [
          { label: "seller" },
          { label: "treasury" },
        ],
      },
    });

    expect(result.summary.blockedSteps).toEqual(["payouts.treasury"]);
    expect(result.summary.externalPreconditions).toEqual([
      {
        step: "payouts.treasury",
        message: "withdraw-marketplace-payments requires pending payments",
      },
    ]);
    expect(result.payouts.sweeps[1]).toEqual({
      label: "treasury",
      actor: "0x00000000000000000000000000000000000000aa",
      step: {
        status: "blocked-by-external-precondition",
        result: null,
        block: {
          statusCode: 409,
          message: "withdraw-marketplace-payments requires pending payments",
          diagnostics: undefined,
        },
      },
    });
  });

  it("summarizes blocked posture checks before and after sweeps", async () => {
    mocks.runInspectRevenuePostureWorkflow
      .mockRejectedValueOnce(new HttpError(409, "inspect-revenue-posture requires payment token", { phase: "before" }))
      .mockRejectedValueOnce(new HttpError(409, "inspect-revenue-posture requires payment token", { phase: "after" }));

    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      payouts: {
        sweeps: [
          { label: "seller" },
        ],
      },
    });

    expect(result.posture.before).toEqual({
      status: "blocked-by-external-precondition",
      result: null,
      block: {
        statusCode: 409,
        message: "inspect-revenue-posture requires payment token",
        diagnostics: { phase: "before" },
      },
    });
    expect(result.posture.after).toEqual({
      status: "blocked-by-external-precondition",
      result: null,
      block: {
        statusCode: 409,
        message: "inspect-revenue-posture requires payment token",
        diagnostics: { phase: "after" },
      },
    });
    expect(result.summary).toEqual({
      story: "treasury revenue operations",
      sweepCount: 1,
      completedSweepCount: 1,
      blockedSteps: ["posture.postureBefore", "posture.postureAfter"],
      externalPreconditions: [
        { step: "posture.postureBefore", message: "inspect-revenue-posture requires payment token" },
        { step: "posture.postureAfter", message: "inspect-revenue-posture requires payment token" },
      ],
      paymentToken: null,
    });
  });

  it("defaults payout labels and inherits the parent wallet when an override omits one", async () => {
    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      payouts: {
        sweeps: [{
          actor: {
            apiKey: "ops-key",
          },
        }],
      },
    });

    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).toHaveBeenCalledWith(
      context,
      opsAuth,
      "0x00000000000000000000000000000000000000aa",
      { deadline: undefined },
    );
    expect(result.payouts.sweeps).toEqual([
      expect.objectContaining({
        label: "sweep-1",
        actor: "0x00000000000000000000000000000000000000aa",
      }),
    ]);
  });

  it("returns not-requested posture steps when no work is requested", async () => {
    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, undefined, {});

    expect(mocks.runInspectRevenuePostureWorkflow).not.toHaveBeenCalled();
    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).not.toHaveBeenCalled();
    expect(result).toEqual({
      posture: {
        before: { status: "not-requested", result: null, block: null },
        after: { status: "not-requested", result: null, block: null },
      },
      payouts: {
        sweeps: [],
      },
      summary: {
        story: "treasury revenue operations",
        sweepCount: 0,
        completedSweepCount: 0,
        blockedSteps: [],
        externalPreconditions: [],
        paymentToken: null,
      },
    });
  });

  it("runs only the pre-sweep posture inspection when payouts are omitted", async () => {
    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, undefined, {
      posture: {
        includeTreasuryControls: true,
      },
    });

    expect(mocks.runInspectRevenuePostureWorkflow).toHaveBeenCalledTimes(1);
    expect(mocks.runInspectRevenuePostureWorkflow).toHaveBeenCalledWith(
      context,
      auth,
      undefined,
      { includeTreasuryControls: true },
    );
    expect(result.posture.after).toEqual({
      status: "not-requested",
      result: null,
      block: null,
    });
    expect(result.summary).toEqual({
      story: "treasury revenue operations",
      sweepCount: 0,
      completedSweepCount: 0,
      blockedSteps: [],
      externalPreconditions: [],
      paymentToken: "0x00000000000000000000000000000000000000cc",
    });
  });

  it("falls back to the pre-sweep payment token when the after-posture check is blocked", async () => {
    mocks.runInspectRevenuePostureWorkflow
      .mockResolvedValueOnce({
        funding: { paymentToken: "0x00000000000000000000000000000000000000dd", paymentPaused: false },
        revenue: { metrics: { totalVolume: "100" }, assetRevenues: [] },
        pending: { snapshot: { treasury: "3", devFund: "4", unionTreasury: "5" }, additionalPayees: [] },
        treasuryControls: null,
        summary: { includeTreasuryControls: false },
      })
      .mockRejectedValueOnce(new HttpError(409, "inspect-revenue-posture payment readback is settling"));

    const result = await runTreasuryRevenueOperationsWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      payouts: {
        sweeps: [{ label: "seller" }],
      },
    });

    expect(result.posture.before).toMatchObject({
      status: "completed",
      result: {
        funding: { paymentToken: "0x00000000000000000000000000000000000000dd" },
      },
    });
    expect(result.posture.after).toEqual({
      status: "blocked-by-external-precondition",
      result: null,
      block: {
        statusCode: 409,
        message: "inspect-revenue-posture payment readback is settling",
        diagnostics: undefined,
      },
    });
    expect(result.summary.paymentToken).toBe("0x00000000000000000000000000000000000000dd");
    expect(result.summary.blockedSteps).toEqual(["posture.postureAfter"]);
    expect(result.summary.externalPreconditions).toEqual([
      {
        step: "posture.postureAfter",
        message: "inspect-revenue-posture payment readback is settling",
      },
    ]);
  });

  it("propagates non-state child workflow failures", async () => {
    mocks.runInspectRevenuePostureWorkflow.mockRejectedValueOnce(new Error("posture exploded"));

    await expect(runTreasuryRevenueOperationsWorkflow(context, auth, undefined, {
      posture: {},
    })).rejects.toThrow("posture exploded");
  });

  it("rejects unknown payout actors before child execution", async () => {
    await expect(runTreasuryRevenueOperationsWorkflow(context, auth, undefined, {
      payouts: {
        sweeps: [{
          actor: {
            apiKey: "missing-key",
          },
        }],
      },
    })).rejects.toMatchObject<HttpError>({
      statusCode: 400,
    });

    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).not.toHaveBeenCalled();
  });
});
