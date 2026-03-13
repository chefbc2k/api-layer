import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("participant-activation-flow workflow route", () => {
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
      campaign: { campaignId: "7" },
      counts: { before: "0", after: "1" },
      summary: { campaignId: "7" },
    });
    mocks.runManageRewardCampaignWorkflow.mockResolvedValue({
      campaign: { before: {}, after: {} },
      merkleRootUpdate: { source: "updated" },
      pauseState: { source: "unchanged" },
      summary: { campaignId: "7" },
    });
    mocks.runClaimRewardCampaignWorkflow.mockResolvedValue({
      campaign: { before: {}, after: {} },
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
      vesting: { before: { exists: false }, after: { exists: true } },
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured participant activation response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "participant-key": {
          apiKey: "participant-key",
          label: "participant",
          roles: ["service"],
          allowGasless: false,
        },
        "reward-admin-key": {
          apiKey: "reward-admin-key",
          label: "reward-admin",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/participant-activation-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
        rewards: {
          campaign: {
            actor: {
              apiKey: "reward-admin-key",
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
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "participant-key";
        }
        if (name.toLowerCase() === "x-wallet-address") {
          return "0x00000000000000000000000000000000000000aa";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual({
      staking: expect.objectContaining({ status: "completed" }),
      rewards: {
        campaign: {
          create: expect.objectContaining({ status: "completed" }),
          manage: expect.objectContaining({ status: "not-requested" }),
          campaignId: "7",
        },
        claim: expect.objectContaining({ status: "not-requested" }),
      },
      vesting: {
        create: expect.objectContaining({ status: "not-requested" }),
        inspect: expect.objectContaining({ status: "not-requested" }),
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

  it("rejects invalid participant activation input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "participant-key": {
          apiKey: "participant-key",
          label: "participant",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/participant-activation-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        staking: {
          amount: "bad",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "participant-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
    expect(mocks.runStakeAndDelegateWorkflow).not.toHaveBeenCalled();
    expect(mocks.runCreateRewardCampaignWorkflow).not.toHaveBeenCalled();
  });

  it("rejects participant activation input that violates campaign or vesting refinement rules", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "participant-key": {
          apiKey: "participant-key",
          label: "participant",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/participant-activation-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        staking: {
          amount: "10",
          delegatee: "0x00000000000000000000000000000000000000bb",
        },
        rewards: {
          claim: {
            totalAllocation: "2",
            proof: [
              "0x2222222222222222222222222222222222222222222222222222222222222222",
            ],
          },
        },
        vesting: {},
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "participant-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("participant-activation-flow"),
    });
    expect(mocks.runStakeAndDelegateWorkflow).not.toHaveBeenCalled();
    expect(mocks.runClaimRewardCampaignWorkflow).not.toHaveBeenCalled();
  });
});
