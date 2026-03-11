import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { licensingEventDefinitions, licensingMethodDefinitions } from "./mapping.js";

export function createLicensingPrimitiveService(context: ApiExecutionContext) {
  return {
    createLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "createLicense")!, request),
    createLicenseFromTemplate: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "createLicenseFromTemplate")!, request),
    createLicenseWithMarketplace: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "createLicenseWithMarketplace")!, request),
    createTemplate: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "createTemplate")!, request),
    facetFunctionSelectors: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "facetFunctionSelectors")!, request),
    getCreatorTemplates: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getCreatorTemplates")!, request),
    getLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getLicense")!, request),
    getLicensees: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getLicensees")!, request),
    getLicenseHistory: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getLicenseHistory")!, request),
    getLicenseTerms: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getLicenseTerms")!, request),
    getPendingRevenue: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getPendingRevenue")!, request),
    getSelectors: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getSelectors")!, request),
    getTemplate: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getTemplate")!, request),
    getUsageCount: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "getUsageCount")!, request),
    issueLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "issueLicense")!, request),
    isTemplateActive: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "isTemplateActive")!, request),
    isUsageRefUsed: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "isUsageRefUsed")!, request),
    recordLicensedUsage: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "recordLicensedUsage")!, request),
    recordUsage: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "recordUsage")!, request),
    revokeLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "revokeLicense")!, request),
    setTemplateStatus: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "setTemplateStatus")!, request),
    transferLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "transferLicense")!, request),
    updateLicenseTerms: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "updateLicenseTerms")!, request),
    updateTemplate: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "updateTemplate")!, request),
    validateLicense: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "validateLicense")!, request),
    withdrawLicenseRevenue: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, licensingMethodDefinitions.find((definition) => definition.operationId === "withdrawLicenseRevenue")!, request),
    debugEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "debugEventQuery")!, request),
    licenseBatchGrantedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseBatchGrantedEventQuery")!, request),
    licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseCreatedBytes32AddressBytes32Uint256Uint256EventQuery")!, request),
    licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseCreatedBytes32Bytes32AddressUint256Uint256EventQuery")!, request),
    licenseCreatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseCreatedEventQuery")!, request),
    licenseEndedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseEndedEventQuery")!, request),
    licenseRenewedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseRenewedEventQuery")!, request),
    licenseRevokedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseRevokedEventQuery")!, request),
    licenseTermsUpdatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseTermsUpdatedEventQuery")!, request),
    licenseTransferredEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseTransferredEventQuery")!, request),
    licenseUsedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "licenseUsedEventQuery")!, request),
    voiceAssetUsedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "voiceAssetUsedEventQuery")!, request),
    voiceLicenseTemplateTemplateUpdatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "voiceLicenseTemplateTemplateUpdatedEventQuery")!, request),
    voiceLicenseTemplateUpdatedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, licensingEventDefinitions.find((definition) => definition.operationId === "voiceLicenseTemplateUpdatedEventQuery")!, request),
  };
}
