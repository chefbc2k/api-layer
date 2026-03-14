import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createLicensingPrimitiveService } from "../modules/licensing/primitives/generated/index.js";
import { runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";
import { manageLicenseTemplateLifecycleWorkflowSchema, runManageLicenseTemplateLifecycleWorkflow, licenseTemplateInputSchema } from "./manage-license-template-lifecycle.js";
import {
  asRecord,
  collaboratorReadMatches,
  hasTransactionHash,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
  ZERO_BYTES32,
} from "./rights-licensing-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
const digitsSchema = z.string().regex(/^\d+$/u);

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

const collaboratorEntrySchema = z.object({
  account: addressSchema,
  rightsHolder: z.object({
    role: bytes32Schema,
    expiryTime: digitsSchema,
    authorizeVoice: z.boolean().default(true),
  }).optional(),
  collaboratorShare: z.object({
    mode: z.enum(["add", "update"]).default("add"),
    share: digitsSchema,
  }).optional(),
}).superRefine((value, ctx) => {
  if (!value.rightsHolder && !value.collaboratorShare) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["account"],
      message: "each collaborator entry must include rightsHolder and/or collaboratorShare",
    });
  }
});

const directLicenseTermsSchema = licenseTemplateInputSchema.shape.terms;

const issueSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("direct"),
    licensee: addressSchema,
    terms: directLicenseTermsSchema,
  }),
  z.object({
    mode: z.literal("template"),
    licensee: addressSchema,
    templateHash: bytes32Schema.optional(),
    duration: digitsSchema,
  }),
]);

export const collaboratorLicenseLifecycleWorkflowSchema = z.object({
  voiceAsset: z.object({
    voiceHash: bytes32Schema,
  }),
  collaborators: z.array(collaboratorEntrySchema).default([]),
  templateLifecycle: manageLicenseTemplateLifecycleWorkflowSchema.optional(),
  issue: issueSchema,
  licenseeActor: actorOverrideSchema.optional(),
  usage: z.object({
    usageRef: bytes32Schema,
  }).optional(),
  transfer: z.object({
    to: addressSchema,
  }).optional(),
  revoke: z.object({
    reason: z.string().min(1),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.issue.mode === "template" && !value.issue.templateHash && !value.templateLifecycle) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["issue", "templateHash"],
      message: "template issue mode requires templateHash or templateLifecycle",
    });
  }
});

export async function runCollaboratorLicenseLifecycleWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof collaboratorLicenseLifecycleWorkflowSchema>,
) {
  const licensing = createLicensingPrimitiveService(context);
  const licenseeAuth = body.licenseeActor ? resolveChildAuthContext(context, body.licenseeActor.apiKey) : auth;
  const licenseeWalletAddress = body.licenseeActor?.walletAddress ?? walletAddress;

  const collaborators = [];
  let roleGrantCount = 0;
  let voiceAuthorizationCount = 0;
  let collaboratorShareCount = 0;

  for (const entry of body.collaborators) {
    let rightsHolder: Awaited<ReturnType<typeof runOnboardRightsHolderWorkflow>> | null = null;
    if (entry.rightsHolder) {
      rightsHolder = await runOnboardRightsHolderWorkflow(context, auth, walletAddress, {
        role: entry.rightsHolder.role,
        account: entry.account,
        expiryTime: entry.rightsHolder.expiryTime,
        voiceHashes: entry.rightsHolder.authorizeVoice ? [body.voiceAsset.voiceHash] : [],
      });
      if (rightsHolder.roleGrant.hasRole !== true) {
        throw new Error(`collaborator-license-lifecycle failed role confirmation for ${entry.account}`);
      }
      if (entry.rightsHolder.authorizeVoice && rightsHolder.authorizations.some((authorization) => authorization.isAuthorized !== true)) {
        throw new Error(`collaborator-license-lifecycle failed per-voice authorization confirmation for ${entry.account}`);
      }
      roleGrantCount += 1;
      voiceAuthorizationCount += rightsHolder.authorizations.filter((authorization) => authorization.isAuthorized === true).length;
    }

    let collaboratorShare: {
      mode: "add" | "update";
      share: string;
      submission: unknown;
      txHash: string | null;
      read: unknown;
      eventCount: number;
    } | null = null;
    if (entry.collaboratorShare) {
      const write = entry.collaboratorShare.mode === "add"
        ? await licensing.addCollaborator({
            auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress,
            wireParams: [body.voiceAsset.voiceHash, entry.account, entry.collaboratorShare.share],
          })
        : await licensing.updateCollaboratorShare({
            auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress,
            wireParams: [body.voiceAsset.voiceHash, entry.account, entry.collaboratorShare.share],
          });
      const collaboratorTxHash = await waitForWorkflowWriteReceipt(
        context,
        write.body,
        `collaboratorLicenseLifecycle.collaborator.${entry.collaboratorShare.mode}.${entry.account}`,
      );
      const collaboratorReceipt = collaboratorTxHash
        ? await readWorkflowReceipt(context, collaboratorTxHash, `collaboratorLicenseLifecycle.collaborator.${entry.account}`)
        : null;
      const collaboratorEvents = collaboratorReceipt
        ? await waitForWorkflowEventQuery(
            () => licensing.collaboratorUpdatedEventQuery({
              auth,
              fromBlock: BigInt(collaboratorReceipt.blockNumber),
              toBlock: BigInt(collaboratorReceipt.blockNumber),
            }),
            (logs) => hasTransactionHash(logs, collaboratorTxHash),
            `collaboratorLicenseLifecycle.collaboratorEvent.${entry.account}`,
          )
        : [];
      const collaboratorRead = await waitForWorkflowReadback(
        () => licensing.getCollaborator({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [body.voiceAsset.voiceHash, entry.account],
        }),
        (result) => result.statusCode === 200 && collaboratorReadMatches(result.body, true, entry.collaboratorShare!.share),
        `collaboratorLicenseLifecycle.collaboratorRead.${entry.account}`,
      );
      collaboratorShare = {
        mode: entry.collaboratorShare.mode,
        share: entry.collaboratorShare.share,
        submission: write.body,
        txHash: collaboratorTxHash,
        read: collaboratorRead.body,
        eventCount: collaboratorEvents.length,
      };
      collaboratorShareCount += 1;
    }

    collaborators.push({
      account: entry.account,
      rightsHolder,
      collaboratorShare,
    });
  }

  const templateLifecycle = body.templateLifecycle
    ? await runManageLicenseTemplateLifecycleWorkflow(context, auth, walletAddress, body.templateLifecycle)
    : null;
  const templateHashUsed = body.issue.mode === "direct"
    ? ZERO_BYTES32
    : body.issue.templateHash ?? templateLifecycle?.summary.templateHash ?? null;
  if (body.issue.mode === "template" && !templateHashUsed) {
    throw new Error("collaborator-license-lifecycle requires templateHash for template issue mode");
  }

  const issuanceWrite = body.issue.mode === "direct"
    ? await licensing.createLicense({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.issue.licensee, body.voiceAsset.voiceHash, body.issue.terms],
      })
    : await licensing.issueLicense({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceAsset.voiceHash, body.issue.licensee, templateHashUsed, body.issue.duration],
      });
  const issuanceTxHash = await waitForWorkflowWriteReceipt(context, issuanceWrite.body, "collaboratorLicenseLifecycle.issue");
  const issuanceReceipt = issuanceTxHash
    ? await readWorkflowReceipt(context, issuanceTxHash, "collaboratorLicenseLifecycle.issue")
    : null;
  const issuanceEvents = issuanceReceipt
    ? await waitForWorkflowEventQuery(
        () => queryLicenseCreatedEvents(licensing, auth, issuanceReceipt.blockNumber),
        (logs) => hasTransactionHash(logs, issuanceTxHash),
        "collaboratorLicenseLifecycle.issueEvent",
      )
    : [];
  const issuedLicense = await waitForWorkflowReadback(
    () => licensing.getLicense({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.voiceAsset.voiceHash, body.issue.licensee],
    }),
    (result) => result.statusCode === 200,
    "collaboratorLicenseLifecycle.issuedLicense",
  );
  const validation = await waitForWorkflowReadback(
    () => licensing.validateLicense({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.voiceAsset.voiceHash, body.issue.licensee, templateHashUsed],
    }),
    (result) => result.statusCode === 200,
    "collaboratorLicenseLifecycle.validation",
  );

  const licenseTerms = body.licenseeActor
    ? await waitForWorkflowReadback(
        () => licensing.getLicenseTerms({
          auth: licenseeAuth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress: licenseeWalletAddress,
          wireParams: [body.voiceAsset.voiceHash],
        }),
        (result) => result.statusCode === 200,
        "collaboratorLicenseLifecycle.licenseTerms",
      )
    : null;

  let currentLicensee = body.issue.licensee;

  let usage: {
    submission: unknown;
    txHash: string | null;
    usageRef: string;
    usageCount: unknown;
    eventCount: number;
  } | null = null;
  if (body.usage) {
    const usageWrite = await licensing.recordLicensedUsage({
      auth: licenseeAuth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: licenseeWalletAddress,
      wireParams: [body.voiceAsset.voiceHash, body.usage.usageRef],
    });
    const usageTxHash = await waitForWorkflowWriteReceipt(context, usageWrite.body, "collaboratorLicenseLifecycle.usage");
    const usageReceipt = usageTxHash
      ? await readWorkflowReceipt(context, usageTxHash, "collaboratorLicenseLifecycle.usage")
      : null;
    const usageEvents = usageReceipt
      ? await waitForWorkflowEventQuery(
          () => licensing.licenseUsedEventQuery({
            auth,
            fromBlock: BigInt(usageReceipt.blockNumber),
            toBlock: BigInt(usageReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, usageTxHash),
          "collaboratorLicenseLifecycle.usageEvent",
        )
      : [];
    await waitForWorkflowReadback(
      () => licensing.isUsageRefUsed({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceAsset.voiceHash, body.usage!.usageRef],
      }),
      (result) => result.statusCode === 200 && result.body === true,
      "collaboratorLicenseLifecycle.usageRead",
    );
    const usageCount = await waitForWorkflowReadback(
      () => licensing.getUsageCount({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceAsset.voiceHash, currentLicensee],
      }),
      (result) => result.statusCode === 200,
      "collaboratorLicenseLifecycle.usageCount",
    );
    usage = {
      submission: usageWrite.body,
      txHash: usageTxHash,
      usageRef: body.usage.usageRef,
      usageCount: usageCount.body,
      eventCount: usageEvents.length,
    };
  }

  let transfer: {
    submission: unknown;
    txHash: string | null;
    to: string;
    read: unknown;
    eventCount: number;
  } | null = null;
  if (body.transfer) {
    const transferWrite = await licensing.transferLicense({
      auth: licenseeAuth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: licenseeWalletAddress,
      wireParams: [body.voiceAsset.voiceHash, templateHashUsed, body.transfer.to],
    });
    const transferTxHash = await waitForWorkflowWriteReceipt(context, transferWrite.body, "collaboratorLicenseLifecycle.transfer");
    const transferReceipt = transferTxHash
      ? await readWorkflowReceipt(context, transferTxHash, "collaboratorLicenseLifecycle.transfer")
      : null;
    const transferEvents = transferReceipt
      ? await waitForWorkflowEventQuery(
          () => licensing.licenseTransferredEventQuery({
            auth,
            fromBlock: BigInt(transferReceipt.blockNumber),
            toBlock: BigInt(transferReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, transferTxHash),
          "collaboratorLicenseLifecycle.transferEvent",
        )
      : [];
    const transferredLicense = await waitForWorkflowReadback(
      () => licensing.getLicense({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceAsset.voiceHash, body.transfer!.to],
      }),
      (result) => result.statusCode === 200,
      "collaboratorLicenseLifecycle.transferredLicense",
    );
    transfer = {
      submission: transferWrite.body,
      txHash: transferTxHash,
      to: body.transfer.to,
      read: transferredLicense.body,
      eventCount: transferEvents.length,
    };
    currentLicensee = body.transfer.to;
  }

  let revoke: {
    submission: unknown;
    txHash: string | null;
    reason: string;
    eventCount: number;
  } | null = null;
  if (body.revoke) {
    const revokeWrite = await licensing.revokeLicense({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.voiceAsset.voiceHash, templateHashUsed, currentLicensee, body.revoke.reason],
    });
    const revokeTxHash = await waitForWorkflowWriteReceipt(context, revokeWrite.body, "collaboratorLicenseLifecycle.revoke");
    const revokeReceipt = revokeTxHash
      ? await readWorkflowReceipt(context, revokeTxHash, "collaboratorLicenseLifecycle.revoke")
      : null;
    const revokeEvents = revokeReceipt
      ? await waitForWorkflowEventQuery(
          () => licensing.licenseRevokedEventQuery({
            auth,
            fromBlock: BigInt(revokeReceipt.blockNumber),
            toBlock: BigInt(revokeReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, revokeTxHash),
          "collaboratorLicenseLifecycle.revokeEvent",
        )
      : [];
    await waitForWorkflowReadback(
      () => licensing.getLicense({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceAsset.voiceHash, currentLicensee],
      }),
      (result) => result.statusCode !== 200,
      "collaboratorLicenseLifecycle.revokedLicense",
    );
    revoke = {
      submission: revokeWrite.body,
      txHash: revokeTxHash,
      reason: body.revoke.reason,
      eventCount: revokeEvents.length,
    };
  }

  return {
    collaboratorSetup: {
      voiceHash: body.voiceAsset.voiceHash,
      collaborators,
      summary: {
        requestedCollaboratorCount: body.collaborators.length,
        completedCollaboratorCount: collaborators.length,
        roleGrantCount,
        voiceAuthorizationCount,
        collaboratorShareCount,
      },
    },
    templateLifecycle,
    license: {
      issuance: {
        mode: body.issue.mode,
        templateHashUsed,
        submission: issuanceWrite.body,
        txHash: issuanceTxHash,
        read: issuedLicense.body,
        validation: validation.body,
        licenseTerms: licenseTerms?.body ?? null,
        eventCount: issuanceEvents.length,
      },
      usage,
      transfer,
      revoke,
    },
    summary: {
      voiceHash: body.voiceAsset.voiceHash,
      licensee: body.issue.licensee,
      currentLicensee,
      templateHashUsed,
      issueMode: body.issue.mode,
      collaboratorCount: collaborators.length,
      roleGrantCount,
      voiceAuthorizationCount,
      collaboratorShareCount,
      validationPerformed: true,
      usageRecorded: Boolean(usage),
      transferredTo: transfer?.to ?? null,
      revoked: Boolean(revoke),
    },
  };
}

function resolveChildAuthContext(
  context: ApiExecutionContext,
  apiKey: string,
): AuthContext {
  const childAuth = context.apiKeys[apiKey];
  if (!childAuth) {
    throw new HttpError(400, "collaborator-license-lifecycle received unknown licensee apiKey");
  }
  return childAuth;
}

async function queryLicenseCreatedEvents(
  licensing: ReturnType<typeof createLicensingPrimitiveService>,
  auth: AuthContext,
  blockNumber: bigint | number,
) {
  const fromBlock = BigInt(blockNumber);
  const reads = await Promise.all([
    licensing.licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery({
      auth,
      fromBlock,
      toBlock: fromBlock,
    }),
    licensing.licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery({
      auth,
      fromBlock,
      toBlock: fromBlock,
    }),
    licensing.licenseCreatedEventQuery({
      auth,
      fromBlock,
      toBlock: fromBlock,
    }),
  ]);
  return reads.flatMap((entry) => {
    if (Array.isArray(entry)) {
      return entry;
    }
    const record = asRecord(entry);
    return Array.isArray(record?.body) ? record.body : [];
  });
}
