import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { toHttpError } from "../shared/errors.js";
import { createEventSchema } from "../shared/route-factory.js";
import { runRegisterVoiceAssetWorkflow, registerVoiceAssetWorkflowSchema, runTransferRightsWorkflow, transferRightsWorkflowSchema } from "../modules/voice-assets/index.js";
import { createDatasetAndListForSaleSchema, runCreateDatasetAndListForSaleWorkflow } from "./create-dataset-and-list-for-sale.js";
import { createBeneficiaryVestingSchema, runCreateBeneficiaryVestingWorkflow } from "./create-beneficiary-vesting.js";
import { claimRewardCampaignSchema, runClaimRewardCampaignWorkflow } from "./claim-reward-campaign.js";
import { cancelMarketplaceListingSchema, runCancelMarketplaceListingWorkflow } from "./cancel-marketplace-listing.js";
import { commercializeVoiceAssetWorkflowSchema, runCommercializeVoiceAssetWorkflow } from "./commercialize-voice-asset.js";
import { rightsAwareCommercializeVoiceAssetWorkflowSchema, runRightsAwareCommercializeVoiceAssetWorkflow } from "./rights-aware-commercialize-voice-asset.js";
import { createRewardCampaignSchema, runCreateRewardCampaignWorkflow } from "./create-reward-campaign.js";
import { createMarketplaceListingSchema, runCreateMarketplaceListingWorkflow } from "./create-marketplace-listing.js";
import { inspectBeneficiaryVestingSchema, runInspectBeneficiaryVestingWorkflow } from "./inspect-beneficiary-vesting.js";
import { inspectMarketplaceListingSchema, runInspectMarketplaceListingWorkflow } from "./inspect-marketplace-listing.js";
import { participantActivationFlowWorkflowSchema, runParticipantActivationFlowWorkflow } from "./participant-activation-flow.js";
import { governanceAdminFlowWorkflowSchema, runGovernanceAdminFlowWorkflow } from "./governance-admin-flow.js";
import { governanceExecutionFlowWorkflowSchema, runGovernanceExecutionFlowWorkflow } from "./governance-execution-flow.js";
import { manageRewardCampaignSchema, runManageRewardCampaignWorkflow } from "./manage-reward-campaign.js";
import { onboardRightsHolderSchema, runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";
import { onboardVoiceAssetWorkflowSchema, runOnboardVoiceAssetWorkflow } from "./onboard-voice-asset.js";
import { purchaseMarketplaceAssetSchema, runPurchaseMarketplaceAssetWorkflow } from "./purchase-marketplace-asset.js";
import { registerWhisperBlockSchema, runRegisterWhisperBlockWorkflow } from "./register-whisper-block.js";
import { releaseEscrowedAssetSchema, runReleaseEscrowedAssetWorkflow } from "./release-escrowed-asset.js";
import { releaseBeneficiaryVestingSchema, runReleaseBeneficiaryVestingWorkflow } from "./release-beneficiary-vesting.js";
import { revokeBeneficiaryVestingSchema, runRevokeBeneficiaryVestingWorkflow } from "./revoke-beneficiary-vesting.js";
import { stakeAndDelegateSchema, runStakeAndDelegateWorkflow } from "./stake-and-delegate.js";
import { runSubmitProposalWorkflow, submitProposalWorkflowSchema } from "./submit-proposal.js";
import { runTransferAndResecureVoiceAssetWorkflow, transferAndResecureVoiceAssetWorkflowSchema } from "./transfer-and-resecure-voice-asset.js";
import { runUpdateMarketplaceListingPriceWorkflow, updateMarketplaceListingPriceSchema } from "./update-marketplace-listing-price.js";
import { inspectVestingAdminPolicySchema, runInspectVestingAdminPolicyWorkflow, runUpdateVestingAdminPolicyWorkflow, updateVestingAdminPolicySchema } from "./vesting-admin-policy.js";
import { runVoteOnProposalWorkflow, voteOnProposalWorkflowSchema } from "./vote-on-proposal.js";
import { runWithdrawMarketplacePaymentsWorkflow, withdrawMarketplacePaymentsSchema } from "./withdraw-marketplace-payments.js";

function createWorkflowHandler<T extends z.ZodTypeAny>(
  context: ApiExecutionContext,
  schema: T,
  run: (auth: import("../shared/auth.js").AuthContext, walletAddress: string | undefined, body: z.infer<T>) => Promise<unknown>,
) {
  return async (request: import("express").Request, response: import("express").Response) => {
    try {
      const auth = authenticate(context.apiKeys, request.header("x-api-key") ?? undefined);
      const body = schema.parse(request.body ?? {});
      response.status(202).json(await run(auth, request.header("x-wallet-address") ?? undefined, body));
    } catch (error) {
      const httpError = toHttpError(error);
      response.status(httpError.statusCode).json({
        error: httpError.message,
        ...(httpError.diagnostics === undefined ? {} : { diagnostics: httpError.diagnostics }),
      });
    }
  };
}

export function createWorkflowRouter(context: ApiExecutionContext): Router {
  const router = Router();
  router.post("/v1/workflows/register-voice-asset", createWorkflowHandler(context, registerVoiceAssetWorkflowSchema, (auth, walletAddress, body) => runRegisterVoiceAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/transfer-rights", createWorkflowHandler(context, transferRightsWorkflowSchema, (auth, walletAddress, body) => runTransferRightsWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/register-whisper-block", createWorkflowHandler(context, registerWhisperBlockSchema, (auth, walletAddress, body) => runRegisterWhisperBlockWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/transfer-and-resecure-voice-asset", createWorkflowHandler(context, transferAndResecureVoiceAssetWorkflowSchema, (auth, walletAddress, body) => runTransferAndResecureVoiceAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/create-dataset-and-list-for-sale", createWorkflowHandler(context, createDatasetAndListForSaleSchema, (auth, walletAddress, body) => runCreateDatasetAndListForSaleWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/create-marketplace-listing", createWorkflowHandler(context, createMarketplaceListingSchema, (auth, walletAddress, body) => runCreateMarketplaceListingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/commercialize-voice-asset", createWorkflowHandler(context, commercializeVoiceAssetWorkflowSchema, (auth, walletAddress, body) => runCommercializeVoiceAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/rights-aware-commercialize-voice-asset", createWorkflowHandler(context, rightsAwareCommercializeVoiceAssetWorkflowSchema, (auth, walletAddress, body) => runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/inspect-marketplace-listing", createWorkflowHandler(context, inspectMarketplaceListingSchema, (auth, walletAddress, body) => runInspectMarketplaceListingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/update-marketplace-listing-price", createWorkflowHandler(context, updateMarketplaceListingPriceSchema, (auth, walletAddress, body) => runUpdateMarketplaceListingPriceWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/cancel-marketplace-listing", createWorkflowHandler(context, cancelMarketplaceListingSchema, (auth, walletAddress, body) => runCancelMarketplaceListingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/release-escrowed-asset", createWorkflowHandler(context, releaseEscrowedAssetSchema, (auth, walletAddress, body) => runReleaseEscrowedAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/purchase-marketplace-asset", createWorkflowHandler(context, purchaseMarketplaceAssetSchema, (auth, walletAddress, body) => runPurchaseMarketplaceAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/withdraw-marketplace-payments", createWorkflowHandler(context, withdrawMarketplacePaymentsSchema, (auth, walletAddress, body) => runWithdrawMarketplacePaymentsWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/create-beneficiary-vesting", createWorkflowHandler(context, createBeneficiaryVestingSchema, (auth, walletAddress, body) => runCreateBeneficiaryVestingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/inspect-beneficiary-vesting", createWorkflowHandler(context, inspectBeneficiaryVestingSchema, (auth, walletAddress, body) => runInspectBeneficiaryVestingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/release-beneficiary-vesting", createWorkflowHandler(context, releaseBeneficiaryVestingSchema, (auth, walletAddress, body) => runReleaseBeneficiaryVestingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/revoke-beneficiary-vesting", createWorkflowHandler(context, revokeBeneficiaryVestingSchema, (auth, walletAddress, body) => runRevokeBeneficiaryVestingWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/inspect-vesting-admin-policy", createWorkflowHandler(context, inspectVestingAdminPolicySchema, (auth, walletAddress, body) => runInspectVestingAdminPolicyWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/update-vesting-admin-policy", createWorkflowHandler(context, updateVestingAdminPolicySchema, (auth, walletAddress, body) => runUpdateVestingAdminPolicyWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/create-reward-campaign", createWorkflowHandler(context, createRewardCampaignSchema, (auth, walletAddress, body) => runCreateRewardCampaignWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/manage-reward-campaign", createWorkflowHandler(context, manageRewardCampaignSchema, (auth, walletAddress, body) => runManageRewardCampaignWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/claim-reward-campaign", createWorkflowHandler(context, claimRewardCampaignSchema, (auth, walletAddress, body) => runClaimRewardCampaignWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/participant-activation-flow", createWorkflowHandler(context, participantActivationFlowWorkflowSchema, (auth, walletAddress, body) => runParticipantActivationFlowWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/onboard-rights-holder", createWorkflowHandler(context, onboardRightsHolderSchema, (auth, walletAddress, body) => runOnboardRightsHolderWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/onboard-voice-asset", createWorkflowHandler(context, onboardVoiceAssetWorkflowSchema, (auth, walletAddress, body) => runOnboardVoiceAssetWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/stake-and-delegate", createWorkflowHandler(context, stakeAndDelegateSchema, (auth, walletAddress, body) => runStakeAndDelegateWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/submit-proposal", createWorkflowHandler(context, submitProposalWorkflowSchema, (auth, walletAddress, body) => runSubmitProposalWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/vote-on-proposal", createWorkflowHandler(context, voteOnProposalWorkflowSchema, (auth, walletAddress, body) => runVoteOnProposalWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/governance-admin-flow", createWorkflowHandler(context, governanceAdminFlowWorkflowSchema, (auth, walletAddress, body) => runGovernanceAdminFlowWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/governance-execution-flow", createWorkflowHandler(context, governanceExecutionFlowWorkflowSchema, (auth, walletAddress, body) => runGovernanceExecutionFlowWorkflow(context, auth, walletAddress, body)));
  return router;
}
