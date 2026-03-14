import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createDatasetsPrimitiveService } from "../modules/datasets/primitives/generated/index.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { runCancelMarketplaceListingWorkflow } from "./cancel-marketplace-listing.js";
import { createMarketplaceListingSchema, runCreateMarketplaceListingWorkflow } from "./create-marketplace-listing.js";
import { runInspectMarketplaceListingWorkflow } from "./inspect-marketplace-listing.js";
import {
  asRecord,
  normalizeAddress,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./marketplace-listing-helpers.js";
import {
  licenseTemplateInputSchema,
  manageLicenseTemplateLifecycleWorkflowSchema,
  runManageLicenseTemplateLifecycleWorkflow,
} from "./manage-license-template-lifecycle.js";
import { runReleaseEscrowedAssetWorkflow } from "./release-escrowed-asset.js";
import { runUpdateMarketplaceListingPriceWorkflow } from "./update-marketplace-listing-price.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const digitsSchema = z.string().regex(/^\d+$/u);
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);

const datasetMaintenanceSchema = z.object({
  appendAssetIds: z.array(digitsSchema).min(1).optional(),
  removeAssetId: digitsSchema.optional(),
  setLicenseTemplateId: digitsSchema.optional(),
  setMetadataURI: z.string().min(1).optional(),
  setRoyaltyBps: digitsSchema.optional(),
  setActive: z.boolean().optional(),
}).refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "dataset maintenance expected at least one requested change",
});

export const catalogListingOperationsWorkflowSchema = z.object({
  dataset: z.object({
    datasetId: digitsSchema,
    templateLifecycle: manageLicenseTemplateLifecycleWorkflowSchema.optional(),
    maintenance: datasetMaintenanceSchema.optional(),
  }),
  listing: z.object({
    inspect: z.boolean().default(true),
    reprice: z.object({
      newPrice: digitsSchema,
    }).optional(),
    cancel: z.boolean().default(false),
    release: z.object({
      to: addressSchema.optional(),
    }).optional(),
    relist: createMarketplaceListingSchema.pick({
      price: true,
      duration: true,
    }).optional(),
  }).default({
    inspect: true,
    cancel: false,
  }),
}).superRefine((value, ctx) => {
  if (value.dataset.templateLifecycle && value.dataset.maintenance?.setLicenseTemplateId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataset", "maintenance", "setLicenseTemplateId"],
      message: "setLicenseTemplateId cannot be combined with templateLifecycle in catalog-listing-operations",
    });
  }
});

