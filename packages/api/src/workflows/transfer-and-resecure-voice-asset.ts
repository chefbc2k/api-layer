import { z } from "zod";

import { runTransferRightsWorkflow, transferRightsWorkflowSchema } from "../modules/voice-assets/index.js";
import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { registerWhisperBlockSchema, runRegisterWhisperBlockWorkflow } from "./register-whisper-block.js";
import { runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";

const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
const collaboratorSetupSchema = z.object({
  role: bytes32Schema,
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  expiryTime: z.string().regex(/^\d+$/u),
  authorizeVoice: z.boolean().default(true),
});

export const transferAndResecureVoiceAssetWorkflowSchema = z.object({
  voiceAsset: z.object({
    voiceHash: bytes32Schema,
  }),
  transfer: transferRightsWorkflowSchema,
  postTransferAccess: z.array(collaboratorSetupSchema).default([]),
  security: registerWhisperBlockSchema.omit({ voiceHash: true }).optional(),
});

export async function runTransferAndResecureVoiceAssetWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof transferAndResecureVoiceAssetWorkflowSchema>,
) {
  const transfer = await runTransferRightsWorkflow(context, auth, walletAddress, body.transfer);

  const collaborators = [];
  for (const entry of body.postTransferAccess) {
    const result = await runOnboardRightsHolderWorkflow(context, auth, walletAddress, {
      role: entry.role,
      account: entry.account,
      expiryTime: entry.expiryTime,
      voiceHashes: entry.authorizeVoice ? [body.voiceAsset.voiceHash] : [],
    });
    if (result.roleGrant.hasRole !== true) {
      throw new Error(`transfer-and-resecure-voice-asset failed role confirmation for ${entry.account}`);
    }
    if (entry.authorizeVoice && result.authorizations.some((authorization) => authorization.isAuthorized !== true)) {
      throw new Error(`transfer-and-resecure-voice-asset failed post-transfer authorization confirmation for ${entry.account}`);
    }
    if (!entry.authorizeVoice && result.authorizations.length !== 0) {
      throw new Error(`transfer-and-resecure-voice-asset expected no per-voice authorizations for ${entry.account}`);
    }
    collaborators.push({
      role: entry.role,
      account: entry.account,
      expiryTime: entry.expiryTime,
      authorizeVoice: entry.authorizeVoice,
      result,
    });
  }

  const security = body.security
    ? await runRegisterWhisperBlockWorkflow(context, auth, walletAddress, {
        voiceHash: body.voiceAsset.voiceHash,
        structuredFingerprintData: body.security.structuredFingerprintData,
        generateEncryptionKey: body.security.generateEncryptionKey,
        grant: body.security.grant,
      })
    : null;

  if (security) {
    if (security.fingerprint.authenticityVerified !== true) {
      throw new Error("transfer-and-resecure-voice-asset requires verified fingerprint registration");
    }
    if (security.summary.voiceHash !== body.voiceAsset.voiceHash) {
      throw new Error("transfer-and-resecure-voice-asset security summary voiceHash mismatch");
    }
    if (body.security?.generateEncryptionKey && !security.encryptionKey) {
      throw new Error("transfer-and-resecure-voice-asset expected encryption key step to complete");
    }
    if (body.security?.grant) {
      if (!security.accessGrant) {
        throw new Error("transfer-and-resecure-voice-asset expected whisper access grant to complete");
      }
      if (security.accessGrant.grant?.user !== body.security.grant.user) {
        throw new Error("transfer-and-resecure-voice-asset whisper grant user mismatch");
      }
    }
  }

  const voiceAuthorizationCount = collaborators.reduce(
    (count, entry) => count + entry.result.authorizations.filter((authorization) => authorization.isAuthorized === true).length,
    0,
  );

  return {
    transfer,
    postTransferAccess: {
      voiceHash: body.voiceAsset.voiceHash,
      collaborators,
      summary: {
        requestedCollaboratorCount: body.postTransferAccess.length,
        completedCollaboratorCount: collaborators.length,
        roleGrantCount: collaborators.length,
        voiceAuthorizationCount,
      },
    },
    security,
    summary: {
      voiceHash: body.voiceAsset.voiceHash,
      tokenId: body.transfer.tokenId,
      previousOwner: body.transfer.from,
      newOwner: transfer.transfer.owner,
      transferMode: transfer.transfer.mode,
      collaboratorCount: collaborators.length,
      voiceAuthorizationCount,
      securityRefreshed: Boolean(security),
      encryptionKeyGenerated: Boolean(security?.encryptionKey),
      whisperGrantUser: security?.accessGrant?.grant?.user ?? null,
    },
  };
}
