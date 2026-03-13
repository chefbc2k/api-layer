import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { runRegisterVoiceAssetWorkflow } from "../modules/voice-assets/index.js";
import { runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";
import { runRegisterWhisperBlockWorkflow } from "./register-whisper-block.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);

export const onboardVoiceAssetWorkflowSchema = z.object({
  asset: z.object({
    ipfsHash: z.string(),
    royaltyRate: z.string().regex(/^\d+$/u),
    owner: addressSchema.optional(),
    features: z.record(z.string(), z.unknown()).optional(),
  }),
  accessSetup: z.object({
    role: bytes32Schema,
    expiryTime: z.string().regex(/^\d+$/u),
    grantees: z.array(addressSchema).min(1),
  }).optional(),
  security: z.object({
    structuredFingerprintData: z.string().regex(/^0x[0-9a-fA-F]*$/u),
    generateEncryptionKey: z.boolean().default(false),
    grant: z.object({
      user: addressSchema,
      duration: z.string().regex(/^\d+$/u),
    }).optional(),
  }),
});

export async function runOnboardVoiceAssetWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof onboardVoiceAssetWorkflowSchema>,
) {
  const asset = await runRegisterVoiceAssetWorkflow(context, auth, walletAddress, body.asset);
  const voiceHash = typeof asset.voiceHash === "string" ? asset.voiceHash : null;
  if (!voiceHash) {
    throw new Error("onboard-voice-asset requires register-voice-asset to return voiceHash");
  }
  if (!asset.registration?.voiceAsset) {
    throw new Error("onboard-voice-asset requires confirmed asset registration readback");
  }

  let accessSetup: {
    role: string;
    expiryTime: string;
    grantees: Array<{
      account: string;
      result: Awaited<ReturnType<typeof runOnboardRightsHolderWorkflow>>;
    }>;
    summary: {
      requestedGranteeCount: number;
      completedGranteeCount: number;
    };
  } | null = null;

  if (body.accessSetup) {
    const grantees = [];
    for (const account of body.accessSetup.grantees) {
      const result = await runOnboardRightsHolderWorkflow(context, auth, walletAddress, {
        role: body.accessSetup.role,
        account,
        expiryTime: body.accessSetup.expiryTime,
        voiceHashes: [voiceHash],
      });
      if (result.roleGrant.hasRole !== true) {
        throw new Error(`onboard-voice-asset access setup failed role confirmation for ${account}`);
      }
      if (result.authorizations.some((entry) => entry.isAuthorized !== true)) {
        throw new Error(`onboard-voice-asset access setup failed authorization confirmation for ${account}`);
      }
      grantees.push({ account, result });
    }
    accessSetup = {
      role: body.accessSetup.role,
      expiryTime: body.accessSetup.expiryTime,
      grantees,
      summary: {
        requestedGranteeCount: body.accessSetup.grantees.length,
        completedGranteeCount: grantees.length,
      },
    };
  }

  const security = await runRegisterWhisperBlockWorkflow(context, auth, walletAddress, {
    voiceHash,
    structuredFingerprintData: body.security.structuredFingerprintData,
    generateEncryptionKey: body.security.generateEncryptionKey,
    grant: body.security.grant,
  });

  if (security.fingerprint.authenticityVerified !== true) {
    throw new Error("onboard-voice-asset requires verified fingerprint registration");
  }
  if (security.summary.voiceHash !== voiceHash) {
    throw new Error("onboard-voice-asset security summary voiceHash mismatch");
  }
  if (body.security.generateEncryptionKey && !security.encryptionKey) {
    throw new Error("onboard-voice-asset expected encryption key step to complete");
  }
  if (body.security.grant) {
    if (!security.accessGrant) {
      throw new Error("onboard-voice-asset expected whisper access grant to complete");
    }
    if (security.accessGrant.grant?.user !== body.security.grant.user) {
      throw new Error("onboard-voice-asset whisper grant user mismatch");
    }
  }

  return {
    asset,
    accessSetup,
    security,
    summary: {
      voiceHash,
      assetOwner: body.asset.owner ?? null,
      grantedAccessActorCount: accessSetup?.grantees.length ?? 0,
      encryptionKeyGenerated: Boolean(security.encryptionKey),
      whisperGrantUser: security.accessGrant?.grant?.user ?? null,
    },
  };
}
