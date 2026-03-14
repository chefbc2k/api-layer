import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import {
  participantActivationFlowWorkflowSchema,
  runParticipantActivationFlowWorkflow,
} from "./participant-activation-flow.js";
import {
  inspectVestingAdminPolicySchema,
  runInspectVestingAdminPolicyWorkflow,
  runUpdateVestingAdminPolicyWorkflow,
  updateVestingAdminPolicySchema,
} from "./vesting-admin-policy.js";

// Incentive story: operator incentive grant flow.
// An operator can optionally inspect or update vesting policy posture, then activate a participant
// through the existing staking/rewards/beneficiary lifecycle wrapper, while keeping admin authority,
// EchoScore, and campaign-funding preconditions explicit in the result.

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

const policySectionSchema = z.object({
  actor: actorOverrideSchema.optional(),
  inspectBefore: z.boolean().optional(),
  update: updateVestingAdminPolicySchema.optional(),
  inspectAfter: z.boolean().optional(),
}).superRefine((body, ctx) => {
  if (body.inspectBefore !== true && body.inspectAfter !== true && body.update === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "operator-incentive-grant-flow policy expected inspectBefore, inspectAfter, or update",
      path: [],
    });
  }
});

export const operatorIncentiveGrantFlowWorkflowSchema = z.object({
  policy: policySectionSchema.optional(),
  activation: participantActivationFlowWorkflowSchema,
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

export async function runOperatorIncentiveGrantFlowWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof operatorIncentiveGrantFlowWorkflowSchema>,
) {
  const policyActor = resolveActorOverride(context, auth, walletAddress, body.policy?.actor);
  const shouldInspectBefore = Boolean(body.policy && (body.policy.inspectBefore === true || body.policy.update !== undefined));
  const shouldInspectAfter = Boolean(body.policy && (body.policy.inspectAfter === true || body.policy.update !== undefined));

  const policyBefore = shouldInspectBefore
    ? await runStateAwareStep(() => runInspectVestingAdminPolicyWorkflow(context, policyActor.auth, policyActor.walletAddress, inspectVestingAdminPolicySchema.parse({})))
    : notRequestedStep();

  const policyUpdate = body.policy?.update
    ? await runStateAwareStep(() => runUpdateVestingAdminPolicyWorkflow(
      context,
      policyActor.auth,
      policyActor.walletAddress,
      body.policy!.update!,
    ))
    : notRequestedStep();

  const policyAfter = shouldInspectAfter
    ? await runStateAwareStep(() => runInspectVestingAdminPolicyWorkflow(context, policyActor.auth, policyActor.walletAddress, inspectVestingAdminPolicySchema.parse({})))
    : notRequestedStep();

  const activation = await runParticipantActivationFlowWorkflow(context, auth, walletAddress, body.activation);

  return {
    policy: {
      before: policyBefore,
      update: policyUpdate,
      after: policyAfter,
    },
    activation,
    summary: {
      story: "operator incentive grant flow",
      participant: activation.summary.participant,
      delegatee: activation.summary.delegatee,
      rewardCampaignId: activation.summary.rewardCampaignId,
      stakingCompleted: activation.summary.stakingCompleted,
      claimCompleted: activation.summary.claimCompleted,
      vestingCreated: activation.summary.vestingCreated,
      policyUpdated: policyUpdate.status === "completed",
      blockedSteps: [
        ...collectPolicyBlockedSteps({ policyBefore, policyUpdate, policyAfter }),
        ...activation.summary.blockedSteps.map((step: string) => `activation.${step}`),
      ],
      externalPreconditions: [
        ...collectPolicyExternalPreconditions({ policyBefore, policyUpdate, policyAfter }),
        ...activation.summary.externalPreconditions.map((entry: { step: string, message: string }) => ({
          step: `activation.${entry.step}`,
          message: entry.message,
        })),
      ],
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
    throw new HttpError(400, "operator-incentive-grant-flow received unknown policy actor apiKey");
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

function collectPolicyBlockedSteps(
  steps: {
    policyBefore: StepState<unknown>,
    policyUpdate: StepState<unknown>,
    policyAfter: StepState<unknown>,
  },
): string[] {
  return Object.entries(steps)
    .filter(([, step]) => step.status === "blocked-by-external-precondition")
    .map(([label]) => `policy.${label}`);
}

function collectPolicyExternalPreconditions(
  steps: {
    policyBefore: StepState<unknown>,
    policyUpdate: StepState<unknown>,
    policyAfter: StepState<unknown>,
  },
): Array<{ step: string, message: string }> {
  return Object.entries(steps)
    .flatMap(([label, step]) => step.status === "blocked-by-external-precondition" && step.block
      ? [{ step: `policy.${label}`, message: step.block.message }]
      : []);
}
