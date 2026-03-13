import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  asRecord,
  extractClaimedAmountFromLogs,
  extractScalarResult,
  hasTransactionHash,
  readBigInt,
  readWorkflowReceipt,
  resolveWorkflowAccountAddress,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const claimRewardCampaignSchema = z.object({
  campaignId: z.string().regex(/^\d+$/u),
  totalAllocation: z.string().regex(/^\d+$/u),
  proof: z.array(z.string().regex(/^0x[a-fA-F0-9]{64}$/u)),
});

export async function runClaimRewardCampaignWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof claimRewardCampaignSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const claimer = await resolveWorkflowAccountAddress(context, auth, walletAddress, "claimRewardCampaign");
  const campaignBefore = await waitForCampaignRead(tokenomics, auth, walletAddress, body.campaignId, "claimRewardCampaign.campaignBefore");
  const campaignBeforeTotalClaimed = readBigInt(asRecord(campaignBefore.body)?.totalClaimed);

  const claimableBefore = await waitForWorkflowReadback(
    () => tokenomics.claimableAmount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.campaignId, claimer, body.totalAllocation],
    }),
    (result) => result.statusCode === 200,
    "claimRewardCampaign.claimableBefore",
  );
  const claimedBefore = await waitForWorkflowReadback(
    () => tokenomics.claimed({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.campaignId, claimer],
    }),
    (result) => result.statusCode === 200,
    "claimRewardCampaign.claimedBefore",
  );
  const claimedBeforeValue = readBigInt(claimedBefore.body);

  const claim = await tokenomics.claim({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.campaignId, body.totalAllocation, body.proof],
  });
  const claimTxHash = await waitForWorkflowWriteReceipt(context, claim.body, "claimRewardCampaign.claim");
  const claimReceipt = claimTxHash ? await readWorkflowReceipt(context, claimTxHash, "claimRewardCampaign.claim") : null;
  const claimEvents = claimReceipt
    ? await waitForWorkflowEventQuery(
        () => tokenomics.claimedEventQuery({
          auth,
          fromBlock: BigInt(claimReceipt.blockNumber),
          toBlock: BigInt(claimReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, claimTxHash),
        "claimRewardCampaign.claimedEvent",
      )
    : [];
  const claimedNow = extractScalarResult(claim.body) ?? extractClaimedAmountFromLogs(claimEvents, claimTxHash);
  const claimedNowValue = claimedNow === null ? null : readBigInt(claimedNow);

  const claimedAfter = await waitForWorkflowReadback(
    () => tokenomics.claimed({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.campaignId, claimer],
    }),
    (result) => {
      if (result.statusCode !== 200) {
        return false;
      }
      const nextClaimed = readBigInt(result.body);
      return claimedNowValue === null ? nextClaimed > claimedBeforeValue : nextClaimed >= claimedBeforeValue + claimedNowValue;
    },
    "claimRewardCampaign.claimedAfter",
  );

  const claimableAfter = await waitForWorkflowReadback(
    () => tokenomics.claimableAmount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.campaignId, claimer, body.totalAllocation],
    }),
    (result) => result.statusCode === 200,
    "claimRewardCampaign.claimableAfter",
  );

  const campaignAfter = await waitForWorkflowReadback(
    () => tokenomics.getCampaign({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.campaignId],
    }),
    (result) => {
      if (result.statusCode !== 200) {
        return false;
      }
      const totalClaimed = readBigInt(asRecord(result.body)?.totalClaimed);
      return claimedNowValue === null ? totalClaimed > campaignBeforeTotalClaimed : totalClaimed >= campaignBeforeTotalClaimed + claimedNowValue;
    },
    "claimRewardCampaign.campaignAfter",
  );

  return {
    campaign: {
      before: campaignBefore.body,
      after: campaignAfter.body,
    },
    claimable: {
      before: claimableBefore.body,
      after: claimableAfter.body,
    },
    claimed: {
      before: claimedBefore.body,
      after: claimedAfter.body,
      claimedNow,
    },
    claim: {
      submission: claim.body,
      txHash: claimTxHash,
      eventCount: claimEvents.length,
    },
    summary: {
      campaignId: body.campaignId,
      claimer,
      totalAllocation: body.totalAllocation,
    },
  };
}

async function waitForCampaignRead(
  tokenomics: ReturnType<typeof createTokenomicsPrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  campaignId: string,
  label: string,
) {
  return waitForWorkflowReadback(
    () => tokenomics.getCampaign({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [campaignId],
    }),
    (result) => result.statusCode === 200,
    label,
  );
}
