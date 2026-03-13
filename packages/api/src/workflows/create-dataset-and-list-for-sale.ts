import { Wallet } from "ethers";
import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createDatasetsPrimitiveService } from "../modules/datasets/primitives/generated/index.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import { resolveDatasetLicenseTemplate } from "./license-template.js";
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
  await waitForWorkflowWriteReceipt(context, dataset.body, "createDatasetAndListForSale.dataset");
  let datasetId: string | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const datasetsAfter = await datasets.getDatasetsByCreator({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [signerAddress],
    });
    datasetId = Array.isArray(datasetsAfter.body)
      ? datasetsAfter.body
          .map((entry) => String(entry))
          .find((entry) => !beforeIds.has(entry)) ?? null
      : null;
    if (datasetId) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!datasetId) {
    throw new Error("create-dataset-and-list-for-sale could not resolve the created dataset id from creator state");
  }
  const datasetRead = datasetId
    ? await datasets.getDataset({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      })
    : null;
  const ownerRead = datasetId
    ? await voiceAssets.ownerOf({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      })
    : null;
  if (ownerRead?.body && typeof ownerRead.body === "string" && ownerRead.body.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(`dataset ${datasetId} is owned by ${ownerRead.body}, expected signer ${signerAddress}`);
  }
  const diamondAddress = context.addressBook.toJSON().diamond;
  const approvedForAll = datasetId
    ? await voiceAssets.isApprovedForAll({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [signerAddress, diamondAddress],
      })
    : null;
  let approval: import("../shared/route-types.js").RouteResult | null = null;
  if (approvedForAll?.body !== true) {
    approval = await voiceAssets.setApprovalForAll({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [diamondAddress, true],
    });
    await waitForWorkflowWriteReceipt(context, approval.body, "createDatasetAndListForSale.approval");
  }
  const listing = datasetId
    ? await marketplace.listAsset({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId, body.price, body.duration],
      })
    : null;
  if (listing) {
    await waitForWorkflowWriteReceipt(context, listing.body, "createDatasetAndListForSale.listing");
  }
  const listingRead = datasetId
    ? await readListingWithStabilization(marketplace, auth, walletAddress, datasetId)
    : null;
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
    dataset: dataset.body,
    datasetRead: datasetRead?.body ?? null,
    licenseTemplateId: licenseTemplate.templateId,
    licenseTemplateHash: licenseTemplate.templateHash,
    licenseTemplateCreated: licenseTemplate.created,
    owner: ownerRead?.body ?? null,
    approval: approval?.body ?? null,
    listing: listing?.body ?? null,
    listingRead: listingRead?.body ?? null,
    datasetId,
    tradeReadiness,
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
