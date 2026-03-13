import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runStakeAndDelegateWorkflow: vi.fn(),
  runCreateRewardCampaignWorkflow: vi.fn(),
  runManageRewardCampaignWorkflow: vi.fn(),
  runClaimRewardCampaignWorkflow: vi.fn(),
  runCreateBeneficiaryVestingWorkflow: vi.fn(),
  runInspectBeneficiaryVestingWorkflow: vi.fn(),
}));

vi.mock("./stake-and-delegate.js", async () => {
  const actual = await vi.importActual<typeof import("./stake-and-delegate.js")>("./stake-and-delegate.js");
  return {
    ...actual,
    runStakeAndDelegateWorkflow: mocks.runStakeAndDelegateWorkflow,
  };
});

vi.mock("./create-reward-campaign.js", async () => {
  const actual = await vi.importActual<typeof import("./create-reward-campaign.js")>("./create-reward-campaign.js");
  return {
    ...actual,
    runCreateRewardCampaignWorkflow: mocks.runCreateRewardCampaignWorkflow,
  };
});

vi.mock("./manage-reward-campaign.js", async () => {
  const actual = await vi.importActual<typeof import("./manage-reward-campaign.js")>("./manage-reward-campaign.js");
  return {
    ...actual,
    runManageRewardCampaignWorkflow: mocks.runManageRewardCampaignWorkflow,
  };
});

vi.mock("./claim-reward-campaign.js", async () => {
  const actual = await vi.importActual<typeof import("./claim-reward-campaign.js")>("./claim-reward-campaign.js");
  return {
    ...actual,
    runClaimRewardCampaignWorkflow: mocks.runClaimRewardCampaignWorkflow,
  };
});

vi.mock("./create-beneficiary-vesting.js", async () => {
  const actual = await vi.importActual<typeof import("./create-beneficiary-vesting.js")>("./create-beneficiary-vesting.js");
  return {
    ...actual,
    runCreateBeneficiaryVestingWorkflow: mocks.runCreateBeneficiaryVestingWorkflow,
  };
});

vi.mock("./inspect-beneficiary-vesting.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-beneficiary-vesting.js")>("./inspect-beneficiary-vesting.js");
  return {
    ...actual,
    runInspectBeneficiaryVestingWorkflow: mocks.runInspectBeneficiaryVestingWorkflow,
  };
});

import { runParticipantActivationFlowWorkflow } from "./participant-activation-flow.js";

