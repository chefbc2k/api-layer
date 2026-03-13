import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { claimRewardCampaignSchema, runClaimRewardCampaignWorkflow } from "./claim-reward-campaign.js";
import { createBeneficiaryVestingSchema, runCreateBeneficiaryVestingWorkflow } from "./create-beneficiary-vesting.js";
import { createRewardCampaignSchema, runCreateRewardCampaignWorkflow } from "./create-reward-campaign.js";
import { inspectBeneficiaryVestingSchema, runInspectBeneficiaryVestingWorkflow } from "./inspect-beneficiary-vesting.js";
import { manageRewardCampaignSchema, runManageRewardCampaignWorkflow } from "./manage-reward-campaign.js";
import { runStakeAndDelegateWorkflow, stakeAndDelegateSchema } from "./stake-and-delegate.js";

// Utility story: participant activation flow.
// Optional operator reward context can be prepared first, then the participant stakes and delegates,
// then an activation reward can be claimed, and finally a beneficiary incentive schedule can be created or inspected.

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

const manageRewardCampaignInputSchema = z.object({
  campaignId: z.string().regex(/^\d+$/u).optional(),
  newMerkleRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/u).optional(),
  paused: z.boolean().optional(),
}).refine((body) => body.newMerkleRoot !== undefined || body.paused !== undefined, {
  message: "participant-activation-flow expected at least one reward-campaign change",
});

const claimRewardCampaignInputSchema = z.object({
  campaignId: claimRewardCampaignSchema.shape.campaignId.optional(),
  totalAllocation: claimRewardCampaignSchema.shape.totalAllocation,
  proof: claimRewardCampaignSchema.shape.proof,
  actor: actorOverrideSchema.optional(),
});

export const participantActivationFlowWorkflowSchema = z.object({
  staking: stakeAndDelegateSchema,
  rewards: z.object({
    campaign: z.object({
      actor: actorOverrideSchema.optional(),
      create: createRewardCampaignSchema.optional(),
      manage: manageRewardCampaignInputSchema.optional(),
    }).optional(),
    claim: claimRewardCampaignInputSchema.optional(),
  }).optional(),
  vesting: z.object({
    actor: actorOverrideSchema.optional(),
    create: createBeneficiaryVestingSchema.optional(),
    inspect: inspectBeneficiaryVestingSchema.optional(),
  }).optional(),
}).superRefine((body, ctx) => {
  if (body.rewards?.claim && !body.rewards.claim.campaignId && !body.rewards.campaign?.create) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rewards", "claim", "campaignId"],
      message: "participant-activation-flow claim requires campaignId when no campaign create step is requested",
    });
  }
  if (body.rewards?.campaign?.manage && !body.rewards.campaign.manage.campaignId && !body.rewards.campaign.create) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rewards", "campaign", "manage", "campaignId"],
      message: "participant-activation-flow manage requires campaignId when no campaign create step is requested",
    });
  }
  if (body.vesting && !body.vesting.create && !body.vesting.inspect) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vesting"],
      message: "participant-activation-flow vesting expected create or inspect",
    });
  }
});

type StepBlock = {
  statusCode: number,
  message: string,
  diagnostics?: unknown,
};

type StepState<T> =
  | { status: "completed", result: T, block: null }
  | { status: "blocked-by-external-precondition", result: null, block: StepBlock }
  | { status: "not-requested", result: null, block: null }
  | { status: "skipped", result: null, block: null, reason: string };

