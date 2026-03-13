import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import { readVestingState } from "./vesting-helpers.js";

export const inspectBeneficiaryVestingSchema = z.object({
  beneficiary: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
});

export async function runInspectBeneficiaryVestingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof inspectBeneficiaryVestingSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const state = await readVestingState(tokenomics, auth, walletAddress, body.beneficiary);
  return {
    vesting: {
      exists: state.exists.body,
      schedule: state.schedule.body,
      details: state.details.body,
      releasable: state.releasable.body,
      totals: state.totals.body,
    },
    summary: {
      beneficiary: body.beneficiary,
      hasSchedule: state.exists.body === true,
    },
  };
}