describe("runParticipantActivationFlowWorkflow", () => {
  const auth = {
    apiKey: "participant-key",
    label: "participant",
    roles: ["service"],
    allowGasless: false,
  };
  const rewardAdminAuth = {
    apiKey: "reward-admin-key",
    label: "reward-admin",
    roles: ["service"],
    allowGasless: false,
  };
  const vestingAdminAuth = {
    apiKey: "vesting-admin-key",
    label: "vesting-admin",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "participant-key": auth,
      "reward-admin-key": rewardAdminAuth,
      "vesting-admin-key": vestingAdminAuth,
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runStakeAndDelegateWorkflow.mockResolvedValue({
      approval: { source: "approved" },
      stake: { txHash: "0xstake", eventCount: 1 },
      delegation: { txHash: "0xdelegate", currentVotes: "10", eventCount: 1 },
      summary: {
        staker: "0x00000000000000000000000000000000000000aa",
        delegatee: "0x00000000000000000000000000000000000000bb",
        amount: "10",
      },
    });
    mocks.runCreateRewardCampaignWorkflow.mockResolvedValue({
      campaign: {
        submission: { txHash: "0xcreate-campaign" },
        txHash: "0xcreate-campaign",
        campaignId: "7",
        read: { paused: false },
        eventCount: 1,
      },
      counts: { before: "0", after: "1" },
      summary: {
        campaignId: "7",
      },
    });
    mocks.runManageRewardCampaignWorkflow.mockResolvedValue({
      campaign: {
        before: { paused: false },
        after: { paused: false },
      },
      merkleRootUpdate: { source: "updated" },
      pauseState: { source: "unchanged" },
      summary: {
        campaignId: "7",
      },
    });
    mocks.runClaimRewardCampaignWorkflow.mockResolvedValue({
      campaign: { before: { totalClaimed: "0" }, after: { totalClaimed: "2" } },
      claimable: { before: "2", after: "0" },
      claimed: { before: "0", after: "2", claimedNow: "2" },
      claim: { txHash: "0xclaim", eventCount: 1 },
      summary: {
        campaignId: "7",
        claimer: "0x00000000000000000000000000000000000000aa",
        totalAllocation: "2",
      },
    });
    mocks.runCreateBeneficiaryVestingWorkflow.mockResolvedValue({
      create: { txHash: "0xcreate-vesting", eventCount: 1, scheduleKind: "public" },
      vesting: {
        before: { exists: false },
        after: { exists: true },
      },
      summary: {
        beneficiary: "0x00000000000000000000000000000000000000aa",
        amount: "100",
        scheduleKind: "public",
        vestingType: null,
      },
    });
    mocks.runInspectBeneficiaryVestingWorkflow.mockResolvedValue({
      vesting: {
        exists: true,
        schedule: { totalAmount: "100" },
        details: { totalAmount: "100" },
        releasable: "0",
        totals: { totalVested: "100", totalReleased: "0", releasable: "0" },
      },
      summary: {
        beneficiary: "0x00000000000000000000000000000000000000aa",
        hasSchedule: true,
      },
    });
  });

  it("runs the minimal successful participant activation path", async () => {
    const result = await runParticipantActivationFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
    });

    expect(mocks.runStakeAndDelegateWorkflow).toHaveBeenCalledOnce();
    expect(mocks.runCreateRewardCampaignWorkflow).not.toHaveBeenCalled();
    expect(mocks.runClaimRewardCampaignWorkflow).not.toHaveBeenCalled();
    expect(mocks.runCreateBeneficiaryVestingWorkflow).not.toHaveBeenCalled();
    expect(result.staking.status).toBe("completed");
    expect(result.rewards.campaign.create.status).toBe("not-requested");
    expect(result.rewards.claim.status).toBe("not-requested");
    expect(result.vesting.create.status).toBe("not-requested");
    expect(result.summary).toEqual({
      story: "participant activation flow",
      participant: "0x00000000000000000000000000000000000000aa",
      delegatee: "0x00000000000000000000000000000000000000bb",
      rewardCampaignId: null,
      stakingCompleted: true,
      claimCompleted: false,
      vestingCreated: false,
      blockedSteps: [],
      externalPreconditions: [],
    });
  });

  it("runs the full activation path with reward context, claim, and vesting", async () => {
    const result = await runParticipantActivationFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        campaign: {
          actor: {
            apiKey: "reward-admin-key",
            walletAddress: "0x00000000000000000000000000000000000000cc",
          },
          create: {
            merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
            startTime: "100",
            cliffSeconds: "0",
            durationSeconds: "0",
            tgeUnlockBps: "10000",
            maxTotalClaimable: "2",
          },
          manage: {
            paused: false,
          },
        },
        claim: {
          totalAllocation: "2",
          proof: [
            "0x2222222222222222222222222222222222222222222222222222222222222222",
          ],
        },
      },
      vesting: {
        actor: {
          apiKey: "vesting-admin-key",
        },
        create: {
          beneficiary: "0x00000000000000000000000000000000000000aa",
          amount: "100",
          scheduleKind: "public",
        },
      },
    });

    expect(mocks.runCreateRewardCampaignWorkflow).toHaveBeenCalledWith(
      context,
      rewardAdminAuth,
      "0x00000000000000000000000000000000000000cc",
      expect.any(Object),
    );
    expect(mocks.runManageRewardCampaignWorkflow).toHaveBeenCalledWith(
      context,
      rewardAdminAuth,
      "0x00000000000000000000000000000000000000cc",
      {
        campaignId: "7",
        newMerkleRoot: undefined,
        paused: false,
      },
    );
    expect(mocks.runClaimRewardCampaignWorkflow).toHaveBeenCalledWith(
      context,
      auth,
      "0x00000000000000000000000000000000000000aa",
      {
        campaignId: "7",
        totalAllocation: "2",
        proof: [
          "0x2222222222222222222222222222222222222222222222222222222222222222",
        ],
      },
    );
    expect(mocks.runCreateBeneficiaryVestingWorkflow).toHaveBeenCalledWith(
      context,
      vestingAdminAuth,
      "0x00000000000000000000000000000000000000aa",
      {
        beneficiary: "0x00000000000000000000000000000000000000aa",
        amount: "100",
        scheduleKind: "public",
      },
    );
    expect(mocks.runInspectBeneficiaryVestingWorkflow).toHaveBeenCalledWith(
      context,
      vestingAdminAuth,
      "0x00000000000000000000000000000000000000aa",
      { beneficiary: "0x00000000000000000000000000000000000000aa" },
    );
    expect(result.summary.rewardCampaignId).toBe("7");
    expect(result.summary.claimCompleted).toBe(true);
    expect(result.summary.vestingCreated).toBe(true);
  });

  it("surfaces external precondition blocks cleanly", async () => {
    mocks.runClaimRewardCampaignWorkflow.mockRejectedValueOnce(
      new HttpError(409, "claim-reward-campaign blocked by setup/state: campaign has no token funding"),
    );

    const result = await runParticipantActivationFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        claim: {
          campaignId: "9",
          totalAllocation: "2",
          proof: [
            "0x2222222222222222222222222222222222222222222222222222222222222222",
          ],
        },
      },
    });

    expect(result.rewards.claim).toEqual({
      status: "blocked-by-external-precondition",
      result: null,
      block: {
        statusCode: 409,
        message: "claim-reward-campaign blocked by setup/state: campaign has no token funding",
        diagnostics: undefined,
      },
    });
    expect(result.summary.blockedSteps).toEqual(["rewardClaim"]);
    expect(result.summary.externalPreconditions).toEqual([
      {
        step: "rewardClaim",
        message: "claim-reward-campaign blocked by setup/state: campaign has no token funding",
      },
    ]);
  });

  it("keeps optional branches omitted when they are not requested", async () => {
    const result = await runParticipantActivationFlowWorkflow(context, auth, undefined, {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        campaign: {
          create: {
            merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
            startTime: "100",
            cliffSeconds: "0",
            durationSeconds: "0",
            tgeUnlockBps: "10000",
            maxTotalClaimable: "2",
          },
        },
      },
    });

    expect(result.rewards.campaign.create.status).toBe("completed");
    expect(result.rewards.campaign.manage.status).toBe("not-requested");
    expect(result.rewards.claim.status).toBe("not-requested");
    expect(result.vesting.create.status).toBe("not-requested");
    expect(result.vesting.inspect.status).toBe("not-requested");
  });

  it("skips dependent campaign-management and claim steps when a new campaign id is not established", async () => {
    mocks.runCreateRewardCampaignWorkflow.mockRejectedValueOnce(
      new HttpError(409, "create-reward-campaign blocked by setup/state: missing admin authority"),
    );

    const result = await runParticipantActivationFlowWorkflow(context, auth, undefined, {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        campaign: {
          create: {
            merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
            startTime: "100",
            cliffSeconds: "0",
            durationSeconds: "0",
            tgeUnlockBps: "10000",
            maxTotalClaimable: "2",
          },
          manage: {
            paused: true,
          },
        },
        claim: {
          totalAllocation: "2",
          proof: [
            "0x2222222222222222222222222222222222222222222222222222222222222222",
          ],
        },
      },
    });

    expect(result.rewards.campaign.create.status).toBe("blocked-by-external-precondition");
    expect(result.rewards.campaign.manage).toEqual({
      status: "skipped",
      result: null,
      block: null,
      reason: "reward campaign id was not established",
    });
    expect(result.rewards.claim).toEqual({
      status: "skipped",
      result: null,
      block: null,
      reason: "claim campaign id was not established",
    });
  });

  it("skips dependent optional branches when staking is state-blocked", async () => {
    mocks.runStakeAndDelegateWorkflow.mockRejectedValueOnce(
      new HttpError(409, "stake-and-delegate blocked by stake rule violation: EchoScore too low (0 < 1000)"),
    );

    const result = await runParticipantActivationFlowWorkflow(context, auth, undefined, {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        claim: {
          campaignId: "9",
          totalAllocation: "2",
          proof: [
            "0x2222222222222222222222222222222222222222222222222222222222222222",
          ],
        },
      },
      vesting: {
        create: {
          beneficiary: "0x00000000000000000000000000000000000000aa",
          amount: "100",
          scheduleKind: "public",
        },
      },
    });

    expect(result.staking.status).toBe("blocked-by-external-precondition");
    expect(result.rewards.claim).toEqual({
      status: "skipped",
      result: null,
      block: null,
      reason: "staking did not complete",
    });
    expect(result.vesting.create).toEqual({
      status: "skipped",
      result: null,
      block: null,
      reason: "staking did not complete",
    });
  });

  it("runs the explicit vesting inspect branch when requested", async () => {
    const result = await runParticipantActivationFlowWorkflow(context, auth, undefined, {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      vesting: {
        inspect: {
          beneficiary: "0x00000000000000000000000000000000000000dd",
        },
      },
    });

    expect(mocks.runInspectBeneficiaryVestingWorkflow).toHaveBeenCalledWith(
      context,
      auth,
      undefined,
      { beneficiary: "0x00000000000000000000000000000000000000dd" },
    );
    expect(result.vesting.inspect.status).toBe("completed");
  });

  it("propagates child workflow failures that are not state blocks", async () => {
    mocks.runCreateRewardCampaignWorkflow.mockRejectedValueOnce(new Error("campaign create failed"));

    await expect(runParticipantActivationFlowWorkflow(context, auth, undefined, {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        campaign: {
          create: {
            merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
            startTime: "100",
            cliffSeconds: "0",
            durationSeconds: "0",
            tgeUnlockBps: "10000",
            maxTotalClaimable: "2",
          },
        },
      },
    })).rejects.toThrow("campaign create failed");
  });

  it("rejects unknown actor overrides", async () => {
    await expect(runParticipantActivationFlowWorkflow(context, auth, undefined, {
      staking: {
        amount: "10",
        delegatee: "0x00000000000000000000000000000000000000bb",
      },
      rewards: {
        campaign: {
          actor: {
            apiKey: "missing-key",
          },
          create: {
            merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
            startTime: "100",
            cliffSeconds: "0",
            durationSeconds: "0",
            tgeUnlockBps: "10000",
            maxTotalClaimable: "2",
          },
        },
      },
    })).rejects.toThrow("participant-activation-flow received unknown actor apiKey");
  });
});
