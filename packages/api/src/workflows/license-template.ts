import { toBeHex } from "ethers";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createLicensingPrimitiveService } from "../modules/licensing/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

export type ResolvedLicenseTemplate = {
  templateHash: string;
  templateId: string;
  created: boolean;
  source: "requested" | "existing-active" | "created";
  template: unknown;
};

export async function resolveDatasetLicenseTemplate(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  creatorAddress: string,
  requestedTemplateId?: string,
): Promise<ResolvedLicenseTemplate> {
  const licensing = createLicensingPrimitiveService(context);
  if (requestedTemplateId) {
    const templateHash = decimalTemplateIdToHash(requestedTemplateId);
    const template = await waitForTemplateReadback(
      licensing,
      auth,
      walletAddress,
      templateHash,
      "licenseTemplate.requested",
    );
    return {
      templateHash,
      templateId: requestedTemplateId,
      created: false,
      source: "requested",
      template: template.body,
    };
  }

  const activeTemplate = await findActiveTemplate(licensing, auth, walletAddress, creatorAddress);
  if (activeTemplate) {
    return {
      templateHash: activeTemplate.templateHash,
      templateId: templateHashToDecimal(activeTemplate.templateHash),
      created: false,
      source: "existing-active",
      template: activeTemplate.template.body,
    };
  }

  const createTemplate = await licensing.createTemplate({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [buildDefaultTemplate()],
  });
  await waitForWorkflowWriteReceipt(context, createTemplate.body, "licenseTemplate.create");

  const templateHash = readTemplateHash(createTemplate.body);
  if (!templateHash) {
    throw new Error("license template creation did not return a template hash");
  }
  const template = await waitForTemplateReadback(
    licensing,
    auth,
    walletAddress,
    templateHash,
    "licenseTemplate.created",
  );

  return {
    templateHash,
    templateId: templateHashToDecimal(templateHash),
    created: true,
    source: "created",
    template: template.body,
  };
}

async function findActiveTemplate(
  licensing: ReturnType<typeof createLicensingPrimitiveService>,
  auth: AuthContext,
  walletAddress: string | undefined,
  creatorAddress: string,
): Promise<{ templateHash: string; template: { statusCode: number; body: unknown } } | null> {
  const creatorTemplates = await licensing.getCreatorTemplates({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [creatorAddress],
  });
  const hashes = Array.isArray(creatorTemplates.body)
    ? creatorTemplates.body.map((entry) => String(entry)).reverse()
    : [];

  for (const templateHash of hashes) {
    const template = await licensing.getTemplate({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [templateHash],
    });
    if ((template.body as Record<string, unknown> | null)?.isActive === true) {
      return { templateHash, template };
    }
  }

  return null;
}

async function waitForTemplateReadback(
  licensing: ReturnType<typeof createLicensingPrimitiveService>,
  auth: AuthContext,
  walletAddress: string | undefined,
  templateHash: string,
  label: string,
) {
  let lastRead: { statusCode: number; body: unknown } | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    lastRead = await licensing.getTemplate({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [templateHash],
    });
    if (lastRead.statusCode === 200) {
      return lastRead;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} template readback timeout: ${JSON.stringify(lastRead?.body ?? null)}`);
}

function buildDefaultTemplate() {
  const duration = String(45n * 24n * 60n * 60n);
  const price = "15000";
  const maxUses = "12";
  return {
    isActive: true,
    transferable: true,
    defaultDuration: duration,
    defaultPrice: price,
    maxUses,
    name: `Auto Dataset Template ${Date.now()}`,
    description: "Auto-created for dataset workflow verification",
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

function readTemplateHash(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = (payload as Record<string, unknown>).result;
  return typeof value === "string" && value.startsWith("0x") ? value : null;
}

function decimalTemplateIdToHash(templateId: string): string {
  return toBeHex(BigInt(templateId), 32);
}

function templateHashToDecimal(templateHash: string): string {
  return BigInt(templateHash).toString();
}
