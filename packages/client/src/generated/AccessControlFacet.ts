import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createAccessControlFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "AccessControlFacet" as const,
    read: {
    debugRoleIndexState: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "debugRoleIndexState", args, false, 5),
    getOwnerOperationalRoles: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getOwnerOperationalRoles", args, false, 5),
    getQuorum: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getQuorum", args, false, 5),
    getRequiredSigners: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getRequiredSigners", args, false, 5),
    getRoleAdmin: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getRoleAdmin", args, false, 600),
    getRoleConfig: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getRoleConfig", args, false, 600),
    getRoleMember: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getRoleMember", args, false, 600),
    getRoleMembers: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getRoleMembers", args, false, 600),
    getUserRoles: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "getUserRoles", args, false, 5),
    hasAllParticipantRoles: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "hasAllParticipantRoles", args, false, 5),
    hasRole: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "hasRole", args, false, 5),
    isFounderSunsetActive: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "isFounderSunsetActive", args, false, 5),
    isRoleActive: (...args: unknown[]) => invokeRead(context, "AccessControlFacet", "isRoleActive", args, false, 5),
    },
    write: {
    emergencyForceAdd: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "emergencyForceAdd", args),
    executeFounderSunset: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "executeFounderSunset", args),
    grantRole: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "grantRole", args),
    renounceRole: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "renounceRole", args),
    revokeRole: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "revokeRole", args),
    scheduleFounderSunset: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "scheduleFounderSunset", args),
    setDefaultValidityPeriod: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "setDefaultValidityPeriod", args),
    setMinValidations: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "setMinValidations", args),
    setPaused: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "setPaused", args),
    setRecoveryActive: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "setRecoveryActive", args),
    setRoleAdmin: (...args: unknown[]) => invokeWrite(context, "AccessControlFacet", "setRoleAdmin", args),
    },
    events: {
    AccessAttempt: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "AccessAttempt", fromBlock, toBlock) },
    DAOMemberRoleGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "DAOMemberRoleGranted", fromBlock, toBlock) },
    FounderSunsetExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "FounderSunsetExecuted", fromBlock, toBlock) },
    FounderSunsetScheduled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "FounderSunsetScheduled", fromBlock, toBlock) },
    GovernanceParticipantRoleGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "GovernanceParticipantRoleGranted", fromBlock, toBlock) },
    MarketplacePurchaserRoleGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "MarketplacePurchaserRoleGranted", fromBlock, toBlock) },
    MarketplaceSellerRoleGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "MarketplaceSellerRoleGranted", fromBlock, toBlock) },
    ParticipantRoleRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "ParticipantRoleRevoked", fromBlock, toBlock) },
    ResearchParticipantRoleGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "ResearchParticipantRoleGranted", fromBlock, toBlock) },
    RoleAdminChanged: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "RoleAdminChanged", fromBlock, toBlock) },
    RoleConfigUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "RoleConfigUpdated", fromBlock, toBlock) },
    RoleGranted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "RoleGranted", fromBlock, toBlock) },
    RoleRenounced: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "RoleRenounced", fromBlock, toBlock) },
    RoleRevoked: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "RoleRevoked", fromBlock, toBlock) },
    SecurityAction: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "AccessControlFacet", "SecurityAction", fromBlock, toBlock) },
    },
  };
}
