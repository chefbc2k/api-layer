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
