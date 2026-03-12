import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { datasetsEventDefinitions, datasetsMethodDefinitions } from "./mapping.js";

export function createDatasetsPrimitiveService(context: ApiExecutionContext) {
  return {
    appendAssets: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "appendAssets")!, request),
    burnDataset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "burnDataset")!, request),
    containsAsset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "containsAsset")!, request),
    createDataset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "createDataset")!, request),
    getDataset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "getDataset")!, request),
    getDatasetsByCreator: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "getDatasetsByCreator")!, request),
    getMaxAssetsPerDataset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "getMaxAssetsPerDataset")!, request),
    getTotalDatasets: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "getTotalDatasets")!, request),
    removeAsset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "removeAsset")!, request),
    royaltyInfo: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "royaltyInfo")!, request),
    setDatasetStatus: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "setDatasetStatus")!, request),
    setLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "setLicense")!, request),
    setMaxAssetsPerDataset: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "setMaxAssetsPerDataset")!, request),
    setMetadata: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "setMetadata")!, request),
    setRoyalty: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, datasetsMethodDefinitions.find((definition) => definition.operationId === "setRoyalty")!, request),
    assetRemovedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "assetRemovedEventQuery")!, request),
    assetsAppendedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "assetsAppendedEventQuery")!, request),
    datasetBurnedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetBurnedEventQuery")!, request),
    datasetCreatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetCreatedEventQuery")!, request),
    datasetRoyaltyPayeeSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetRoyaltyPayeeSetEventQuery")!, request),
    datasetStatusChangedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetStatusChangedEventQuery")!, request),
    licenseChangedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "licenseChangedEventQuery")!, request),
    metadataChangedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "metadataChangedEventQuery")!, request),
    royaltySetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "royaltySetEventQuery")!, request),
    transferEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, datasetsEventDefinitions.find((definition) => definition.operationId === "transferEventQuery")!, request),
  };
}
