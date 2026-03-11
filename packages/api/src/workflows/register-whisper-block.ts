import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createWhisperblockPrimitiveService } from "../modules/whisperblock/primitives/generated/index.js";

export const registerWhisperBlockSchema = z.object({
  voiceHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/u),
  structuredFingerprintData: z.string().regex(/^0x[0-9a-fA-F]*$/u),
  grant: z.object({
    user: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
    duration: z.string().regex(/^\d+$/u),
  }).optional(),
  generateEncryptionKey: z.boolean().default(true),
});

export async function runRegisterWhisperBlockWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof registerWhisperBlockSchema>,
) {
  const whisperblock = createWhisperblockPrimitiveService(context);
  const fingerprint = await whisperblock.registerVoiceFingerprint({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.voiceHash, body.structuredFingerprintData],
  });
  const key = body.generateEncryptionKey
    ? await whisperblock.generateAndSetEncryptionKey({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceHash],
      })
    : null;
  const access = body.grant
    ? await whisperblock.grantAccess({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceHash, body.grant.user, body.grant.duration],
      })
    : null;
  return {
    fingerprint: fingerprint.body,
    encryptionKey: key?.body ?? null,
    accessGrant: access?.body ?? null,
  };
}
