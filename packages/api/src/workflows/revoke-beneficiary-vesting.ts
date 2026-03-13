import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  isVestingScheduleRevoked,
  readVestingState,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
  hasTransactionHash,
} from "./vesting-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const revokeBeneficiaryVestingSchema = z.object({
  beneficiary: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
});

export async function runRevokeBeneficiaryVestingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof revokeBeneficiaryVestingSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const before = await readVestingState(tokenomics, auth, walletAddress, body.beneficiary);
  const revoke = await tokenomics.revokeVestingSchedule({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.beneficiary],
  });
  const revokeTxHash = await waitForWorkflowWriteReceipt(context, revoke.body, "revokeBeneficiaryVesting.revoke");
  const revokeReceipt = revokeTxHash ? await readWorkflowReceipt(context, revokeTxHash, "revokeBeneficiaryVesting.revoke") : null;
  const revokeEvents = revokeReceipt
    ? await waitForWorkflowEventQuery(
        () => tokenomics.vestingScheduleRevokedEventQuery({
          auth,
          fromBlock: BigInt(revokeReceipt.blockNumber),
          toBlock: BigInt(revokeReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, revokeTxHash),
        "revokeBeneficiaryVesting.vestingScheduleRevoked",
      )
    : [];
  const after = await waitForWorkflowReadback(
    () => readVestingState(tokenomics, auth, walletAddress, body.beneficiary).then((state) => ({
      statusCode: 200,
      body: state,
    })),
    (result) => isVestingScheduleRevoked((result.body as Awaited<ReturnType<typeof readVestingState>>).schedule.body),
    "revokeBeneficiaryVesting.readback",
  );
  const afterState = after.body as Awaited<ReturnType<typeof readVestingState>>;

  return {
    revoke: {
      submission: revoke.body,
      txHash: revokeTxHash,
      eventCount: revokeEvents.length,
    },
    vesting: {
      before: {
        exists: before.exists.body,
        schedule: before.schedule.body,
        details: before.details.body,
      },
      after: {
        exists: afterState.exists.body,
        schedule: afterState.schedule.body,
        details: afterState.details.body,
      },
    },
    summary: {
      beneficiary: body.beneficiary,
      revokedAfter: isVestingScheduleRevoked(afterState.schedule.body),
    },
  };
}