export async function runParticipantActivationFlowWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof participantActivationFlowWorkflowSchema>,
) {
  const rewardCampaignActor = resolveActorOverride(context, auth, walletAddress, body.rewards?.campaign?.actor);
  const rewardClaimActor = resolveActorOverride(context, auth, walletAddress, body.rewards?.claim?.actor);
  const vestingActor = resolveActorOverride(context, auth, walletAddress, body.vesting?.actor);

  let rewardCampaignId: string | null = null;

  const rewardCampaignCreate = body.rewards?.campaign?.create
    ? await runStateAwareStep(() => runCreateRewardCampaignWorkflow(
      context,
      rewardCampaignActor.auth,
      rewardCampaignActor.walletAddress,
      body.rewards!.campaign!.create!,
    ))
    : notRequestedStep();
  if (rewardCampaignCreate.status === "completed") {
    rewardCampaignId = rewardCampaignCreate.result.campaign.campaignId;
  }

  let rewardCampaignManage: StepState<Awaited<ReturnType<typeof runManageRewardCampaignWorkflow>>> = notRequestedStep();
  if (body.rewards?.campaign?.manage) {
    const campaignId = body.rewards.campaign.manage.campaignId ?? rewardCampaignId;
    rewardCampaignManage = campaignId
      ? await runStateAwareStep(() => runManageRewardCampaignWorkflow(
        context,
        rewardCampaignActor.auth,
        rewardCampaignActor.walletAddress,
        {
          campaignId,
          newMerkleRoot: body.rewards!.campaign!.manage!.newMerkleRoot,
          paused: body.rewards!.campaign!.manage!.paused,
        },
      ))
      : skippedStep("reward campaign id was not established");
    if (rewardCampaignManage.status === "completed") {
      rewardCampaignId = rewardCampaignManage.result.summary.campaignId;
    }
  }

  const staking = await runStateAwareStep(() => runStakeAndDelegateWorkflow(context, auth, walletAddress, body.staking));
  const stakingCompleted = staking.status === "completed";

  let rewardClaim: StepState<Awaited<ReturnType<typeof runClaimRewardCampaignWorkflow>>> = notRequestedStep();
  if (body.rewards?.claim) {
    if (!stakingCompleted) {
      rewardClaim = skippedStep("staking did not complete");
    } else {
      const campaignId = body.rewards.claim.campaignId ?? rewardCampaignId;
      rewardClaim = campaignId
        ? await runStateAwareStep(() => runClaimRewardCampaignWorkflow(
          context,
          rewardClaimActor.auth,
          rewardClaimActor.walletAddress,
          {
            campaignId,
            totalAllocation: body.rewards!.claim!.totalAllocation,
            proof: body.rewards!.claim!.proof,
          },
        ))
        : skippedStep("claim campaign id was not established");
    }
  }

  let vestingCreate: StepState<Awaited<ReturnType<typeof runCreateBeneficiaryVestingWorkflow>>> = notRequestedStep();
  let vestingInspect: StepState<Awaited<ReturnType<typeof runInspectBeneficiaryVestingWorkflow>>> = notRequestedStep();
  if (body.vesting?.create) {
    vestingCreate = stakingCompleted
      ? await runStateAwareStep(() => runCreateBeneficiaryVestingWorkflow(
        context,
        vestingActor.auth,
        vestingActor.walletAddress,
        body.vesting!.create!,
      ))
      : skippedStep("staking did not complete");
  }

  if (body.vesting?.inspect) {
    vestingInspect = stakingCompleted
      ? await runStateAwareStep(() => runInspectBeneficiaryVestingWorkflow(
        context,
        vestingActor.auth,
        vestingActor.walletAddress,
        body.vesting!.inspect!,
      ))
      : skippedStep("staking did not complete");
  } else if (vestingCreate.status === "completed") {
    vestingInspect = await runStateAwareStep(() => runInspectBeneficiaryVestingWorkflow(
      context,
      vestingActor.auth,
      vestingActor.walletAddress,
      { beneficiary: vestingCreate.result.summary.beneficiary },
    ));
  }

  return {
    staking,
    rewards: {
      campaign: {
        create: rewardCampaignCreate,
        manage: rewardCampaignManage,
        campaignId: rewardCampaignId,
      },
      claim: rewardClaim,
    },
    vesting: {
      create: vestingCreate,
      inspect: vestingInspect,
    },
    summary: {
      story: "participant activation flow",
      participant: staking.status === "completed" ? staking.result.summary.staker : walletAddress ?? null,
      delegatee: body.staking.delegatee,
      rewardCampaignId,
      stakingCompleted,
      claimCompleted: rewardClaim.status === "completed",
      vestingCreated: vestingCreate.status === "completed",
      blockedSteps: collectBlockedSteps({
        rewardCampaignCreate,
        rewardCampaignManage,
        staking,
        rewardClaim,
        vestingCreate,
        vestingInspect,
      }),
      externalPreconditions: collectExternalPreconditions({
        rewardCampaignCreate,
        rewardCampaignManage,
        staking,
        rewardClaim,
        vestingCreate,
        vestingInspect,
      }),
    },
  };
}

function resolveActorOverride(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  actor: z.infer<typeof actorOverrideSchema> | undefined,
) {
  if (!actor) {
    return { auth, walletAddress };
  }
  const childAuth = context.apiKeys[actor.apiKey];
  if (!childAuth) {
    throw new HttpError(400, "participant-activation-flow received unknown actor apiKey");
  }
  return {
    auth: childAuth,
    walletAddress: actor.walletAddress ?? walletAddress,
  };
}

async function runStateAwareStep<T>(
  run: () => Promise<T>,
): Promise<StepState<T>> {
  try {
    return {
      status: "completed",
      result: await run(),
      block: null,
    };
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 409) {
      return {
        status: "blocked-by-external-precondition",
        result: null,
        block: {
          statusCode: error.statusCode,
          message: error.message,
          diagnostics: error.diagnostics,
        },
      };
    }
    throw error;
  }
}

function notRequestedStep<T>(): StepState<T> {
  return {
    status: "not-requested",
    result: null,
    block: null,
  };
}

function skippedStep<T>(reason: string): StepState<T> {
  return {
    status: "skipped",
    result: null,
    block: null,
    reason,
  };
}

function collectBlockedSteps(
  steps: Record<string, StepState<unknown>>,
): string[] {
  return Object.entries(steps)
    .filter(([, step]) => step.status === "blocked-by-external-precondition")
    .map(([label]) => label);
}

function collectExternalPreconditions(
  steps: Record<string, StepState<unknown>>,
): Array<{ step: string, message: string }> {
  return Object.entries(steps)
    .flatMap(([label, step]) => step.status === "blocked-by-external-precondition" && step.block
      ? [{ step: label, message: step.block.message }]
      : []);
}