export async function runCatalogListingOperationsWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof catalogListingOperationsWorkflowSchema>,
) {
  const datasets = createDatasetsPrimitiveService(context);
  const marketplace = createMarketplacePrimitiveService(context);
  const datasetId = body.dataset.datasetId;

  let currentDataset = await readDataset(datasets, auth, walletAddress, datasetId, "catalogListingOperations.datasetBefore");
  const packageBefore = currentDataset.body;

  const templateLifecycle = body.dataset.templateLifecycle
    ? await runManageLicenseTemplateLifecycleWorkflow(context, auth, walletAddress, body.dataset.templateLifecycle)
    : null;
  const templateIdToApply = body.dataset.maintenance?.setLicenseTemplateId ?? templateLifecycle?.summary.templateId ?? null;

  let appendAssets: DatasetMutationResult | null = null;
  if (body.dataset.maintenance?.appendAssetIds) {
    const write = await datasets.appendAssets({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId, body.dataset.maintenance.appendAssetIds],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "catalogListingOperations.appendAssets");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "catalogListingOperations.appendAssets") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => datasets.assetsAppendedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === txHash),
          "catalogListingOperations.assetsAppended",
        )
      : [];
    currentDataset = await waitForWorkflowReadback(
      () => datasets.getDataset({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      }),
      (result) => body.dataset.maintenance!.appendAssetIds!.every((assetId) => readDatasetAssetIds(result.body).includes(assetId)),
      "catalogListingOperations.appendAssetsRead",
    );
    appendAssets = {
      submission: write.body,
      txHash,
      read: currentDataset.body,
      eventCount: events.length,
    };
  }

  let removeAsset: DatasetMutationResult | null = null;
  if (body.dataset.maintenance?.removeAssetId) {
    const write = await datasets.removeAsset({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId, body.dataset.maintenance.removeAssetId],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "catalogListingOperations.removeAsset");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "catalogListingOperations.removeAsset") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => datasets.assetRemovedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === txHash),
          "catalogListingOperations.assetRemoved",
        )
      : [];
    currentDataset = await waitForWorkflowReadback(
      () => datasets.getDataset({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      }),
      (result) => !readDatasetAssetIds(result.body).includes(body.dataset.maintenance!.removeAssetId!),
      "catalogListingOperations.removeAssetRead",
    );
    removeAsset = {
      submission: write.body,
      txHash,
      read: currentDataset.body,
      eventCount: events.length,
    };
  }

  let setLicense: DatasetMutationResult | null = null;
  if (templateIdToApply !== null) {
    const write = await datasets.setLicense({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId, templateIdToApply],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "catalogListingOperations.setLicense");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "catalogListingOperations.setLicense") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => datasets.licenseChangedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === txHash),
          "catalogListingOperations.licenseChanged",
        )
      : [];
    currentDataset = await waitForWorkflowReadback(
      () => datasets.getDataset({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      }),
      (result) => readDatasetField(result.body, "licenseTemplateId") === templateIdToApply,
      "catalogListingOperations.setLicenseRead",
    );
    setLicense = {
      submission: write.body,
      txHash,
      read: currentDataset.body,
      eventCount: events.length,
    };
  }

  let setMetadata: DatasetMutationResult | null = null;
  if (body.dataset.maintenance?.setMetadataURI) {
    const write = await datasets.setMetadata({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId, body.dataset.maintenance.setMetadataURI],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "catalogListingOperations.setMetadata");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "catalogListingOperations.setMetadata") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => datasets.metadataChangedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === txHash),
          "catalogListingOperations.metadataChanged",
        )
      : [];
    currentDataset = await waitForWorkflowReadback(
      () => datasets.getDataset({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      }),
      (result) => readDatasetField(result.body, "metadataURI") === body.dataset.maintenance!.setMetadataURI,
      "catalogListingOperations.setMetadataRead",
    );
    setMetadata = {
      submission: write.body,
      txHash,
      read: currentDataset.body,
      eventCount: events.length,
    };
  }

  let setRoyalty: DatasetMutationResult | null = null;
  if (body.dataset.maintenance?.setRoyaltyBps) {
    const write = await datasets.setRoyalty({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId, body.dataset.maintenance.setRoyaltyBps],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "catalogListingOperations.setRoyalty");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "catalogListingOperations.setRoyalty") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => datasets.royaltySetEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === txHash),
          "catalogListingOperations.royaltySet",
        )
      : [];
    currentDataset = await waitForWorkflowReadback(
      () => datasets.getDataset({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      }),
      (result) => readDatasetField(result.body, "royaltyBps") === body.dataset.maintenance!.setRoyaltyBps,
      "catalogListingOperations.setRoyaltyRead",
    );
    setRoyalty = {
      submission: write.body,
      txHash,
      read: currentDataset.body,
      eventCount: events.length,
    };
  }

  let setDatasetStatus: DatasetMutationResult | null = null;
  if (body.dataset.maintenance?.setActive !== undefined) {
    const write = await datasets.setDatasetStatus({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId, body.dataset.maintenance.setActive],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "catalogListingOperations.setDatasetStatus");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "catalogListingOperations.setDatasetStatus") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => datasets.datasetStatusChangedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === txHash),
          "catalogListingOperations.datasetStatusChanged",
        )
      : [];
    currentDataset = await waitForWorkflowReadback(
      () => datasets.getDataset({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId],
      }),
      (result) => readDatasetActive(result.body) === body.dataset.maintenance!.setActive,
      "catalogListingOperations.setDatasetStatusRead",
    );
    setDatasetStatus = {
      submission: write.body,
      txHash,
      read: currentDataset.body,
      eventCount: events.length,
    };
  }

  let inspectionBefore: Awaited<ReturnType<typeof runInspectMarketplaceListingWorkflow>> | null = null;
  let currentInspection: Awaited<ReturnType<typeof runInspectMarketplaceListingWorkflow>> | null = null;
  if (body.listing.inspect || body.listing.reprice || body.listing.cancel || body.listing.release || body.listing.relist) {
    inspectionBefore = await runInspectMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
    });
    currentInspection = inspectionBefore;
  }

  let reprice: Awaited<ReturnType<typeof runUpdateMarketplaceListingPriceWorkflow>> | null = null;
  if (body.listing.reprice) {
    reprice = await runUpdateMarketplaceListingPriceWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
      newPrice: body.listing.reprice.newPrice,
    });
    currentInspection = await runInspectMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
    });
  }

  let cancellation: Awaited<ReturnType<typeof runCancelMarketplaceListingWorkflow>> | null = null;
  if (body.listing.cancel) {
    cancellation = await runCancelMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
    });
    currentInspection = await runInspectMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
    });
  }

  let release: Awaited<ReturnType<typeof runReleaseEscrowedAssetWorkflow>> | null = null;
  if (body.listing.release) {
    const releaseTo = body.listing.release.to
      ?? normalizeAddress(currentInspection?.escrow?.originalOwner)
      ?? null;
    if (!releaseTo) {
      throw new HttpError(400, "catalog-listing-operations release requires explicit to address or escrow originalOwner");
    }
    release = await runReleaseEscrowedAssetWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
      to: releaseTo,
    });
    currentInspection = await runInspectMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
    });
  }

  let relist: Awaited<ReturnType<typeof runCreateMarketplaceListingWorkflow>> | null = null;
  if (body.listing.relist) {
    if (currentInspection?.listing && asRecord(currentInspection.listing)?.isActive === true) {
      throw new HttpError(409, "catalog-listing-operations relist blocked by listing state: existing listing is still active");
    }
    if (currentInspection?.escrow?.inEscrow === true) {
      throw new HttpError(409, "catalog-listing-operations relist blocked by escrow state: asset must be released before relisting");
    }
    relist = await runCreateMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
      price: body.listing.relist.price,
      duration: body.listing.relist.duration,
    });
    currentInspection = await runInspectMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId: datasetId,
    });
  }

  const listingRead = currentInspection;
  const tradeReadiness = computeTradeReadiness(listingRead?.listing, currentDataset.body);
  const isTradable = tradeReadiness === "listed-and-tradable";

  return {
    packaging: {
      before: packageBefore,
      templateLifecycle,
      maintenance: {
        appendAssets,
        removeAsset,
        setLicense,
        setMetadata,
        setRoyalty,
        setDatasetStatus,
      },
      after: currentDataset.body,
    },
    listing: {
      inspectionBefore,
      reprice,
      cancellation,
      release,
      relist,
      inspectionAfter: listingRead,
      tradeReadiness,
      isTradable,
      escrowState: listingRead?.escrow ?? null,
    },
    summary: {
      datasetId,
      templateIdApplied: templateIdToApply,
      packageUpdated: Boolean(appendAssets || removeAsset || setLicense || setMetadata || setRoyalty || setDatasetStatus || templateLifecycle),
      listingInspected: Boolean(inspectionBefore),
      listingUpdated: Boolean(reprice || cancellation || release || relist),
      tradeReadiness,
      isTradable,
      relisted: Boolean(relist),
      released: Boolean(release),
      activeListing: asRecord(listingRead?.listing)?.isActive === true,
      datasetActive: readDatasetActive(currentDataset.body),
    },
  };
}

