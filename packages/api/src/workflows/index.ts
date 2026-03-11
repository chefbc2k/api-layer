import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { toHttpError } from "../shared/errors.js";
import { createEventSchema } from "../shared/route-factory.js";
import { runRegisterVoiceAssetWorkflow, registerVoiceAssetWorkflowSchema, runTransferRightsWorkflow, transferRightsWorkflowSchema } from "../modules/voice-assets/index.js";
import { createDatasetAndListForSaleSchema, runCreateDatasetAndListForSaleWorkflow } from "./create-dataset-and-list-for-sale.js";
import { onboardRightsHolderSchema, runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";
import { registerWhisperBlockSchema, runRegisterWhisperBlockWorkflow } from "./register-whisper-block.js";
import { stakeAndDelegateSchema, runStakeAndDelegateWorkflow } from "./stake-and-delegate.js";
import { runSubmitProposalAndVoteWorkflow, submitProposalAndVoteSchema } from "./submit-proposal-and-vote.js";

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
  router.post("/v1/workflows/create-dataset-and-list-for-sale", createWorkflowHandler(context, createDatasetAndListForSaleSchema, (auth, walletAddress, body) => runCreateDatasetAndListForSaleWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/onboard-rights-holder", createWorkflowHandler(context, onboardRightsHolderSchema, (auth, walletAddress, body) => runOnboardRightsHolderWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/stake-and-delegate", createWorkflowHandler(context, stakeAndDelegateSchema, (auth, walletAddress, body) => runStakeAndDelegateWorkflow(context, auth, walletAddress, body)));
  router.post("/v1/workflows/submit-proposal-and-vote", createWorkflowHandler(context, submitProposalAndVoteSchema, (auth, walletAddress, body) => runSubmitProposalAndVoteWorkflow(context, auth, walletAddress, body)));
  return router;
}
