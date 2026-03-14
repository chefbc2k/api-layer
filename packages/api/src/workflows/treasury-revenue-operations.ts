import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { inspectRevenuePostureWorkflowSchema, runInspectRevenuePostureWorkflow } from "./inspect-revenue-posture.js";
import { runWithdrawMarketplacePaymentsWorkflow, withdrawMarketplacePaymentsSchema } from "./withdraw-marketplace-payments.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

const payoutSweepEntrySchema = z.object({
  actor: actorOverrideSchema.optional(),
  deadline: withdrawMarketplacePaymentsSchema.shape.deadline.optional(),
  label: z.string().min(1).optional(),
});

export const treasuryRevenueOperationsWorkflowSchema = z.object({
  posture: inspectRevenuePostureWorkflowSchema.optional(),
  payouts: z.object({
    sweeps: z.array(payoutSweepEntrySchema).min(1),
  }).optional(),
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

export async function runTreasuryRevenueOperationsWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof treasuryRevenueOperationsWorkflowSchema>,
) {
  const shouldInspectBefore = Boolean(body.posture || body.payouts);
  const postureBefore = shouldInspectBefore
    ? await runStateAwareStep(() => runInspectRevenuePostureWorkflow(
      context,
      auth,
      walletAddress,
      body.posture ?? {},
    ))
    : notRequestedStep();

  const sweeps = body.payouts?.sweeps
    ? await Promise.all(body.payouts.sweeps.map(async (entry, index) => {
      const actor = resolveActorOverride(context, auth, walletAddress, entry.actor);
      const result = await runStateAwareStep(() => runWithdrawMarketplacePaymentsWorkflow(
        context,
        actor.auth,
        actor.walletAddress,
        { deadline: entry.deadline },
      ));
      return {
        label: entry.label ?? `sweep-${index + 1}`,
        actor: actor.walletAddress ?? walletAddress ?? null,
        step: result,
      };
    }))
    : [];

  const postureAfter = body.payouts
    ? await runStateAwareStep(() => runInspectRevenuePostureWorkflow(
      context,
      auth,
      walletAddress,
      body.posture ?? {},
    ))
    : notRequestedStep();

  return {
    posture: {
      before: postureBefore,
      after: postureAfter,
    },
    payouts: {
      sweeps,
    },
    summary: {
      story: "treasury revenue operations",
      sweepCount: sweeps.length,
      completedSweepCount: sweeps.filter((entry) => entry.step.status === "completed").length,
      blockedSteps: [
        ...collectBlockedSteps({ postureBefore, postureAfter }),
        ...sweeps.flatMap((entry) => entry.step.status === "blocked-by-external-precondition" ? [`payouts.${entry.label}`] : []),
      ],
      externalPreconditions: [
        ...collectExternalPreconditions({ postureBefore, postureAfter }),
        ...sweeps.flatMap((entry) => entry.step.status === "blocked-by-external-precondition" && entry.step.block
          ? [{ step: `payouts.${entry.label}`, message: entry.step.block.message }]
          : []),
      ],
      paymentToken: postureAfter.status === "completed"
        ? postureAfter.result.funding.paymentToken
        : postureBefore.status === "completed"
          ? postureBefore.result.funding.paymentToken
          : null,
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
    throw new HttpError(400, "treasury-revenue-operations received unknown payout actor apiKey");
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

function collectBlockedSteps(steps: Record<string, StepState<unknown>>) {
  return Object.entries(steps)
    .filter(([, step]) => step.status === "blocked-by-external-precondition")
    .map(([label]) => `posture.${label}`);
}

function collectExternalPreconditions(steps: Record<string, StepState<unknown>>) {
  return Object.entries(steps)
    .flatMap(([label, step]) => step.status === "blocked-by-external-precondition" && step.block
      ? [{ step: `posture.${label}`, message: step.block.message }]
      : []);
}
