import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVoiceLicenseFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VoiceLicenseFacet" as const,
    read: {
    facetFunctionSelectors: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "facetFunctionSelectors", args, false, 5),
    getLicense: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "getLicense", args, false, 30),
    getLicenseHistory: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "getLicenseHistory", args, false, 30),
    getLicenseTerms: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "getLicenseTerms", args, false, 30),
    getLicensees: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "getLicensees", args, false, 30),
    getPendingRevenue: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "getPendingRevenue", args, false, 5),
    getUsageCount: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "getUsageCount", args, false, 5),
    isUsageRefUsed: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "isUsageRefUsed", args, false, 5),
    validateLicense: (...args: unknown[]) => invokeRead(context, "VoiceLicenseFacet", "validateLicense", args, false, 5),
    },
    write: {
    createLicense: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "createLicense", args),
    createLicenseWithMarketplace: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "createLicenseWithMarketplace", args),
    issueLicense: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "issueLicense", args),
    recordLicensedUsage: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "recordLicensedUsage", args),
    recordUsage: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "recordUsage", args),
    revokeLicense: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "revokeLicense", args),
    transferLicense: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "transferLicense", args),
    updateLicenseTerms: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "updateLicenseTerms", args),
    withdrawLicenseRevenue: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseFacet", "withdrawLicenseRevenue", args),
    },
    events: {
    Debug: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "Debug", fromBlock, toBlock) },
    LicenseBatchGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseBatchGranted", fromBlock, toBlock) },
    "LicenseCreated(bytes32,bytes32,address,uint256,uint256)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseCreated(bytes32,bytes32,address,uint256,uint256)", fromBlock, toBlock) },
    "LicenseCreated(bytes32,address,bytes32,uint256,uint256)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseCreated(bytes32,address,bytes32,uint256,uint256)", fromBlock, toBlock) },
    LicenseEnded: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseEnded", fromBlock, toBlock) },
    LicenseRenewed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseRenewed", fromBlock, toBlock) },
    LicenseRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseRevoked", fromBlock, toBlock) },
    LicenseTermsUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseTermsUpdated", fromBlock, toBlock) },
    LicenseTransferred: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseTransferred", fromBlock, toBlock) },
    LicenseUsed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "LicenseUsed", fromBlock, toBlock) },
    TemplateUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "TemplateUpdated", fromBlock, toBlock) },
    VoiceAssetUsed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseFacet", "VoiceAssetUsed", fromBlock, toBlock) },
    },
  };
}
