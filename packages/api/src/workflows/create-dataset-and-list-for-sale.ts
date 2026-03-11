import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createDatasetsPrimitiveService } from "../modules/datasets/primitives/generated/index.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";

export const createDatasetAndListForSaleSchema = z.object({
  title: z.string(),
  assetIds: z.array(z.string().regex(/^\d+$/u)),
  licenseTemplateId: z.string().regex(/^\d+$/u),
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
  const dataset = await datasets.createDataset({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.title, body.assetIds, body.licenseTemplateId, body.metadataURI, body.royaltyBps],
  });
  const datasetId = dataset.body && typeof dataset.body === "object" && "result" in (dataset.body as Record<string, unknown>)
    ? ((dataset.body as Record<string, unknown>).result as string | null)
    : null;
  const listing = datasetId
    ? await marketplace.listAsset({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [datasetId, body.price, body.duration],
      })
    : null;
  return {
    dataset: dataset.body,
    listing: listing?.body ?? null,
    datasetId,
  };
}
