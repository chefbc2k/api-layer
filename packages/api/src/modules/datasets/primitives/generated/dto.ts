import {
  appendAssetsRequestSchemas,
  burnDatasetRequestSchemas,
  containsAssetRequestSchemas,
  createDatasetRequestSchemas,
  getDatasetRequestSchemas,
  getDatasetsByCreatorRequestSchemas,
  getMaxAssetsPerDatasetRequestSchemas,
  getTotalDatasetsRequestSchemas,
  removeAssetRequestSchemas,
  royaltyInfoRequestSchemas,
  setDatasetStatusRequestSchemas,
  setLicenseRequestSchemas,
  setMaxAssetsPerDatasetRequestSchemas,
  setMetadataRequestSchemas,
  setRoyaltyRequestSchemas,
  assetRemovedEventQueryRequestSchema,
  assetsAppendedEventQueryRequestSchema,
  datasetBurnedEventQueryRequestSchema,
  datasetCreatedEventQueryRequestSchema,
  datasetRoyaltyPayeeSetEventQueryRequestSchema,
  datasetStatusChangedEventQueryRequestSchema,
  licenseChangedEventQueryRequestSchema,
  metadataChangedEventQueryRequestSchema,
  royaltySetEventQueryRequestSchema,
  transferEventQueryRequestSchema,
} from "./schemas.js";

export type AppendAssetsPath = import("zod").infer<typeof appendAssetsRequestSchemas.path>;
export type AppendAssetsQuery = import("zod").infer<typeof appendAssetsRequestSchemas.query>;
export type AppendAssetsBody = import("zod").infer<typeof appendAssetsRequestSchemas.body>;
export type BurnDatasetPath = import("zod").infer<typeof burnDatasetRequestSchemas.path>;
export type BurnDatasetQuery = import("zod").infer<typeof burnDatasetRequestSchemas.query>;
export type BurnDatasetBody = import("zod").infer<typeof burnDatasetRequestSchemas.body>;
export type ContainsAssetPath = import("zod").infer<typeof containsAssetRequestSchemas.path>;
export type ContainsAssetQuery = import("zod").infer<typeof containsAssetRequestSchemas.query>;
export type ContainsAssetBody = import("zod").infer<typeof containsAssetRequestSchemas.body>;
export type CreateDatasetPath = import("zod").infer<typeof createDatasetRequestSchemas.path>;
export type CreateDatasetQuery = import("zod").infer<typeof createDatasetRequestSchemas.query>;
export type CreateDatasetBody = import("zod").infer<typeof createDatasetRequestSchemas.body>;
export type GetDatasetPath = import("zod").infer<typeof getDatasetRequestSchemas.path>;
export type GetDatasetQuery = import("zod").infer<typeof getDatasetRequestSchemas.query>;
export type GetDatasetBody = import("zod").infer<typeof getDatasetRequestSchemas.body>;
export type GetDatasetsByCreatorPath = import("zod").infer<typeof getDatasetsByCreatorRequestSchemas.path>;
export type GetDatasetsByCreatorQuery = import("zod").infer<typeof getDatasetsByCreatorRequestSchemas.query>;
export type GetDatasetsByCreatorBody = import("zod").infer<typeof getDatasetsByCreatorRequestSchemas.body>;
export type GetMaxAssetsPerDatasetPath = import("zod").infer<typeof getMaxAssetsPerDatasetRequestSchemas.path>;
export type GetMaxAssetsPerDatasetQuery = import("zod").infer<typeof getMaxAssetsPerDatasetRequestSchemas.query>;
export type GetMaxAssetsPerDatasetBody = import("zod").infer<typeof getMaxAssetsPerDatasetRequestSchemas.body>;
export type GetTotalDatasetsPath = import("zod").infer<typeof getTotalDatasetsRequestSchemas.path>;
export type GetTotalDatasetsQuery = import("zod").infer<typeof getTotalDatasetsRequestSchemas.query>;
export type GetTotalDatasetsBody = import("zod").infer<typeof getTotalDatasetsRequestSchemas.body>;
export type RemoveAssetPath = import("zod").infer<typeof removeAssetRequestSchemas.path>;
export type RemoveAssetQuery = import("zod").infer<typeof removeAssetRequestSchemas.query>;
export type RemoveAssetBody = import("zod").infer<typeof removeAssetRequestSchemas.body>;
export type RoyaltyInfoPath = import("zod").infer<typeof royaltyInfoRequestSchemas.path>;
export type RoyaltyInfoQuery = import("zod").infer<typeof royaltyInfoRequestSchemas.query>;
export type RoyaltyInfoBody = import("zod").infer<typeof royaltyInfoRequestSchemas.body>;
export type SetDatasetStatusPath = import("zod").infer<typeof setDatasetStatusRequestSchemas.path>;
export type SetDatasetStatusQuery = import("zod").infer<typeof setDatasetStatusRequestSchemas.query>;
export type SetDatasetStatusBody = import("zod").infer<typeof setDatasetStatusRequestSchemas.body>;
export type SetLicensePath = import("zod").infer<typeof setLicenseRequestSchemas.path>;
export type SetLicenseQuery = import("zod").infer<typeof setLicenseRequestSchemas.query>;
export type SetLicenseBody = import("zod").infer<typeof setLicenseRequestSchemas.body>;
export type SetMaxAssetsPerDatasetPath = import("zod").infer<typeof setMaxAssetsPerDatasetRequestSchemas.path>;
export type SetMaxAssetsPerDatasetQuery = import("zod").infer<typeof setMaxAssetsPerDatasetRequestSchemas.query>;
export type SetMaxAssetsPerDatasetBody = import("zod").infer<typeof setMaxAssetsPerDatasetRequestSchemas.body>;
export type SetMetadataPath = import("zod").infer<typeof setMetadataRequestSchemas.path>;
export type SetMetadataQuery = import("zod").infer<typeof setMetadataRequestSchemas.query>;
export type SetMetadataBody = import("zod").infer<typeof setMetadataRequestSchemas.body>;
export type SetRoyaltyPath = import("zod").infer<typeof setRoyaltyRequestSchemas.path>;
export type SetRoyaltyQuery = import("zod").infer<typeof setRoyaltyRequestSchemas.query>;
export type SetRoyaltyBody = import("zod").infer<typeof setRoyaltyRequestSchemas.body>;
export type AssetRemovedEventQueryBody = import("zod").infer<typeof assetRemovedEventQueryRequestSchema.body>;
export type AssetsAppendedEventQueryBody = import("zod").infer<typeof assetsAppendedEventQueryRequestSchema.body>;
export type DatasetBurnedEventQueryBody = import("zod").infer<typeof datasetBurnedEventQueryRequestSchema.body>;
export type DatasetCreatedEventQueryBody = import("zod").infer<typeof datasetCreatedEventQueryRequestSchema.body>;
export type DatasetRoyaltyPayeeSetEventQueryBody = import("zod").infer<typeof datasetRoyaltyPayeeSetEventQueryRequestSchema.body>;
export type DatasetStatusChangedEventQueryBody = import("zod").infer<typeof datasetStatusChangedEventQueryRequestSchema.body>;
export type LicenseChangedEventQueryBody = import("zod").infer<typeof licenseChangedEventQueryRequestSchema.body>;
export type MetadataChangedEventQueryBody = import("zod").infer<typeof metadataChangedEventQueryRequestSchema.body>;
export type RoyaltySetEventQueryBody = import("zod").infer<typeof royaltySetEventQueryRequestSchema.body>;
export type TransferEventQueryBody = import("zod").infer<typeof transferEventQueryRequestSchema.body>;
