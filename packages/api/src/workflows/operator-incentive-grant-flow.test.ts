import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runParticipantActivationFlowWorkflow: vi.fn(),
  runInspectVestingAdminPolicyWorkflow: vi.fn(),
  runUpdateVestingAdminPolicyWorkflow: vi.fn(),
}));

vi.mock("./participant-activation-flow.js", async () => {
  const actual = await vi.importActual<typeof import("./participant-activation-flow.js")>("./participant-activation-flow.js");
  return {
    ...actual,
    runParticipantActivationFlowWorkflow: mocks.runParticipantActivationFlowWorkflow,
  };
});

vi.mock("./vesting-admin-policy.js", async () => {
  const actual = await vi.importActual<typeof import("./vesting-admin-policy.js")>("./vesting-admin-policy.js");
  return {
    ...actual,
    runInspectVestingAdminPolicyWorkflow: mocks.runInspectVestingAdminPolicyWorkflow,
    runUpdateVestingAdminPolicyWorkflow: mocks.runUpdateVestingAdminPolicyWorkflow,
  };
});

import { runOperatorIncentiveGrantFlowWorkflow } from "./operator-incentive-grant-flow.js";

describe("runOperatorIncentiveGrantFlowWorkflow", () => {
  const participantAuth = {
    apiKey: "participant-key",
    label: "participant",
    roles: ["service"],
    allowGasless: false,
  };
  const policyAuth = {
    apiKey: "policy-key",
    label: "policy",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "participant-key": participantAuth,
      "policy-key": policyAuth,
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInspectVestingAdminPolicyWorkflow.mockResolvedValue({
      standardVesting: { minimumDuration: null, readable: false },
      timewave: { minimumDuration: "2592000", quarterlyUnlockRate: "2500" },
      summary: {
        hasStandardMinimumReadback: false,
        hasTwaveMinimumReadback: true,
        hasTwaveQuarterlyRateReadback: true,
      },
    });
    mocks.runUpdateVestingAdminPolicyWorkflow.mockResolvedValue({
      standardVesting: { minimumDuration: { confirmation: "receipt-only" } },
      timewave: {
        minimumDuration: { confirmation: "readback-confirmed", after: "2592000" },
        quarterlyUnlockRate: { confirmation: "readback-confirmed", after: "2500" },
      },
      summary: {
        requestedStandardMinimumDuration: null,
        requestedTwaveMinimumDuration: "2592000",
        requestedTwaveQuarterlyUnlockRate: null,
        standardMinimumDurationReadable: false,
      },
    });
    mocks.runParticipantActivationFlowWorkflow.mockResolvedValue({
      staking: { status: "completed", result: { summary: { staker: "0x00000000000000000000000000000000000000aa" } }, block: null },
      rewards: {
        campaign: {
          create: { status: "completed", result: { summary: { campaignId: "7" } }, block: null },
          manage: { status: "not-requested", result: null, block: null },
          campaignId: "7",
        },
        claim: { status: "not-requested", result: null, block: null },
      },
      vesting: {
        create: { status: "not-requested", result: null, block: null },
        inspect: { status: "not-requested", result: null, block: null },
      },
      summary: {
        story: "participant activation flow",
        participant: "0x00000000000000000000000000000000000000aa",
        delegatee: "0x00000000000000000000000000000000000000bb",
        rewardCampaignId: "7",
        stakingCompleted: true,
        claimCompleted: false,
        vestingCreated: false,
        blockedSteps: [],
        externalPreconditions: [],
      },
    });
  });

  it("runs the minimal operator incentive path without policy actions", async () => {
    const result = await runOperatorIncentiveGrantFlowWorkflow(context, participantAuth, "0x00000000000000000000000000000000000000aa", {
      activation: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
      },
    });

    expect(mocks.runInspectVestingAdminPolicyWorkflow).not.toHaveBeenCalled();
    expect(mocks.runUpdateVestingAdminPolicyWorkflow).not.toHaveBeenCalled();
    expect(mocks.runParticipantActivationFlowWorkflow).toHaveBeenCalledOnce();
    expect(result.policy.before.status).toBe("not-requested");
    expect(result.summary).toEqual({
      story: "operator incentive grant flow",
      participant: "0x00000000000000000000000000000000000000aa",
      delegatee: "0x00000000000000000000000000000000000000bb",
      rewardCampaignId: "7",
      stakingCompleted: true,
      claimCompleted: false,
      vestingCreated: false,
      policyUpdated: false,
      blockedSteps: [],
      externalPreconditions: [],
    });
  });

  it("runs the full operator incentive path with policy inspection and update", async () => {
    const result = await runOperatorIncentiveGrantFlowWorkflow(context, participantAuth, "0x00000000000000000000000000000000000000aa", {
      policy: {
        actor: {
          apiKey: "policy-key",
          walletAddress: "0x00000000000000000000000000000000000000cc",
        },
        update: {
          twaveMinimumDuration: "2592000",
        },
      },
      activation: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
      },
    });

    expect(mocks.runInspectVestingAdminPolicyWorkflow).toHaveBeenNthCalledWith(
      1,
      context,
      policyAuth,
      "0x00000000000000000000000000000000000000cc",
      {},
    );
    expect(mocks.runUpdateVestingAdminPolicyWorkflow).toHaveBeenCalledWith(
      context,
      policyAuth,
      "0x00000000000000000000000000000000000000cc",
      { twaveMinimumDuration: "2592000" },
    );
    expect(mocks.runInspectVestingAdminPolicyWorkflow).toHaveBeenNthCalledWith(
      2,
      context,
      policyAuth,
      "0x00000000000000000000000000000000000000cc",
      {},
    );
    expect(result.policy.before.status).toBe("completed");
    expect(result.policy.update.status).toBe("completed");
    expect(result.policy.after.status).toBe("completed");
    expect(result.summary.policyUpdated).toBe(true);
  });

  it("surfaces external precondition blocks from policy updates cleanly", async () => {
    mocks.runUpdateVestingAdminPolicyWorkflow.mockRejectedValueOnce(
      new HttpError(409, "update-vesting-admin-policy blocked by insufficient admin authority for twaveMinimumDuration"),
    );
    mocks.runParticipantActivationFlowWorkflow.mockResolvedValueOnce({
      staking: { status: "completed", result: { summary: { staker: "0x00000000000000000000000000000000000000aa" } }, block: null },
      rewards: {
        campaign: {
          create: { status: "not-requested", result: null, block: null },
          manage: { status: "not-requested", result: null, block: null },
          campaignId: null,
        },
        claim: { status: "blocked-by-external-precondition", result: null, block: { statusCode: 409, message: "claim-reward-campaign blocked by setup/state: campaign has no token funding" } },
      },
      vesting: {
        create: { status: "not-requested", result: null, block: null },
        inspect: { status: "not-requested", result: null, block: null },
      },
      summary: {
        story: "participant activation flow",
        participant: "0x00000000000000000000000000000000000000aa",
        delegatee: "0x00000000000000000000000000000000000000bb",
        rewardCampaignId: null,
        stakingCompleted: true,
        claimCompleted: false,
        vestingCreated: false,
        blockedSteps: ["rewardClaim"],
        externalPreconditions: [{ step: "rewardClaim", message: "claim-reward-campaign blocked by setup/state: campaign has no token funding" }],
      },
    });

    const result = await runOperatorIncentiveGrantFlowWorkflow(context, participantAuth, undefined, {
      policy: {
        inspectBefore: true,
        update: {
          twaveMinimumDuration: "2592000",
        },
      },
      activation: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
      },
    });

    expect(result.policy.update).toEqual({
      status: "blocked-by-external-precondition",
      result: null,
      block: {
        statusCode: 409,
        message: "update-vesting-admin-policy blocked by insufficient admin authority for twaveMinimumDuration",
        diagnostics: undefined,
      },
    });
    expect(result.summary.blockedSteps).toEqual(["policy.policyUpdate", "activation.rewardClaim"]);
    expect(result.summary.externalPreconditions).toEqual([
      {
        step: "policy.policyUpdate",
        message: "update-vesting-admin-policy blocked by insufficient admin authority for twaveMinimumDuration",
      },
      {
        step: "activation.rewardClaim",
        message: "claim-reward-campaign blocked by setup/state: campaign has no token funding",
      },
    ]);
  });

  it("propagates child workflow failures that are not structured state blocks", async () => {
    mocks.runParticipantActivationFlowWorkflow.mockRejectedValueOnce(new Error("activation exploded"));

    await expect(runOperatorIncentiveGrantFlowWorkflow(context, participantAuth, undefined, {
      activation: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
      },
    })).rejects.toThrow("activation exploded");
  });

  it("rejects unknown policy actors before child execution", async () => {
    await expect(runOperatorIncentiveGrantFlowWorkflow(context, participantAuth, undefined, {
      policy: {
        actor: {
          apiKey: "missing-key",
        },
        inspectBefore: true,
      },
      activation: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
      },
    })).rejects.toMatchObject<HttpError>({
      statusCode: 400,
    });

    expect(mocks.runParticipantActivationFlowWorkflow).not.toHaveBeenCalled();
  });
});
