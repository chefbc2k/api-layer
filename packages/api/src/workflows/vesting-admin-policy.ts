import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import { waitForWorkflowReadback } from "./reward-campaign-helpers.js";

export const inspectVestingAdminPolicySchema = z.object({});

export async function runInspectVestingAdminPolicyWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  _body: z.infer<typeof inspectVestingAdminPolicySchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const [twaveMinimumDuration, twaveQuarterlyUnlockRate] = await Promise.all([
    tokenomics.getMinTwaveVestingDuration({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    tokenomics.getQuarterlyUnlockRate({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
  ]);

  return {
    standardVesting: {
      minimumDuration: null,
      readable: false,
      note: "mounted Layer 1 exposes setMinimumVestingDuration but no companion read route",
    },
    timewave: {
      minimumDuration: twaveMinimumDuration.body,
      quarterlyUnlockRate: twaveQuarterlyUnlockRate.body,
    },
    summary: {
      hasStandardMinimumReadback: false,
      hasTwaveMinimumReadback: twaveMinimumDuration.statusCode === 200,
      hasTwaveQuarterlyRateReadback: twaveQuarterlyUnlockRate.statusCode === 200,
    },
  };
}

export const updateVestingAdminPolicySchema = z.object({
  standardMinimumDuration: z.string().regex(/^\d+$/u).optional(),
  twaveMinimumDuration: z.string().regex(/^\d+$/u).optional(),
  twaveQuarterlyUnlockRate: z.string().regex(/^\d+$/u).optional(),
}).refine(
  (body) => body.standardMinimumDuration !== undefined
    || body.twaveMinimumDuration !== undefined
    || body.twaveQuarterlyUnlockRate !== undefined,
  {
    message: "update-vesting-admin-policy expected at least one requested change",
  },
);

export async function runUpdateVestingAdminPolicyWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof updateVestingAdminPolicySchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const before = await runInspectVestingAdminPolicyWorkflow(context, auth, walletAddress, {});

  let standardMinimumDurationTxHash: string | null = null;
  let standardMinimumDurationSubmission: unknown = null;
  if (body.standardMinimumDuration !== undefined) {
    const update = await tokenomics.setMinimumVestingDuration({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.standardMinimumDuration],
    }).catch((error: unknown) => {
      throw normalizeVestingAdminPolicyError(error, "standardMinimumDuration");
    });
    standardMinimumDurationSubmission = update.body;
    standardMinimumDurationTxHash = await waitForWorkflowWriteReceipt(context, update.body, "updateVestingAdminPolicy.standardMinimumDuration");
  }

  let twaveMinimumDurationSubmission: unknown = null;
  let twaveMinimumDurationTxHash: string | null = null;
  let twaveMinimumDurationAfter = before.timewave.minimumDuration;
  if (body.twaveMinimumDuration !== undefined) {
    const update = await tokenomics.setMinimumTwaveVestingDuration({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.twaveMinimumDuration],
    }).catch((error: unknown) => {
      throw normalizeVestingAdminPolicyError(error, "twaveMinimumDuration");
    });
    twaveMinimumDurationSubmission = update.body;
    twaveMinimumDurationTxHash = await waitForWorkflowWriteReceipt(context, update.body, "updateVestingAdminPolicy.twaveMinimumDuration");
    const readback = await waitForWorkflowReadback(
      () => tokenomics.getMinTwaveVestingDuration({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      }),
      (result) => result.statusCode === 200 && result.body === body.twaveMinimumDuration,
      "updateVestingAdminPolicy.twaveMinimumDuration",
    );
    twaveMinimumDurationAfter = readback.body;
  }

  let twaveQuarterlyUnlockRateSubmission: unknown = null;
  let twaveQuarterlyUnlockRateTxHash: string | null = null;
  let twaveQuarterlyUnlockRateAfter = before.timewave.quarterlyUnlockRate;
  if (body.twaveQuarterlyUnlockRate !== undefined) {
    const update = await tokenomics.setQuarterlyUnlockRate({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.twaveQuarterlyUnlockRate],
    }).catch((error: unknown) => {
      throw normalizeVestingAdminPolicyError(error, "twaveQuarterlyUnlockRate");
    });
    twaveQuarterlyUnlockRateSubmission = update.body;
    twaveQuarterlyUnlockRateTxHash = await waitForWorkflowWriteReceipt(context, update.body, "updateVestingAdminPolicy.twaveQuarterlyUnlockRate");
    const readback = await waitForWorkflowReadback(
      () => tokenomics.getQuarterlyUnlockRate({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      }),
      (result) => result.statusCode === 200 && result.body === body.twaveQuarterlyUnlockRate,
      "updateVestingAdminPolicy.twaveQuarterlyUnlockRate",
    );
    twaveQuarterlyUnlockRateAfter = readback.body;
  }

  return {
    standardVesting: {
      minimumDuration: {
        before: before.standardVesting.minimumDuration,
        requested: body.standardMinimumDuration ?? null,
        submission: standardMinimumDurationSubmission,
        txHash: standardMinimumDurationTxHash,
        confirmation: body.standardMinimumDuration === undefined ? "not-requested" : "receipt-only",
        readableAfter: false,
      },
    },
    timewave: {
      minimumDuration: {
        before: before.timewave.minimumDuration,
        requested: body.twaveMinimumDuration ?? null,
        submission: twaveMinimumDurationSubmission,
        txHash: twaveMinimumDurationTxHash,
        after: twaveMinimumDurationAfter,
        confirmation: body.twaveMinimumDuration === undefined ? "not-requested" : "readback-confirmed",
      },
      quarterlyUnlockRate: {
        before: before.timewave.quarterlyUnlockRate,
        requested: body.twaveQuarterlyUnlockRate ?? null,
        submission: twaveQuarterlyUnlockRateSubmission,
        txHash: twaveQuarterlyUnlockRateTxHash,
        after: twaveQuarterlyUnlockRateAfter,
        confirmation: body.twaveQuarterlyUnlockRate === undefined ? "not-requested" : "readback-confirmed",
      },
    },
    summary: {
      requestedStandardMinimumDuration: body.standardMinimumDuration ?? null,
      requestedTwaveMinimumDuration: body.twaveMinimumDuration ?? null,
      requestedTwaveQuarterlyUnlockRate: body.twaveQuarterlyUnlockRate ?? null,
      standardMinimumDurationReadable: false,
    },
  };
}

