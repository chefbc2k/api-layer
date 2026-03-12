import { Router } from "express";

import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { registerRoute } from "../../../../shared/route-factory.js";
import { createDiamondAdminPrimitiveController } from "./controller.js";
import { diamondAdminEventDefinitions, diamondAdminMethodDefinitions } from "./mapping.js";

export function createDiamondAdminPrimitiveRouter(context: ApiExecutionContext): Router {
  const router = Router();
  const controller = createDiamondAdminPrimitiveController(context);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "approveUpgrade")!, controller["approveUpgrade"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facetAddress")!, controller["facetAddress"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facetAddresses")!, controller["facetAddresses"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facetFunctionSelectors")!, controller["facetFunctionSelectors"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facets")!, controller["facets"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "founderRole")!, controller["founderRole"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "freezeUpgradeControl")!, controller["freezeUpgradeControl"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getOperationalInvariants")!, controller["getOperationalInvariants"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getTrustedInitCodehash")!, controller["getTrustedInitCodehash"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgrade")!, controller["getUpgrade"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgradeControlStatus")!, controller["getUpgradeControlStatus"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgradeDelay")!, controller["getUpgradeDelay"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgradeThreshold")!, controller["getUpgradeThreshold"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "initUpgradeController")!, controller["initUpgradeController"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isImmutableSelectorReserved")!, controller["isImmutableSelectorReserved"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isTrustedInitSelector")!, controller["isTrustedInitSelector"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isTrustedInitSelectorPolicyEnabled")!, controller["isTrustedInitSelectorPolicyEnabled"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isUpgradeApproved")!, controller["isUpgradeApproved"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isUpgradeControlFrozen")!, controller["isUpgradeControlFrozen"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isUpgradeSigner")!, controller["isUpgradeSigner"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setTrustedInitCodehash")!, controller["setTrustedInitCodehash"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setTrustedInitContract")!, controller["setTrustedInitContract"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setTrustedInitSelector")!, controller["setTrustedInitSelector"]);
  registerRoute(router, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setUpgradeControlEnforced")!, controller["setUpgradeControlEnforced"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "diamondCutEventEventQuery")!, controller["diamondCutEventEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "diamondCutEventQuery")!, controller["diamondCutEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "trustedInitCodehashSetEventQuery")!, controller["trustedInitCodehashSetEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "trustedInitContractSetEventQuery")!, controller["trustedInitContractSetEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "trustedInitSelectorSetEventQuery")!, controller["trustedInitSelectorSetEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeApprovedEventQuery")!, controller["upgradeApprovedEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeControlEnforcementSetEventQuery")!, controller["upgradeControlEnforcementSetEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeControlFrozenEventQuery")!, controller["upgradeControlFrozenEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeControllerInitializedEventQuery")!, controller["upgradeControllerInitializedEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeExecutedEventQuery")!, controller["upgradeExecutedEventQuery"]);
  registerRoute(router, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeProposedEventQuery")!, controller["upgradeProposedEventQuery"]);
  return router;
}
