import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import type { RouteResult } from "../shared/route-types.js";
import { createWhisperblockPrimitiveService } from "../modules/whisperblock/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

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
  const fingerprintTxHash = await waitForWorkflowWriteReceipt(context, fingerprint.body, "registerWhisperBlock.fingerprint");
  const fingerprintReceipt = fingerprintTxHash ? await readWorkflowReceipt(context, fingerprintTxHash, "registerWhisperBlock.fingerprint") : null;
  const fingerprintVerified = await waitForWorkflowReadback(
    () => whisperblock.verifyVoiceAuthenticity({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.voiceHash, body.structuredFingerprintData],
    }),
    (result) => result.statusCode === 200 && result.body === true,
    "registerWhisperBlock.verifyVoiceAuthenticity",
  );
  const fingerprintEvents = fingerprintReceipt
    ? await waitForWorkflowEventQuery(
        () => whisperblock.voiceFingerprintUpdatedEventQuery({
          auth,
          fromBlock: BigInt(fingerprintReceipt.blockNumber),
          toBlock: BigInt(fingerprintReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, fingerprintTxHash),
        "registerWhisperBlock.voiceFingerprintUpdated",
      )
    : null;

  const key = body.generateEncryptionKey
    ? await whisperblock.generateAndSetEncryptionKey({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceHash],
      })
    : null;
  let keyTxHash: string | null = null;
  let keyEvents: unknown[] | null = null;
  if (key) {
    keyTxHash = await waitForWorkflowWriteReceipt(context, key.body, "registerWhisperBlock.encryptionKey");
    const keyReceipt = keyTxHash ? await readWorkflowReceipt(context, keyTxHash, "registerWhisperBlock.encryptionKey") : null;
    keyEvents = keyReceipt
      ? await waitForWorkflowEventQuery(
          () => whisperblock.keyRotatedEventQuery({
            auth,
            fromBlock: BigInt(keyReceipt.blockNumber),
            toBlock: BigInt(keyReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, keyTxHash),
          "registerWhisperBlock.keyRotated",
        )
      : null;
  }
  const access = body.grant
    ? await whisperblock.grantAccess({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceHash, body.grant.user, body.grant.duration],
      })
    : null;
  let accessTxHash: string | null = null;
  let accessEvents: unknown[] | null = null;
  if (access) {
    accessTxHash = await waitForWorkflowWriteReceipt(context, access.body, "registerWhisperBlock.accessGrant");
    const accessReceipt = accessTxHash ? await readWorkflowReceipt(context, accessTxHash, "registerWhisperBlock.accessGrant") : null;
    accessEvents = accessReceipt
      ? await waitForWorkflowEventQuery(
          () => whisperblock.accessGrantedEventQuery({
            auth,
            fromBlock: BigInt(accessReceipt.blockNumber),
            toBlock: BigInt(accessReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, accessTxHash),
          "registerWhisperBlock.accessGranted",
        )
      : null;
  }
  return {
    fingerprint: {
      submission: fingerprint.body,
      txHash: fingerprintTxHash,
      authenticityVerified: fingerprintVerified.body,
      eventCount: fingerprintEvents?.length ?? 0,
    },
    encryptionKey: key
      ? {
          submission: key.body,
          txHash: keyTxHash,
          eventCount: keyEvents?.length ?? 0,
        }
      : null,
    accessGrant: access
      ? {
          submission: access.body,
          txHash: accessTxHash,
          eventCount: accessEvents?.length ?? 0,
          grant: body.grant,
        }
      : null,
    summary: {
      voiceHash: body.voiceHash,
      generateEncryptionKey: body.generateEncryptionKey,
      grantedUser: body.grant?.user ?? null,
      grantedDuration: body.grant?.duration ?? null,
    },
  };
}

async function readWorkflowReceipt(
  context: ApiExecutionContext,
  txHash: string,
  label: string,
) {
  const receipt = await context.providerRouter.withProvider(
    "read",
    `workflow.${label}.receipt`,
    (provider) => provider.getTransactionReceipt(txHash),
  );
  if (!receipt) {
    throw new Error(`${label} receipt missing after confirmation: ${txHash}`);
  }
  return receipt;
}

async function waitForWorkflowReadback(
  read: () => Promise<RouteResult>,
  ready: (result: RouteResult) => boolean,
  label: string,
) {
  let lastResult: RouteResult | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await read();
    lastResult = result;
    if (ready(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${JSON.stringify(lastResult?.body ?? null)}`);
}

async function waitForWorkflowEventQuery(
  read: () => Promise<unknown[]>,
  ready: (logs: unknown[]) => boolean,
  label: string,
) {
  let lastLogs: unknown[] = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const logs = await read();
    lastLogs = logs;
    if (ready(logs)) {
      return logs;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} event query timeout: ${JSON.stringify(lastLogs)}`);
}

function hasTransactionHash(logs: unknown[], txHash: string | null): boolean {
  if (!txHash) {
    return false;
  }
  return logs.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return (entry as Record<string, unknown>).transactionHash === txHash;
  });
}
