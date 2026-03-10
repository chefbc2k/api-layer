import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createOwnershipFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "OwnershipFacet" as const,
    read: {
    isOwnerTargetApproved: (...args: unknown[]) => invokeRead(context, "OwnershipFacet", "isOwnerTargetApproved", args, true, null),
    isOwnershipPolicyEnforced: (...args: unknown[]) => invokeRead(context, "OwnershipFacet", "isOwnershipPolicyEnforced", args, false, 5),
    owner: (...args: unknown[]) => invokeRead(context, "OwnershipFacet", "owner", args, false, 5),
    pendingOwner: (...args: unknown[]) => invokeRead(context, "OwnershipFacet", "pendingOwner", args, false, 5),
    },
    write: {
    acceptOwnership: (...args: unknown[]) => invokeWrite(context, "OwnershipFacet", "acceptOwnership", args),
    cancelOwnershipTransfer: (...args: unknown[]) => invokeWrite(context, "OwnershipFacet", "cancelOwnershipTransfer", args),
    proposeOwnershipTransfer: (...args: unknown[]) => invokeWrite(context, "OwnershipFacet", "proposeOwnershipTransfer", args),
    setApprovedOwnerTarget: (...args: unknown[]) => invokeWrite(context, "OwnershipFacet", "setApprovedOwnerTarget", args),
    setOwnershipPolicyEnforced: (...args: unknown[]) => invokeWrite(context, "OwnershipFacet", "setOwnershipPolicyEnforced", args),
    transferOwnership: (...args: unknown[]) => invokeWrite(context, "OwnershipFacet", "transferOwnership", args),
    },
    events: {
    OwnershipPolicyEnforcementSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "OwnershipFacet", "OwnershipPolicyEnforcementSet", fromBlock, toBlock) },
    OwnershipTargetApprovalSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "OwnershipFacet", "OwnershipTargetApprovalSet", fromBlock, toBlock) },
    OwnershipTransferCancelled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "OwnershipFacet", "OwnershipTransferCancelled", fromBlock, toBlock) },
    OwnershipTransferProposed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "OwnershipFacet", "OwnershipTransferProposed", fromBlock, toBlock) },
    OwnershipTransferred: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "OwnershipFacet", "OwnershipTransferred", fromBlock, toBlock) },
    },
  };
}
