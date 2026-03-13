import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTokenomicsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runInspectVestingAdminPolicyWorkflow, runUpdateVestingAdminPolicyWorkflow } from "./vesting-admin-policy.js";

describe("vesting admin policy workflows", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inspects the mounted vesting admin/default policy surface", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getMinTwaveVestingDuration: vi.fn().mockResolvedValue({ statusCode: 200, body: "7776000" }),
      getQuarterlyUnlockRate: vi.fn().mockResolvedValue({ statusCode: 200, body: "2500" }),
    });

    const result = await runInspectVestingAdminPolicyWorkflow({} as never, auth, undefined, {});

    expect(result).toEqual({
      standardVesting: {
        minimumDuration: null,
        readable: false,
        note: "mounted Layer 1 exposes setMinimumVestingDuration but no companion read route",
      },
      timewave: {
        minimumDuration: "7776000",
        quarterlyUnlockRate: "2500",
      },
      summary: {
        hasStandardMinimumReadback: false,
        hasTwaveMinimumReadback: true,
        hasTwaveQuarterlyRateReadback: true,
      },
    });
  });

  it("updates standard and twave policy controls in deterministic order", async () => {
    const sequence: string[] = [];
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getMinTwaveVestingDuration: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-min-before");
          return { statusCode: 200, body: "7776000" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-min-after");
          return { statusCode: 200, body: "5184000" };
        }),
      getQuarterlyUnlockRate: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-rate-before");
          return { statusCode: 200, body: "2500" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-rate-after");
          return { statusCode: 200, body: "2000" };
        }),
      setMinimumVestingDuration: vi.fn().mockImplementation(async () => {
        sequence.push("write-standard");
        return { statusCode: 202, body: { txHash: "0xstandard" } };
      }),
      setMinimumTwaveVestingDuration: vi.fn().mockImplementation(async () => {
        sequence.push("write-twave-min");
        return { statusCode: 202, body: { txHash: "0xtwave-min" } };
      }),
      setQuarterlyUnlockRate: vi.fn().mockImplementation(async () => {
        sequence.push("write-twave-rate");
        return { statusCode: 202, body: { txHash: "0xtwave-rate" } };
      }),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-standard");
        return "0xstandard-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-twave-min");
        return "0xtwave-min-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-twave-rate");
        return "0xtwave-rate-receipt";
      });

    const result = await runUpdateVestingAdminPolicyWorkflow({} as never, auth, undefined, {
      standardMinimumDuration: "86400",
      twaveMinimumDuration: "5184000",
      twaveQuarterlyUnlockRate: "2000",
    });

    expect(sequence).toEqual([
      "read-min-before",
      "read-rate-before",
      "write-standard",
      "wait-standard",
      "write-twave-min",
      "wait-twave-min",
      "read-min-after",
      "write-twave-rate",
      "wait-twave-rate",
      "read-rate-after",
    ]);
    expect(result.standardVesting.minimumDuration).toEqual({
      before: null,
      requested: "86400",
      submission: { txHash: "0xstandard" },
      txHash: "0xstandard-receipt",
      confirmation: "receipt-only",
      readableAfter: false,
    });
    expect(result.timewave.minimumDuration.after).toBe("5184000");
    expect(result.timewave.quarterlyUnlockRate.after).toBe("2000");
  });

  it("supports partial twave-only updates with stable not-requested branches", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getMinTwaveVestingDuration: vi.fn().mockResolvedValue({ statusCode: 200, body: "7776000" }),
      getQuarterlyUnlockRate: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "2500" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3000" }),
      setMinimumVestingDuration: vi.fn(),
      setMinimumTwaveVestingDuration: vi.fn(),
      setQuarterlyUnlockRate: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrate" } }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xrate-receipt");

    const result = await runUpdateVestingAdminPolicyWorkflow({} as never, auth, undefined, {
      twaveQuarterlyUnlockRate: "3000",
    });

    expect(result.standardVesting.minimumDuration.confirmation).toBe("not-requested");
    expect(result.timewave.minimumDuration.confirmation).toBe("not-requested");
    expect(result.timewave.quarterlyUnlockRate.confirmation).toBe("readback-confirmed");
    expect(result.timewave.quarterlyUnlockRate.after).toBe("3000");
  });

  it("normalizes insufficient admin authority failures for standard and twave controls", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getMinTwaveVestingDuration: vi.fn().mockResolvedValue({ statusCode: 200, body: "2592000" }),
      getQuarterlyUnlockRate: vi.fn().mockResolvedValue({ statusCode: 200, body: "2500" }),
      setMinimumVestingDuration: vi.fn().mockRejectedValue(new Error("execution reverted (unknown custom error) data=\"0xa2880f97\"")),
      setMinimumTwaveVestingDuration: vi.fn().mockRejectedValue(new Error("execution reverted (unknown custom error) data=\"0xd954416a\"")),
      setQuarterlyUnlockRate: vi.fn().mockRejectedValue(new Error("execution reverted (unknown custom error) data=\"0xd954416a\"")),
    });

    await expect(runUpdateVestingAdminPolicyWorkflow({} as never, auth, undefined, {
      standardMinimumDuration: "86400",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("insufficient admin authority"),
    });

    await expect(runUpdateVestingAdminPolicyWorkflow({} as never, auth, undefined, {
      twaveMinimumDuration: "2678400",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("insufficient admin authority"),
    });

    await expect(runUpdateVestingAdminPolicyWorkflow({} as never, auth, undefined, {
      twaveQuarterlyUnlockRate: "2501",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("insufficient admin authority"),
    });
  });
});
