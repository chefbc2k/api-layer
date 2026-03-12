import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createVoiceLicenseTemplateFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "VoiceLicenseTemplateFacet" as const,
    read: {
    getCreatorTemplates: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "getCreatorTemplates", args, false, 5),
    getTemplate: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "getTemplate", args, false, 5),
    isTemplateActive: (...args: unknown[]) => invokeRead(context, "VoiceLicenseTemplateFacet", "isTemplateActive", args, false, 5),
    },
    write: {
    setTemplateStatus: (...args: unknown[]) => invokeWrite(context, "VoiceLicenseTemplateFacet", "setTemplateStatus", args),
    },
    events: {
    LicenseCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseTemplateFacet", "LicenseCreated", fromBlock, toBlock) },
    TemplateUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "VoiceLicenseTemplateFacet", "TemplateUpdated", fromBlock, toBlock) },
    },
  };
}
