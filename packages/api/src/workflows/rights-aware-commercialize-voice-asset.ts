import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { commercializeVoiceAssetWorkflowSchema, runCommercializeVoiceAssetWorkflow } from "./commercialize-voice-asset.js";
import { runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";

const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
const collaboratorRightsSetupSchema = z.object({
  role: bytes32Schema,
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  expiryTime: z.string().regex(/^\d+$/u),
  authorizeVoice: z.boolean().default(true),
});

// Rights setup does not override ownership requirements for commercialization.
export const rightsAwareCommercializeVoiceAssetWorkflowSchema = z.object({
  voiceAsset: z.object({
    voiceHash: bytes32Schema,
  }),
  rightsSetup: z.array(collaboratorRightsSetupSchema).default([]),
  commercialization: commercializeVoiceAssetWorkflowSchema,
});

export async function runRightsAwareCommercializeVoiceAssetWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof rightsAwareCommercializeVoiceAssetWorkflowSchema>,
) {
  const grants = [];
  for (const entry of body.rightsSetup) {
    const result = await runOnboardRightsHolderWorkflow(context, auth, walletAddress, {
      role: entry.role,
      account: entry.account,
      expiryTime: entry.expiryTime,
      voiceHashes: entry.authorizeVoice ? [body.voiceAsset.voiceHash] : [],
    });
    if (result.roleGrant.hasRole !== true) {
      throw new Error(`rights-aware-commercialize-voice-asset failed role confirmation for ${entry.account}`);
    }
    if (entry.authorizeVoice && result.authorizations.some((authorization) => authorization.isAuthorized !== true)) {
      throw new Error(`rights-aware-commercialize-voice-asset failed per-voice authorization confirmation for ${entry.account}`);
    }
    if (!entry.authorizeVoice && result.authorizations.length !== 0) {
      throw new Error(`rights-aware-commercialize-voice-asset expected no per-voice authorizations for ${entry.account}`);
    }
    grants.push({
      role: entry.role,
      account: entry.account,
      expiryTime: entry.expiryTime,
      authorizeVoice: entry.authorizeVoice,
      result,
    });
  }

  const commercialization = await runCommercializeVoiceAssetWorkflow(
    context,
    auth,
    walletAddress,
    body.commercialization,
  );

  const authorizedVoiceCount = grants.reduce(
    (count, entry) => count + entry.result.authorizations.filter((authorization) => authorization.isAuthorized === true).length,
    0,
  );

  return {
    rightsSetup: {
      voiceHash: body.voiceAsset.voiceHash,
      collaborators: grants,
      summary: {
        requestedCollaboratorCount: body.rightsSetup.length,
        completedCollaboratorCount: grants.length,
        roleGrantCount: grants.length,
        voiceAuthorizationCount: authorizedVoiceCount,
      },
    },
    packaging: commercialization.packaging,
    listing: commercialization.listing,
    purchase: commercialization.purchase,
    withdrawal: commercialization.withdrawal,
    summary: {
      voiceHash: body.voiceAsset.voiceHash,
      collaboratorCount: grants.length,
      voiceAuthorizationCount: authorizedVoiceCount,
      tokenId: commercialization.summary.tokenId,
      datasetId: commercialization.summary.datasetId,
      tradeReadiness: commercialization.summary.tradeReadiness,
      isTradable: commercialization.summary.isTradable,
      listingInspectionRequested: commercialization.summary.listingInspectionRequested,
      purchaseRequested: commercialization.summary.purchaseRequested,
      purchaseBuyer: commercialization.summary.purchaseBuyer,
      buyerFundingPrecondition: commercialization.summary.buyerFundingPrecondition,
      withdrawalRequested: commercialization.summary.withdrawalRequested,
      withdrawalPayee: commercialization.summary.withdrawalPayee,
    },
  };
}
