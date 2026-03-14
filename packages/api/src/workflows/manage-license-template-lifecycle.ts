import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createLicensingPrimitiveService } from "../modules/licensing/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import {
  asRecord,
  hasTransactionHash,
  readTemplateHashFromPayload,
  readWorkflowReceipt,
  templateHashToDecimal,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
  ZERO_BYTES32,
} from "./rights-licensing-helpers.js";
import { resolveWorkflowAccountAddress } from "./reward-campaign-helpers.js";

const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
const digitsSchema = z.string().regex(/^\d+$/u);
const licenseTermsSchema = z.object({
  licenseHash: bytes32Schema,
  duration: digitsSchema,
  price: digitsSchema,
  maxUses: digitsSchema,
  transferable: z.boolean(),
  rights: z.array(z.string()).min(1),
  restrictions: z.array(z.string()),
});

export const licenseTemplateInputSchema = z.object({
  isActive: z.boolean(),
  transferable: z.boolean(),
  defaultDuration: digitsSchema,
  defaultPrice: digitsSchema,
  maxUses: digitsSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  defaultRights: z.array(z.string()).min(1),
  defaultRestrictions: z.array(z.string()),
  terms: licenseTermsSchema,
});

export const manageLicenseTemplateLifecycleWorkflowSchema = z.object({
  templateHash: bytes32Schema.optional(),
  create: z.object({
    template: licenseTemplateInputSchema.optional(),
  }).optional(),
  update: z.object({
    template: licenseTemplateInputSchema,
  }).optional(),
  setActive: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (!value.templateHash && !value.create) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["templateHash"],
      message: "templateHash or create is required",
    });
  }
});

export async function runManageLicenseTemplateLifecycleWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof manageLicenseTemplateLifecycleWorkflowSchema>,
) {
  const licensing = createLicensingPrimitiveService(context);
  const creatorAddress = await resolveTemplateCreatorAddress(context, auth, walletAddress);
  let templateHash = body.templateHash ?? null;
  let source: "existing" | "created" = templateHash ? "existing" : "created";
  let create: {
    submission: unknown;
    txHash: string | null;
    eventCount: number;
  } | null = null;

  if (!templateHash) {
    const templateWrite = await licensing.createTemplate({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [hydrateTemplateForWrite(creatorAddress, body.create?.template ?? buildDefaultTemplate())],
    });
    const createTxHash = await waitForWorkflowWriteReceipt(context, templateWrite.body, "manageLicenseTemplateLifecycle.create");
    templateHash = readTemplateHashFromPayload(templateWrite.body);
    if (!templateHash) {
      throw new Error("manage-license-template-lifecycle did not receive templateHash from create-template");
    }
    const createReceipt = createTxHash
      ? await readWorkflowReceipt(context, createTxHash, "manageLicenseTemplateLifecycle.create")
      : null;
    const createEvents = createReceipt
      ? await waitForWorkflowEventQuery(
          () => licensing.voiceLicenseTemplateTemplateUpdatedEventQuery({
            auth,
            fromBlock: BigInt(createReceipt.blockNumber),
            toBlock: BigInt(createReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, createTxHash),
          "manageLicenseTemplateLifecycle.createEvent",
        )
      : [];
    create = {
      submission: templateWrite.body,
      txHash: createTxHash,
      eventCount: createEvents.length,
    };
  }

  let currentTemplate = await waitForWorkflowReadback(
    () => licensing.getTemplate({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [templateHash],
    }),
    (result) => result.statusCode === 200,
    "manageLicenseTemplateLifecycle.initialTemplate",
  );

  let update: {
    submission: unknown;
    txHash: string | null;
    eventCount: number;
    read: unknown;
  } | null = null;
  if (body.update) {
    const updateWrite = await licensing.updateTemplate({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [templateHash, hydrateTemplateForWrite(creatorAddress, body.update.template, currentTemplate.body)],
    });
    const updateTxHash = await waitForWorkflowWriteReceipt(context, updateWrite.body, "manageLicenseTemplateLifecycle.update");
    const updateReceipt = updateTxHash
      ? await readWorkflowReceipt(context, updateTxHash, "manageLicenseTemplateLifecycle.update")
      : null;
    const updateEvents = updateReceipt
      ? await waitForWorkflowEventQuery(
          () => licensing.voiceLicenseTemplateTemplateUpdatedEventQuery({
            auth,
            fromBlock: BigInt(updateReceipt.blockNumber),
            toBlock: BigInt(updateReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, updateTxHash),
          "manageLicenseTemplateLifecycle.updateEvent",
        )
      : [];
    currentTemplate = await waitForWorkflowReadback(
      () => licensing.getTemplate({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [templateHash],
      }),
      (result) => result.statusCode === 200 && templateReadMatches(result.body, body.update!.template),
      "manageLicenseTemplateLifecycle.updatedTemplate",
    );
    update = {
      submission: updateWrite.body,
      txHash: updateTxHash,
      eventCount: updateEvents.length,
      read: currentTemplate.body,
    };
  }

  let status: {
    submission: unknown;
    txHash: string | null;
    active: boolean;
    eventCount: number;
  } | null = null;
  if (body.setActive !== undefined) {
    const statusWrite = await licensing.setTemplateStatus({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [templateHash, body.setActive],
    });
    const statusTxHash = await waitForWorkflowWriteReceipt(context, statusWrite.body, "manageLicenseTemplateLifecycle.status");
    const statusReceipt = statusTxHash
      ? await readWorkflowReceipt(context, statusTxHash, "manageLicenseTemplateLifecycle.status")
      : null;
    const statusEvents = statusReceipt
      ? await waitForWorkflowEventQuery(
          () => licensing.voiceLicenseTemplateTemplateUpdatedEventQuery({
            auth,
            fromBlock: BigInt(statusReceipt.blockNumber),
            toBlock: BigInt(statusReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, statusTxHash),
          "manageLicenseTemplateLifecycle.statusEvent",
        )
      : [];
    const activeRead = await waitForWorkflowReadback(
      () => licensing.isTemplateActive({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [templateHash],
      }),
      (result) => result.statusCode === 200 && result.body === body.setActive,
      "manageLicenseTemplateLifecycle.activeRead",
    );
    currentTemplate = await waitForWorkflowReadback(
      () => licensing.getTemplate({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [templateHash],
      }),
      (result) => result.statusCode === 200 && readTemplateActive(result.body) === body.setActive,
      "manageLicenseTemplateLifecycle.statusTemplate",
    );
    status = {
      submission: statusWrite.body,
      txHash: statusTxHash,
      active: activeRead.body === true,
      eventCount: statusEvents.length,
    };
  }

  return {
    template: {
      source,
      templateHash,
      templateId: templateHashToDecimal(templateHash),
      current: currentTemplate.body,
    },
    create,
    update,
    status,
    summary: {
      templateHash,
      templateId: templateHashToDecimal(templateHash),
      source,
      created: Boolean(create),
      updated: Boolean(update),
      statusChanged: body.setActive !== undefined,
      active: readTemplateActive(currentTemplate.body),
    },
  };
}

function buildDefaultTemplate(): z.infer<typeof licenseTemplateInputSchema> {
  const duration = String(45n * 24n * 60n * 60n);
  const price = "15000";
  const maxUses = "12";
  return {
    isActive: true,
    transferable: true,
    defaultDuration: duration,
    defaultPrice: price,
    maxUses,
    name: `Lifecycle Template ${Date.now()}`,
    description: "Auto-created for licensing lifecycle workflow",
    defaultRights: ["Narration", "Ads"],
    defaultRestrictions: ["no-sublicense"],
    terms: {
      licenseHash: ZERO_BYTES32,
      duration,
      price,
      maxUses,
      transferable: true,
      rights: ["Narration", "Ads"],
      restrictions: ["no-sublicense"],
    },
  };
}

function hydrateTemplateForWrite(
  creatorAddress: string,
  template: z.infer<typeof licenseTemplateInputSchema>,
  currentTemplate?: unknown,
) {
  const current = asRecord(currentTemplate);
  const now = Math.floor(Date.now() / 1000).toString();
  return {
    creator: typeof current?.creator === "string" ? current.creator : creatorAddress,
    isActive: template.isActive,
    transferable: template.transferable,
    createdAt: String(current?.createdAt ?? now),
    updatedAt: now,
    defaultDuration: template.defaultDuration,
    defaultPrice: template.defaultPrice,
    maxUses: template.maxUses,
    name: template.name,
    description: template.description,
    defaultRights: template.defaultRights,
    defaultRestrictions: template.defaultRestrictions,
    terms: template.terms,
  };
}

async function resolveTemplateCreatorAddress(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
) {
  if (walletAddress && /^0x[a-fA-F0-9]{40}$/u.test(walletAddress)) {
    return walletAddress;
  }
  try {
    const resolved = await resolveWorkflowAccountAddress(context, auth, walletAddress, "manageLicenseTemplateLifecycle.creator");
    if (/^0x[a-fA-F0-9]{40}$/u.test(resolved)) {
      return resolved;
    }
  } catch {}
  return "0x0000000000000000000000000000000000000000";
}

function readTemplateActive(value: unknown): boolean {
  return asRecord(value)?.isActive === true;
}

function templateReadMatches(value: unknown, expected: z.infer<typeof licenseTemplateInputSchema>): boolean {
  const record = asRecord(value);
  const terms = asRecord(record?.terms);
  if (!record || !terms) {
    return false;
  }
  return (
    record.name === expected.name
    && record.description === expected.description
    && record.transferable === expected.transferable
    && String(record.defaultDuration ?? "") === expected.defaultDuration
    && String(record.defaultPrice ?? "") === expected.defaultPrice
    && String(record.maxUses ?? "") === expected.maxUses
    && record.isActive === expected.isActive
    && JSON.stringify(record.defaultRights ?? []) === JSON.stringify(expected.defaultRights)
    && JSON.stringify(record.defaultRestrictions ?? []) === JSON.stringify(expected.defaultRestrictions)
    && String(terms.duration ?? "") === expected.terms.duration
    && String(terms.price ?? "") === expected.terms.price
    && String(terms.maxUses ?? "") === expected.terms.maxUses
    && terms.transferable === expected.terms.transferable
    && JSON.stringify(terms.rights ?? []) === JSON.stringify(expected.terms.rights)
    && JSON.stringify(terms.restrictions ?? []) === JSON.stringify(expected.terms.restrictions)
  );
}
