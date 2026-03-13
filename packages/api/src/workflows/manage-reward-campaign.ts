import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  asRecord,
  hasTransactionHash,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const manageRewardCampaignSchema = z.object({
  campaignId: z.string().regex(/^\d+$/u),
  newMerkleRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/u).optional(),
  paused: z.boolean().optional(),
}).refine((body) => body.newMerkleRoot !== undefined || body.paused !== undefined, {
  message: "manage-reward-campaign expected at least one requested change",
});

export async function runManageRewardCampaignWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof manageRewardCampaignSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const campaignBefore = await waitForCampaignRead(tokenomics, auth, walletAddress, body.campaignId, "manageRewardCampaign.before");
  let currentCampaign = campaignBefore;

  const beforeRecord = asRecord(campaignBefore.body);
  const requestedMerkleRoot = body.newMerkleRoot ?? null;
  const shouldUpdateMerkleRoot = requestedMerkleRoot !== null && beforeRecord?.merkleRoot !== requestedMerkleRoot;

  let merkleRootSubmission: unknown = null;
  let merkleRootTxHash: string | null = null;
  let merkleRootEvents: unknown[] = [];
  if (shouldUpdateMerkleRoot && requestedMerkleRoot) {
    const update = await tokenomics.setMerkleRoot({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.campaignId, requestedMerkleRoot],
    });
    merkleRootSubmission = update.body;
    merkleRootTxHash = await waitForWorkflowWriteReceipt(context, update.body, "manageRewardCampaign.setMerkleRoot");
    const receipt = merkleRootTxHash ? await readWorkflowReceipt(context, merkleRootTxHash, "manageRewardCampaign.setMerkleRoot") : null;
    merkleRootEvents = receipt
      ? await waitForWorkflowEventQuery(
          () => tokenomics.campaignMerkleRootUpdatedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, merkleRootTxHash),
          "manageRewardCampaign.campaignMerkleRootUpdated",
        )
      : [];
    currentCampaign = await waitForWorkflowReadback(
      () => tokenomics.getCampaign({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.campaignId],
      }),
      (result) => asRecord(result.body)?.merkleRoot === requestedMerkleRoot,
      "manageRewardCampaign.afterMerkleRoot",
    );
  }

  const currentAfterMerkleUpdate = asRecord(currentCampaign.body);
  const requestedPaused = body.paused ?? null;
  const shouldChangePaused = requestedPaused !== null && currentAfterMerkleUpdate?.paused !== requestedPaused;

  let pauseSubmission: unknown = null;
  let pauseTxHash: string | null = null;
  let pauseEvents: unknown[] = [];
  let pauseAction: "pause" | "unpause" | "none" = "none";
  if (shouldChangePaused && requestedPaused !== null) {
    pauseAction = requestedPaused ? "pause" : "unpause";
    const pauseWrite = requestedPaused
      ? await tokenomics.pauseCampaign({
          auth,
          api: { executionSource: "auto", gaslessMode: "none" },
          walletAddress,
          wireParams: [body.campaignId],
        })
      : await tokenomics.unpauseCampaign({
          auth,
          api: { executionSource: "auto", gaslessMode: "none" },
          walletAddress,
          wireParams: [body.campaignId],
        });
    pauseSubmission = pauseWrite.body;
    pauseTxHash = await waitForWorkflowWriteReceipt(context, pauseWrite.body, `manageRewardCampaign.${pauseAction}`);
    const receipt = pauseTxHash ? await readWorkflowReceipt(context, pauseTxHash, `manageRewardCampaign.${pauseAction}`) : null;
    pauseEvents = receipt
      ? await waitForWorkflowEventQuery(
          () => requestedPaused
            ? tokenomics.campaignPausedEventQuery({
                auth,
                fromBlock: BigInt(receipt.blockNumber),
                toBlock: BigInt(receipt.blockNumber),
              })
            : tokenomics.campaignUnpausedEventQuery({
                auth,
                fromBlock: BigInt(receipt.blockNumber),
                toBlock: BigInt(receipt.blockNumber),
              }),
          (logs) => hasTransactionHash(logs, pauseTxHash),
          requestedPaused ? "manageRewardCampaign.campaignPaused" : "manageRewardCampaign.campaignUnpaused",
        )
      : [];
    currentCampaign = await waitForWorkflowReadback(
      () => tokenomics.getCampaign({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.campaignId],
      }),
      (result) => asRecord(result.body)?.paused === requestedPaused,
      "manageRewardCampaign.afterPauseState",
    );
  }

  const finalCampaign = currentCampaign.body;
  const finalRecord = asRecord(finalCampaign);

  return {
    campaign: {
      before: campaignBefore.body,
      after: finalCampaign,
    },
    merkleRootUpdate: {
      requested: requestedMerkleRoot,
      submission: merkleRootSubmission,
      txHash: merkleRootTxHash,
      merkleRootAfter: finalRecord?.merkleRoot ?? currentAfterMerkleUpdate?.merkleRoot ?? beforeRecord?.merkleRoot ?? null,
      eventCount: merkleRootEvents.length,
      source: shouldUpdateMerkleRoot ? "updated" : requestedMerkleRoot === null ? "not-requested" : "unchanged",
    },
    pauseState: {
      requested: requestedPaused,
      action: pauseAction,
      submission: pauseSubmission,
      txHash: pauseTxHash,
      pausedAfter: finalRecord?.paused ?? currentAfterMerkleUpdate?.paused ?? beforeRecord?.paused ?? null,
      eventCount: pauseEvents.length,
      source: shouldChangePaused ? pauseAction === "pause" ? "paused" : "unpaused" : requestedPaused === null ? "not-requested" : "unchanged",
    },
    summary: {
      campaignId: body.campaignId,
      requestedMerkleRoot,
      requestedPaused,
      finalMerkleRoot: finalRecord?.merkleRoot ?? null,
      finalPaused: finalRecord?.paused ?? null,
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
