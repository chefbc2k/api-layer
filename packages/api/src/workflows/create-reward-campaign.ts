import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  asRecord,
  extractCampaignIdFromLogs,
  extractScalarResult,
  hasTransactionHash,
  readBigInt,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const createRewardCampaignSchema = z.object({
  merkleRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/u),
  startTime: z.string().regex(/^\d+$/u),
  cliffSeconds: z.string().regex(/^\d+$/u),
  durationSeconds: z.string().regex(/^\d+$/u),
  tgeUnlockBps: z.string().regex(/^\d+$/u),
  maxTotalClaimable: z.string().regex(/^\d+$/u),
});

export async function runCreateRewardCampaignWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof createRewardCampaignSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const campaignCountBefore = await waitForWorkflowReadback(
    () => tokenomics.campaignCount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (result) => result.statusCode === 200,
    "createRewardCampaign.campaignCountBefore",
  );
  const campaignCountBeforeValue = readBigInt(campaignCountBefore.body);

  const creation = await tokenomics.createCampaign({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [
      body.merkleRoot,
      body.startTime,
      body.cliffSeconds,
      body.durationSeconds,
      body.tgeUnlockBps,
      body.maxTotalClaimable,
    ],
  });
  const creationTxHash = await waitForWorkflowWriteReceipt(context, creation.body, "createRewardCampaign.create");
  const creationReceipt = creationTxHash ? await readWorkflowReceipt(context, creationTxHash, "createRewardCampaign.create") : null;
  const creationEvents = creationReceipt
    ? await waitForWorkflowEventQuery(
        () => tokenomics.campaignCreatedEventQuery({
          auth,
          fromBlock: BigInt(creationReceipt.blockNumber),
          toBlock: BigInt(creationReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, creationTxHash),
        "createRewardCampaign.campaignCreated",
      )
    : [];

  const campaignId = extractCampaignIdFromLogs(creationEvents, creationTxHash) ?? extractScalarResult(creation.body);
  if (!campaignId) {
    throw new Error("create-reward-campaign could not derive campaign id from write result or event query");
  }

  const campaignCountAfter = await waitForWorkflowReadback(
    () => tokenomics.campaignCount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (result) => result.statusCode === 200 && readBigInt(result.body) >= campaignCountBeforeValue + 1n,
    "createRewardCampaign.campaignCountAfter",
  );

  const campaignRead = await waitForWorkflowReadback(
    () => tokenomics.getCampaign({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [campaignId],
    }),
    (result) => matchesCreatedCampaign(result.body, body),
    "createRewardCampaign.getCampaign",
  );

  return {
    campaign: {
      submission: creation.body,
      txHash: creationTxHash,
      campaignId,
      read: campaignRead.body,
      eventCount: creationEvents.length,
    },
    counts: {
      before: campaignCountBefore.body,
      after: campaignCountAfter.body,
    },
    summary: {
      campaignId,
      merkleRoot: body.merkleRoot,
      startTime: body.startTime,
      cliffSeconds: body.cliffSeconds,
      durationSeconds: body.durationSeconds,
      tgeUnlockBps: body.tgeUnlockBps,
      maxTotalClaimable: body.maxTotalClaimable,
    },
  };
}

function matchesCreatedCampaign(
  value: unknown,
  body: z.infer<typeof createRewardCampaignSchema>,
): boolean {
  const campaign = asRecord(value);
  return campaign?.merkleRoot === body.merkleRoot
    && String(campaign.startTime ?? "") === body.startTime
    && String(campaign.cliffSeconds ?? "") === body.cliffSeconds
    && String(campaign.durationSeconds ?? "") === body.durationSeconds
    && String(campaign.tgeUnlockBps ?? "") === body.tgeUnlockBps
    && String(campaign.maxTotalClaimable ?? "") === body.maxTotalClaimable
    && campaign.paused === false;
}
