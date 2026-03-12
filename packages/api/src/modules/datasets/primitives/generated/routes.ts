import { Router } from "express";

import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { registerRoute } from "../../../../shared/route-factory.js";
import { createDatasetsPrimitiveController } from "./controller.js";
import { datasetsEventDefinitions, datasetsMethodDefinitions } from "./mapping.js";

export function createDatasetsPrimitiveRouter(context: ApiExecutionContext): Router {
  const router = Router();
  const controller = createDatasetsPrimitiveController(context);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "appendAssets")!, controller["appendAssets"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "burnDataset")!, controller["burnDataset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "containsAsset")!, controller["containsAsset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "createDataset")!, controller["createDataset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "getDataset")!, controller["getDataset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "getDatasetsByCreator")!, controller["getDatasetsByCreator"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "getMaxAssetsPerDataset")!, controller["getMaxAssetsPerDataset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "getTotalDatasets")!, controller["getTotalDatasets"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "removeAsset")!, controller["removeAsset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "royaltyInfo")!, controller["royaltyInfo"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "setDatasetStatus")!, controller["setDatasetStatus"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "setLicense")!, controller["setLicense"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "setMaxAssetsPerDataset")!, controller["setMaxAssetsPerDataset"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "setMetadata")!, controller["setMetadata"]);
  registerRoute(router, datasetsMethodDefinitions.find((definition) => definition.operationId === "setRoyalty")!, controller["setRoyalty"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "assetRemovedEventQuery")!, controller["assetRemovedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "assetsAppendedEventQuery")!, controller["assetsAppendedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetBurnedEventQuery")!, controller["datasetBurnedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetCreatedEventQuery")!, controller["datasetCreatedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetRoyaltyPayeeSetEventQuery")!, controller["datasetRoyaltyPayeeSetEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "datasetStatusChangedEventQuery")!, controller["datasetStatusChangedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "licenseChangedEventQuery")!, controller["licenseChangedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "metadataChangedEventQuery")!, controller["metadataChangedEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "royaltySetEventQuery")!, controller["royaltySetEventQuery"]);
  registerRoute(router, datasetsEventDefinitions.find((definition) => definition.operationId === "transferEventQuery")!, controller["transferEventQuery"]);
  return router;
}
