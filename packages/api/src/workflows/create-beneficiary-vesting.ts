import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  isVestingSchedulePresent,
  readVestingState,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
  hasTransactionHash,
} from "./vesting-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const createBeneficiaryVestingSchema = z.object({
  beneficiary: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  amount: z.string().regex(/^\d+$/u),
  scheduleKind: z.enum(["cex", "dev-fund", "founder", "public", "team"]),
  vestingType: z.string().regex(/^\d+$/u).optional(),
}).superRefine((body, ctx) => {
  if (body.scheduleKind === "team" && body.vestingType === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "create-beneficiary-vesting expected vestingType for team schedules",
      path: ["vestingType"],
    });
  }
});

export async function runCreateBeneficiaryVestingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof createBeneficiaryVestingSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const before = await readVestingState(tokenomics, auth, walletAddress, body.beneficiary);
  const create = await runCreate(tokenomics, auth, walletAddress, body);
  const createTxHash = await waitForWorkflowWriteReceipt(context, create.body, "createBeneficiaryVesting.create");
  const createReceipt = createTxHash ? await readWorkflowReceipt(context, createTxHash, "createBeneficiaryVesting.create") : null;
  const createEvents = createReceipt
    ? await waitForWorkflowEventQuery(
        () => tokenomics.vestingScheduleCreatedEventQuery({
          auth,
          fromBlock: BigInt(createReceipt.blockNumber),
          toBlock: BigInt(createReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, createTxHash),
        "createBeneficiaryVesting.vestingScheduleCreated",
      )
    : [];
  const after = await waitForWorkflowReadback(
    () => readVestingState(tokenomics, auth, walletAddress, body.beneficiary).then((state) => ({
      statusCode: 200,
      body: state,
    })),
    (result) => {
      const state = result.body as Awaited<ReturnType<typeof readVestingState>>;
      return state.exists.body === true && isVestingSchedulePresent(state.schedule.body);
    },
    "createBeneficiaryVesting.readback",
  );
  const afterState = after.body as Awaited<ReturnType<typeof readVestingState>>;

  return {
    create: {
      submission: create.body,
      txHash: createTxHash,
      eventCount: createEvents.length,
      scheduleKind: body.scheduleKind,
    },
    vesting: {
      before: {
        exists: before.exists.body,
        schedule: before.schedule.body,
        details: before.details.body,
        releasable: before.releasable.body,
        totals: before.totals.body,
      },
      after: {
        exists: afterState.exists.body,
        schedule: afterState.schedule.body,
        details: afterState.details.body,
        releasable: afterState.releasable.body,
        totals: afterState.totals.body,
      },
    },
    summary: {
      beneficiary: body.beneficiary,
      amount: body.amount,
      scheduleKind: body.scheduleKind,
      vestingType: body.vestingType ?? null,
    },
  };
}

async function runCreate(
  tokenomics: ReturnType<typeof createTokenomicsPrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof createBeneficiaryVestingSchema>,
) {
  const baseRequest = {
    auth,
    api: { executionSource: "auto" as const, gaslessMode: "none" as const },
    walletAddress,
  };
  switch (body.scheduleKind) {
    case "cex":
      return tokenomics.createCexVesting({ ...baseRequest, wireParams: [body.beneficiary, body.amount] });
    case "dev-fund":
      return tokenomics.createDevFundVesting({ ...baseRequest, wireParams: [body.beneficiary, body.amount] });
    case "founder":
      return tokenomics.createFounderVesting({ ...baseRequest, wireParams: [body.beneficiary, body.amount] });
    case "public":
      return tokenomics.createPublicVesting({ ...baseRequest, wireParams: [body.beneficiary, body.amount] });
    case "team":
      return tokenomics.createTeamVesting({ ...baseRequest, wireParams: [body.beneficiary, body.amount, body.vestingType!] });
  }
}
