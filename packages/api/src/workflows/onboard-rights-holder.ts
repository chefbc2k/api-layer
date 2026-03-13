import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createAccessControlPrimitiveService } from "../modules/access-control/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const onboardRightsHolderSchema = z.object({
  role: z.string().regex(/^0x[a-fA-F0-9]{64}$/u),
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  expiryTime: z.string().regex(/^\d+$/u),
  voiceHashes: z.array(z.string().regex(/^0x[a-fA-F0-9]{64}$/u)).default([]),
});

export async function runOnboardRightsHolderWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof onboardRightsHolderSchema>,
) {
  const access = createAccessControlPrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const roleGrant = await access.grantRole({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.role, body.account, body.expiryTime],
  });
  const roleGrantTxHash = await waitForWorkflowWriteReceipt(context, roleGrant.body, "onboardRightsHolder.roleGrant");
  const roleGranted = await waitForWorkflowReadback(
    async () => {
      const read = await access.hasRole({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.role, body.account],
      });
      return read.body === true ? read.body : null;
    },
    "onboardRightsHolder.hasRole",
  );

  const authorizations = [];
  for (const voiceHash of body.voiceHashes) {
    const authorization = await voiceAssets.authorizeUser({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [voiceHash, body.account],
    });
    const authorizationTxHash = await waitForWorkflowWriteReceipt(
      context,
      authorization.body,
      `onboardRightsHolder.authorization.${voiceHash}`,
    );
    const isAuthorized = await waitForWorkflowReadback(
      async () => {
        const read = await voiceAssets.isAuthorized({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [voiceHash, body.account],
        });
        return read.body === true ? read.body : null;
      },
      `onboardRightsHolder.isAuthorized.${voiceHash}`,
    );
    authorizations.push({
      voiceHash,
      authorization: authorization.body,
      txHash: authorizationTxHash,
      isAuthorized,
    });
  }

  return {
    roleGrant: {
      submission: roleGrant.body,
      txHash: roleGrantTxHash,
      hasRole: roleGranted,
    },
    authorizations,
    summary: {
      role: body.role,
      account: body.account,
      expiryTime: body.expiryTime,
      requestedVoiceCount: body.voiceHashes.length,
      authorizedVoiceCount: authorizations.length,
    },
  };
}

async function waitForWorkflowReadback<T>(
  read: () => Promise<T | null>,
  label: string,
): Promise<T> {
  let lastValue: T | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = await read();
    if (value !== null) {
      return value;
    }
    lastValue = value;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${JSON.stringify(lastValue)}`);
}
