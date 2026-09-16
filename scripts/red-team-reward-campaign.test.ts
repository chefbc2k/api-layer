import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTokenomicsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../packages/api/src/modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

vi.mock("../packages/api/src/workflows/wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runClaimRewardCampaignWorkflow } from "../packages/api/src/workflows/claim-reward-campaign.js";

const CLAIMER = "0x00000000000000000000000000000000000000aa";
const auth = {
  apiKey: "claimer-key",
  label: "claimer",
  roles: ["service"],
  allowGasless: false,
};

type RewardState = {
  allocation: bigint;
  campaignBalance: bigint;
  campaignTotalClaimed: bigint;
  claimerBalance: bigint;
  claimed: bigint;
  paused: boolean;
  staleClaimableReads: number;
};

function createStatefulRewardService(state: RewardState) {
  let lastClaimAmount = 0n;
  const claim = vi.fn(async () => {
    if (state.paused) {
      throw new Error("execution reverted: CampaignPaused()");
    }
    const claimable = state.allocation - state.claimed;
    if (claimable === 0n) {
      throw new Error("execution reverted: NothingToClaim()");
    }
    if (state.campaignBalance < claimable) {
      throw new Error("execution reverted: InsufficientCampaignFunding(uint256,uint256)");
    }

    lastClaimAmount = claimable;
    state.claimed += claimable;
    state.campaignTotalClaimed += claimable;
    state.campaignBalance -= claimable;
    state.claimerBalance += claimable;
    return { statusCode: 202, body: { txHash: "0xclaim-write", result: claimable.toString() } };
  });

  return {
    claim,
    getCampaign: vi.fn(async () => ({
      statusCode: 200,
      body: { totalClaimed: state.campaignTotalClaimed.toString(), paused: state.paused },
    })),
    claimableAmount: vi.fn(async () => {
      if (state.staleClaimableReads > 0) {
        state.staleClaimableReads -= 1;
        return { statusCode: 200, body: state.allocation.toString() };
      }
      return { statusCode: 200, body: (state.allocation - state.claimed).toString() };
    }),
    claimed: vi.fn(async () => ({ statusCode: 200, body: state.claimed.toString() })),
    claimedEventQuery: vi.fn(async () => [{
      transactionHash: "0xclaim-receipt",
      amount: lastClaimAmount.toString(),
    }]),
  };
}

function context() {
  return {
    providerRouter: {
      withProvider: vi.fn().mockImplementation(async (
        _mode: string,
        _label: string,
        work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>,
      ) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 901 })) })),
    },
  } as never;
}

const request = {
  campaignId: "7",
  totalAllocation: "1000",
  proof: [],
};

describe("red-team reward campaign replay and state ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xclaim-receipt");
  });

  it("prevents reward double spend when a replay races a stale claimable read", async () => {
    const state: RewardState = {
      allocation: 1_000n,
      campaignBalance: 1_000n,
      campaignTotalClaimed: 0n,
      claimerBalance: 0n,
      claimed: 0n,
      paused: false,
      staleClaimableReads: 0,
    };
    const service = createStatefulRewardService(state);
    mocks.createTokenomicsPrimitiveService.mockReturnValue(service);

    const first = await runClaimRewardCampaignWorkflow(context(), auth, CLAIMER, request);
    expect(first.claimed).toMatchObject({ before: "0", after: "1000", claimedNow: "1000" });
    expect(state).toMatchObject({
      campaignBalance: 0n,
      campaignTotalClaimed: 1_000n,
      claimerBalance: 1_000n,
      claimed: 1_000n,
    });

    state.staleClaimableReads = 1;
    await expect(runClaimRewardCampaignWorkflow(context(), auth, CLAIMER, request)).rejects.toMatchObject({
      statusCode: 409,
      message: "claim-reward-campaign blocked by missing claim eligibility: zero claimable amount",
    });

    expect(service.claim).toHaveBeenCalledTimes(2);
    expect(state).toMatchObject({
      campaignBalance: 0n,
      campaignTotalClaimed: 1_000n,
      claimerBalance: 1_000n,
      claimed: 1_000n,
    });
  });

  it("rejects a paused-campaign claim without changing balances or claim state", async () => {
    const state: RewardState = {
      allocation: 1_000n,
      campaignBalance: 1_000n,
      campaignTotalClaimed: 0n,
      claimerBalance: 0n,
      claimed: 0n,
      paused: true,
      staleClaimableReads: 0,
    };
    const service = createStatefulRewardService(state);
    mocks.createTokenomicsPrimitiveService.mockReturnValue(service);

    await expect(runClaimRewardCampaignWorkflow(context(), auth, CLAIMER, request)).rejects.toMatchObject({
      statusCode: 409,
      message: "claim-reward-campaign blocked by setup/state: campaign is paused",
    });

    expect(state).toMatchObject({
      campaignBalance: 1_000n,
      campaignTotalClaimed: 0n,
      claimerBalance: 0n,
      claimed: 0n,
    });
  });
});