type DatasetMutationResult = {
  submission: unknown;
  txHash: string | null;
  read: unknown;
  eventCount: number;
};

async function readDataset(
  datasets: ReturnType<typeof createDatasetsPrimitiveService>,
  auth: AuthContext,
  walletAddress: string | undefined,
  datasetId: string,
  label: string,
) {
  return waitForWorkflowReadback(
    () => datasets.getDataset({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [datasetId],
    }),
    (result) => result.statusCode === 200,
    label,
  );
}

function readDatasetField(value: unknown, field: string): string | null {
  const record = asRecord(value);
  const fieldValue = record?.[field];
  return typeof fieldValue === "string" || typeof fieldValue === "number" || typeof fieldValue === "bigint"
    ? String(fieldValue)
    : null;
}

function readDatasetAssetIds(value: unknown): string[] {
  const assets = asRecord(value)?.assetIds;
  return Array.isArray(assets) ? assets.map((entry) => String(entry)) : [];
}

function readDatasetActive(value: unknown): boolean | null {
  const active = asRecord(value)?.active;
  return typeof active === "boolean" ? active : null;
}

function computeTradeReadiness(
  listing: unknown,
  dataset: unknown,
): "not-actively-listed" | "listed-and-tradable" | "listed-but-trading-locked-until-dataset-reactivated" | null {
  const listingActive = asRecord(listing)?.isActive === true;
  const datasetActive = readDatasetActive(dataset);
  if (!listing) {
    return null;
  }
  if (!listingActive) {
    return "not-actively-listed";
  }
  return datasetActive === true
    ? "listed-and-tradable"
    : "listed-but-trading-locked-until-dataset-reactivated";
}
