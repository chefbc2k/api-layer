import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { createEventRequestHandler, createMethodRequestHandler } from "../../../../shared/route-factory.js";
import { createDatasetsPrimitiveService } from "./service.js";
import {
  appendAssetsRequestSchemas,
  burnDatasetRequestSchemas,
  containsAssetRequestSchemas,
  createDatasetRequestSchemas,
  getDatasetRequestSchemas,
  getDatasetsByCreatorRequestSchemas,
  getMaxAssetsPerDatasetRequestSchemas,
  getSelectorsRequestSchemas,
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
import { datasetsEventDefinitions, datasetsMethodDefinitions } from "./mapping.js";

export function createDatasetsPrimitiveController(context: ApiExecutionContext): Record<string, import("express").RequestHandler> {
  const service = createDatasetsPrimitiveService(context);
  return {
    appendAssets: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "appendAssets")!, appendAssetsRequestSchemas, service.appendAssets),
    burnDataset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "burnDataset")!, burnDatasetRequestSchemas, service.burnDataset),
    containsAsset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "containsAsset")!, containsAssetRequestSchemas, service.containsAsset),
    createDataset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "createDataset")!, createDatasetRequestSchemas, service.createDataset),
    getDataset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "getDataset")!, getDatasetRequestSchemas, service.getDataset),
    getDatasetsByCreator: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "getDatasetsByCreator")!, getDatasetsByCreatorRequestSchemas, service.getDatasetsByCreator),
    getMaxAssetsPerDataset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "getMaxAssetsPerDataset")!, getMaxAssetsPerDatasetRequestSchemas, service.getMaxAssetsPerDataset),
    getSelectors: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "getSelectors")!, getSelectorsRequestSchemas, service.getSelectors),
    getTotalDatasets: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "getTotalDatasets")!, getTotalDatasetsRequestSchemas, service.getTotalDatasets),
    removeAsset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "removeAsset")!, removeAssetRequestSchemas, service.removeAsset),
    royaltyInfo: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "royaltyInfo")!, royaltyInfoRequestSchemas, service.royaltyInfo),
    setDatasetStatus: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "setDatasetStatus")!, setDatasetStatusRequestSchemas, service.setDatasetStatus),
    setLicense: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "setLicense")!, setLicenseRequestSchemas, service.setLicense),
    setMaxAssetsPerDataset: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "setMaxAssetsPerDataset")!, setMaxAssetsPerDatasetRequestSchemas, service.setMaxAssetsPerDataset),
    setMetadata: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "setMetadata")!, setMetadataRequestSchemas, service.setMetadata),
    setRoyalty: createMethodRequestHandler(datasetsMethodDefinitions.find((definition) => definition.operationId === "setRoyalty")!, setRoyaltyRequestSchemas, service.setRoyalty),
    assetRemovedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "assetRemovedEventQuery")!, assetRemovedEventQueryRequestSchema, service.assetRemovedEventQuery),
    assetsAppendedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "assetsAppendedEventQuery")!, assetsAppendedEventQueryRequestSchema, service.assetsAppendedEventQuery),
    datasetBurnedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "datasetBurnedEventQuery")!, datasetBurnedEventQueryRequestSchema, service.datasetBurnedEventQuery),
    datasetCreatedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "datasetCreatedEventQuery")!, datasetCreatedEventQueryRequestSchema, service.datasetCreatedEventQuery),
    datasetRoyaltyPayeeSetEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "datasetRoyaltyPayeeSetEventQuery")!, datasetRoyaltyPayeeSetEventQueryRequestSchema, service.datasetRoyaltyPayeeSetEventQuery),
    datasetStatusChangedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "datasetStatusChangedEventQuery")!, datasetStatusChangedEventQueryRequestSchema, service.datasetStatusChangedEventQuery),
    licenseChangedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "licenseChangedEventQuery")!, licenseChangedEventQueryRequestSchema, service.licenseChangedEventQuery),
    metadataChangedEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "metadataChangedEventQuery")!, metadataChangedEventQueryRequestSchema, service.metadataChangedEventQuery),
    royaltySetEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "royaltySetEventQuery")!, royaltySetEventQueryRequestSchema, service.royaltySetEventQuery),
    transferEventQuery: createEventRequestHandler(datasetsEventDefinitions.find((definition) => definition.operationId === "transferEventQuery")!, transferEventQueryRequestSchema, service.transferEventQuery),
  };
}