function normalizeVestingAdminPolicyError(
  error: unknown,
  control: "standardMinimumDuration" | "twaveMinimumDuration" | "twaveQuarterlyUnlockRate",
): unknown {
  const text = collectErrorText(error).toLowerCase();
  const isAuthorityFailure = text.includes("unauthorizeduser") || text.includes("0xa2880f97") || text.includes("invalidrole") || text.includes("0xd954416a");
  if (isAuthorityFailure) {
    return new HttpError(409, `update-vesting-admin-policy blocked by insufficient admin authority for ${control}`, extractDiagnostics(error));
  }
  if (text.includes("invalidduration") || text.includes("0x4ede0ebc")) {
    return new HttpError(409, "update-vesting-admin-policy blocked by invalid parameter range for standard minimum duration", extractDiagnostics(error));
  }
  if (text.includes("invalidvestingduration") || text.includes("0x2b39f6cb")) {
    return new HttpError(409, "update-vesting-admin-policy blocked by invalid parameter range for Timewave minimum duration", extractDiagnostics(error));
  }
  if (text.includes("invalidtokenamount") || text.includes("0x1bc3a582")) {
    return new HttpError(409, "update-vesting-admin-policy blocked by invalid parameter range for Timewave quarterly unlock rate", extractDiagnostics(error));
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
