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
import { HttpError } from "../shared/errors.js";
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
  }).catch((error: unknown) => {
    throw normalizeClaimRewardCampaignExecutionError(error);
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

function normalizeClaimRewardCampaignExecutionError(error: unknown): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("campaignnotfound") || text.includes("0x2c067cd7")) {
    return new HttpError(409, "claim-reward-campaign blocked by setup/state: campaign not found", extractDiagnostics(error));
  }
  if (text.includes("campaignpaused") || text.includes("0xab1902ee")) {
    return new HttpError(409, "claim-reward-campaign blocked by setup/state: campaign is paused", extractDiagnostics(error));
  }
  if (text.includes("invalidmerkleproof") || text.includes("0xb05e92fa")) {
    return new HttpError(409, "claim-reward-campaign blocked by invalid proof inputs", extractDiagnostics(error));
  }
  if (text.includes("nothingtoclaim") || text.includes("0x969bf728")) {
    return new HttpError(409, "claim-reward-campaign blocked by missing claim eligibility: zero claimable amount", extractDiagnostics(error));
  }
  if (text.includes("insufficientcampaignfunding") || text.includes("0x7a36e7a3")) {
    return new HttpError(409, "claim-reward-campaign blocked by setup/state: campaign has no token funding", extractDiagnostics(error));
  }
  if (text.includes("invalidallocation") || text.includes("0x0baf7432")) {
    return new HttpError(409, "claim-reward-campaign blocked by invalid allocation input", extractDiagnostics(error));
  }
  if (text.includes("exceedscampaigncap") || text.includes("0x939fc1db")) {
    return new HttpError(409, "claim-reward-campaign blocked by campaign cap", extractDiagnostics(error));
  }
  return error;
}

function collectErrorText(error: unknown): string {
  const parts = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      parts.add(String(value));
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
      visit(nested);
    }
  };
  visit((error as { message?: unknown })?.message ?? error);
  visit((error as { diagnostics?: unknown })?.diagnostics);
  return Array.from(parts).join(" ");
}

function extractDiagnostics(error: unknown): unknown {
  return (error as { diagnostics?: unknown })?.diagnostics;
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
