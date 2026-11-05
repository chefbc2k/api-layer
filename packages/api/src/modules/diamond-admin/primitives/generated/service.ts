import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { diamondAdminEventDefinitions, diamondAdminMethodDefinitions } from "./mapping.js";

export function createDiamondAdminPrimitiveService(context: ApiExecutionContext) {
  return {
    approveUpgrade: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "approveUpgrade")!, request),
    diamondCut: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "diamondCut")!, request),
    diamondCutIsImmutableSelectorReserved: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "diamondCutIsImmutableSelectorReserved")!, request),
    diamondLoupeIsImmutableSelectorReserved: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "diamondLoupeIsImmutableSelectorReserved")!, request),
    executeUpgrade: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "executeUpgrade")!, request),
    facetAddress: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facetAddress")!, request),
    facetAddresses: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facetAddresses")!, request),
    facetFunctionSelectors: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facetFunctionSelectors")!, request),
    facets: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "facets")!, request),
    founderRole: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "founderRole")!, request),
    freezeUpgradeControl: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "freezeUpgradeControl")!, request),
    getOperationalInvariants: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getOperationalInvariants")!, request),
    getTrustedInitCodehash: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getTrustedInitCodehash")!, request),
    getUpgrade: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgrade")!, request),
    getUpgradeControlStatus: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgradeControlStatus")!, request),
    getUpgradeDelay: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgradeDelay")!, request),
    getUpgradeThreshold: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "getUpgradeThreshold")!, request),
    initUpgradeController: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "initUpgradeController")!, request),
    isTrustedInitSelector: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isTrustedInitSelector")!, request),
    isTrustedInitSelectorPolicyEnabled: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isTrustedInitSelectorPolicyEnabled")!, request),
    isUpgradeApproved: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isUpgradeApproved")!, request),
    isUpgradeControlFrozen: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isUpgradeControlFrozen")!, request),
    isUpgradeSigner: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "isUpgradeSigner")!, request),
    proposeDiamondCut: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "proposeDiamondCut")!, request),
    setTrustedInitCodehash: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setTrustedInitCodehash")!, request),
    setTrustedInitContract: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setTrustedInitContract")!, request),
    setTrustedInitSelector: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setTrustedInitSelector")!, request),
    setUpgradeControlEnforced: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "setUpgradeControlEnforced")!, request),
    supportsInterface: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, diamondAdminMethodDefinitions.find((definition) => definition.operationId === "supportsInterface")!, request),
    diamondCutEventEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "diamondCutEventEventQuery")!, request),
    diamondCutEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "diamondCutEventQuery")!, request),
    trustedInitCodehashSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "trustedInitCodehashSetEventQuery")!, request),
    trustedInitContractSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "trustedInitContractSetEventQuery")!, request),
    trustedInitSelectorSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "trustedInitSelectorSetEventQuery")!, request),
    upgradeApprovedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeApprovedEventQuery")!, request),
    upgradeControlEnforcementSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeControlEnforcementSetEventQuery")!, request),
    upgradeControlFrozenEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeControlFrozenEventQuery")!, request),
    upgradeControllerInitializedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeControllerInitializedEventQuery")!, request),
    upgradeExecutedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeExecutedEventQuery")!, request),
    upgradeProposedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, diamondAdminEventDefinitions.find((definition) => definition.operationId === "upgradeProposedEventQuery")!, request),
  };
}
