import { Wallet } from "ethers";
import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import type { RouteResult } from "../shared/route-types.js";
import { HttpError } from "../shared/errors.js";
import { createDatasetsPrimitiveService } from "../modules/datasets/primitives/generated/index.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import { resolveDatasetLicenseTemplate } from "./license-template.js";
import { normalizeAddress } from "./reward-campaign-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const createDatasetAndListForSaleSchema = z.object({
  title: z.string(),
  assetIds: z.array(z.string().regex(/^\d+$/u)),
  licenseTemplateId: z.string().regex(/^\d+$/u).optional(),
  metadataURI: z.string(),
  royaltyBps: z.string().regex(/^\d+$/u),
  price: z.string().regex(/^\d+$/u),
  duration: z.string().regex(/^\d+$/u),
});

export async function runCreateDatasetAndListForSaleWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof createDatasetAndListForSaleSchema>,
) {
  const datasets = createDatasetsPrimitiveService(context);
  const marketplace = createMarketplacePrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const signerAddress = walletAddress
    ? walletAddress
    : await context.providerRouter.withProvider(
        "read",
        "workflow.createDatasetAndListForSale.signer",
        async (provider) => {
          const privateKey = requestSignerPrivateKey(auth);
          if (!privateKey) {
            throw new Error("create-dataset-and-list-for-sale requires signer-backed auth");
          }
          return new Wallet(privateKey, provider).getAddress();
        },
      );
  const normalizedSigner = normalizeAddress(signerAddress) ?? signerAddress.toLowerCase();

  const ownershipReads = await Promise.all(body.assetIds.map(async (assetId) => {
    const ownerRead = await waitForWorkflowReadback(
      () => voiceAssets.ownerOf({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [assetId],
      }),
      (result) => result.statusCode === 200 && typeof result.body === "string",
      `createDatasetAndListForSale.assetOwner.${assetId}`,
    );
    return { assetId, owner: normalizeAddress(ownerRead.body), ownerRead: ownerRead.body };
  }));

  const ownershipMismatch = ownershipReads.find((entry) => entry.owner !== normalizedSigner);
  if (ownershipMismatch) {
    let voiceHash: string | null = null;
    let actorAuthorized: boolean | null = null;
    if (typeof voiceAssets.getVoiceHashFromTokenId === "function") {
      const voiceHashRead = await voiceAssets.getVoiceHashFromTokenId({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [ownershipMismatch.assetId],
      }).catch(() => null);
      if (voiceHashRead?.statusCode === 200 && typeof voiceHashRead.body === "string") {
        voiceHash = voiceHashRead.body;
        if (typeof voiceAssets.isAuthorized === "function") {
          const authRead = await voiceAssets.isAuthorized({
            auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress,
            wireParams: [voiceHash, signerAddress],
          }).catch(() => null);
          if (authRead?.statusCode === 200) {
            actorAuthorized = authRead.body === true;
          }
        }
      }
    }
    const authorizationNote = actorAuthorized === true
      ? "actor is authorized but not owner"
      : "actor is not current owner";
    throw new HttpError(
      409,
      `commercialization requires current asset ownership; ${authorizationNote}; transfer asset ownership before commercialization`,
      {
        assetId: ownershipMismatch.assetId,
        owner: ownershipMismatch.owner,
        actor: signerAddress,
        actorAuthorized,
        voiceHash,
      },
    );
  }

  const licenseTemplate = await resolveDatasetLicenseTemplate(
    context,
    auth,
    walletAddress,
    signerAddress,
    body.licenseTemplateId,
  );
  const datasetsBefore = await datasets.getDatasetsByCreator({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [signerAddress],
  });
  const beforeIds = Array.isArray(datasetsBefore.body)
    ? new Set(datasetsBefore.body.map((entry) => String(entry)))
    : new Set<string>();
  const dataset = await datasets.createDataset({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.title, body.assetIds, licenseTemplate.templateId, body.metadataURI, body.royaltyBps],
  });
  const datasetTxHash = await waitForWorkflowWriteReceipt(context, dataset.body, "createDatasetAndListForSale.dataset");
  const datasetId = await waitForCreatedDatasetId(datasets, auth, walletAddress, signerAddress, beforeIds);
  const datasetRead = await waitForWorkflowReadback(
    () => datasets.getDataset({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId],
    }),
    (result) => result.statusCode === 200,
    "createDatasetAndListForSale.datasetRead",
  );
  const ownerRead = await waitForWorkflowReadback(
    () => voiceAssets.ownerOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId],
    }),
    (result) => result.statusCode === 200 && typeof result.body === "string",
    "createDatasetAndListForSale.ownerOf",
  );
  if (ownerRead?.body && typeof ownerRead.body === "string" && ownerRead.body.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(`dataset ${datasetId} is owned by ${ownerRead.body}, expected signer ${signerAddress}`);
  }
  const diamondAddress = context.addressBook.toJSON().diamond;
  const approvedForAll = await waitForWorkflowReadback(
    () => voiceAssets.isApprovedForAll({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [signerAddress, diamondAddress],
    }),
    (result) => result.statusCode === 200,
    "createDatasetAndListForSale.initialApprovalRead",
  );
  let approval: RouteResult | null = null;
  let approvalTxHash: string | null = null;
  let approvalRead = approvedForAll;
  if (approvedForAll.body !== true) {
    approval = await voiceAssets.setApprovalForAll({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [diamondAddress, true],
    });
    approvalTxHash = await waitForWorkflowWriteReceipt(context, approval.body, "createDatasetAndListForSale.approval");
    approvalRead = await waitForWorkflowReadback(
      () => voiceAssets.isApprovedForAll({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [signerAddress, diamondAddress],
      }),
      (result) => result.statusCode === 200 && result.body === true,
      "createDatasetAndListForSale.approvalRead",
    );
  }
  const listing = await marketplace.listAsset({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [datasetId, body.price, body.duration],
  });
  const listingTxHash = await waitForWorkflowWriteReceipt(context, listing.body, "createDatasetAndListForSale.listing");
  const listingRead = await readListingWithStabilization(marketplace, auth, walletAddress, datasetId);
  const datasetRecord = asRecord(datasetRead?.body);
  const listingRecord = asRecord(listingRead?.body);
  const datasetActive = readBoolean(datasetRecord, "active");
  const listingActive = readBoolean(listingRecord, "isActive");
  const tradeReadiness = !listingActive
    ? "not-actively-listed"
    : datasetActive
      ? "listed-and-tradable"
      : "listed-but-trading-locked-until-dataset-reactivated";
  return {
    licenseTemplate: {
      source: licenseTemplate.source,
      templateId: licenseTemplate.templateId,
      templateHash: licenseTemplate.templateHash,
      created: licenseTemplate.created,
      template: licenseTemplate.template,
    },
    dataset: {
      submission: dataset.body,
      txHash: datasetTxHash,
      datasetId,
      read: datasetRead.body,
    },
    ownership: {
      owner: ownerRead.body,
      approval: {
        submission: approval?.body ?? null,
        txHash: approvalTxHash,
        approvedForAll: approvalRead.body,
      },
    },
    listing: {
      submission: listing.body,
      txHash: listingTxHash,
      read: listingRead?.body ?? null,
      listingState: {
        isActive: listingActive,
        datasetActive,
      },
      tradeReadiness,
    },
    summary: {
      signerAddress,
      datasetId,
      listingActive,
      datasetActive,
      tradeReadiness,
    },
  };
}

