import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVoiceLicenseTemplateFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VoiceLicenseTemplateFacet" as const,
    read: {
    getCreatorTemplates: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "getCreatorTemplates", args, false, 5),
    getSelectors: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "getSelectors", args, false, 600),
    getTemplate: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "getTemplate", args, false, 5),
    isTemplateActive: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "isTemplateActive", args, false, 5),
    },
    write: {
    createLicenseFromTemplate: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseTemplateFacet", "createLicenseFromTemplate", args),
    createTemplate: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseTemplateFacet", "createTemplate", args),
    setTemplateStatus: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseTemplateFacet", "setTemplateStatus", args),
    updateTemplate: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseTemplateFacet", "updateTemplate", args),
    },
    events: {
    LicenseCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseTemplateFacet", "LicenseCreated", fromBlock, toBlock) },
    TemplateUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseTemplateFacet", "TemplateUpdated", fromBlock, toBlock) },
    },
  };
}
