import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createRightsFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "RightsFacet" as const,
    read: {
    getCategoryContracts: (...args: unknown[]) => invokeRead(context, "RightsFacet", "getCategoryContracts", args, false, null),
    getCollaborator: (...args: unknown[]) => invokeRead(context, "RightsFacet", "getCollaborator", args, false, null),
    getRightCategory: (...args: unknown[]) => invokeRead(context, "RightsFacet", "getRightCategory", args, false, null),
    getRightContract: (...args: unknown[]) => invokeRead(context, "RightsFacet", "getRightContract", args, false, null),
    getRightsGroup: (...args: unknown[]) => invokeRead(context, "RightsFacet", "getRightsGroup", args, false, null),
    getUserRights: (...args: unknown[]) => invokeRead(context, "RightsFacet", "getUserRights", args, false, null),
    rightIdExists: (...args: unknown[]) => invokeRead(context, "RightsFacet", "rightIdExists", args, false, null),
    },
    write: {
    addCollaborator: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "addCollaborator", args),
    createRightsGroup: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "createRightsGroup", args),
    grantRight: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "grantRight", args),
    registerRightContract: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "registerRightContract", args),
    removeCollaborator: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "removeCollaborator", args),
    revokeRight: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "revokeRight", args),
    updateCollaboratorShare: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "updateCollaboratorShare", args),
    updateRightContract: (...args: unknown[]) => invokeWrite(context, "RightsFacet", "updateRightContract", args),
    },
    events: {
    CollaboratorUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "RightsFacet", "CollaboratorUpdated", fromBlock, toBlock) },
    RightContractRegistered: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "RightsFacet", "RightContractRegistered", fromBlock, toBlock) },
    RightContractUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "RightsFacet", "RightContractUpdated", fromBlock, toBlock) },
    RightGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "RightsFacet", "RightGranted", fromBlock, toBlock) },
    RightRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "RightsFacet", "RightRevoked", fromBlock, toBlock) },
    RightsGroupCreated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "RightsFacet", "RightsGroupCreated", fromBlock, toBlock) },
    },
  };
}