function requestSignerPrivateKey(auth: import("../shared/auth.js").AuthContext): string | null {
  if (!auth.signerId) {
    return null;
  }
  const raw = process.env.API_LAYER_SIGNER_MAP_JSON;
  if (!raw) {
    return null;
  }
  const signerMap = JSON.parse(raw) as Record<string, string>;
  return signerMap[auth.signerId] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function readBoolean(value: Record<string, unknown> | null, field: string): boolean {
  return value?.[field] === true;
}

async function readListingWithStabilization(
  marketplace: ReturnType<typeof createMarketplacePrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  datasetId: string,
) {
  let lastRead: Awaited<ReturnType<ReturnType<typeof createMarketplacePrimitiveService>["getListing"]>> | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    lastRead = await marketplace.getListing({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId],
    });
    const listingRecord = asRecord(lastRead.body);
    if (listingRecord?.tokenId === datasetId || listingRecord?.isActive === true) {
      return lastRead;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return lastRead;
}

async function waitForCreatedDatasetId(
  datasets: ReturnType<typeof createDatasetsPrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  signerAddress: string,
  beforeIds: Set<string>,
): Promise<string> {
  let datasetId: string | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const datasetsAfter = await datasets.getDatasetsByCreator({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [signerAddress],
    });
    datasetId = Array.isArray(datasetsAfter.body)
      ? datasetsAfter.body
          .map((entry) => String(entry))
          .find((entry) => !beforeIds.has(entry)) ?? null
      : null;
    if (datasetId) {
      return datasetId;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("create-dataset-and-list-for-sale could not resolve the created dataset id from creator state");
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
