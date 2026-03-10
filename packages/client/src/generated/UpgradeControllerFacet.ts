import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createUpgradeControllerFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "UpgradeControllerFacet" as const,
    read: {
    getOperationalInvariants: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "getOperationalInvariants", args, false, 30),
    getUpgrade: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "getUpgrade", args, false, 5),
    getUpgradeControlStatus: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "getUpgradeControlStatus", args, false, 5),
    getUpgradeDelay: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "getUpgradeDelay", args, false, 5),
    getUpgradeThreshold: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "getUpgradeThreshold", args, false, 5),
    isUpgradeApproved: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "isUpgradeApproved", args, true, null),
    isUpgradeControlFrozen: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "isUpgradeControlFrozen", args, false, 5),
    isUpgradeSigner: (...args: unknown[]) => invokeRead(context, "UpgradeControllerFacet", "isUpgradeSigner", args, false, 5),
    },
    write: {
    approveUpgrade: (...args: unknown[]) => invokeWrite(context, "UpgradeControllerFacet", "approveUpgrade", args),
    executeUpgrade: (...args: unknown[]) => invokeWrite(context, "UpgradeControllerFacet", "executeUpgrade", args),
    freezeUpgradeControl: (...args: unknown[]) => invokeWrite(context, "UpgradeControllerFacet", "freezeUpgradeControl", args),
    initUpgradeController: (...args: unknown[]) => invokeWrite(context, "UpgradeControllerFacet", "initUpgradeController", args),
    proposeDiamondCut: (...args: unknown[]) => invokeWrite(context, "UpgradeControllerFacet", "proposeDiamondCut", args),
    setUpgradeControlEnforced: (...args: unknown[]) => invokeWrite(context, "UpgradeControllerFacet", "setUpgradeControlEnforced", args),
    },
    events: {
    UpgradeApproved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "UpgradeControllerFacet", "UpgradeApproved", fromBlock, toBlock) },
    UpgradeControlEnforcementSet: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "UpgradeControllerFacet", "UpgradeControlEnforcementSet", fromBlock, toBlock) },
    UpgradeControlFrozen: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "UpgradeControllerFacet", "UpgradeControlFrozen", fromBlock, toBlock) },
    UpgradeControllerInitialized: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "UpgradeControllerFacet", "UpgradeControllerInitialized", fromBlock, toBlock) },
    UpgradeExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "UpgradeControllerFacet", "UpgradeExecuted", fromBlock, toBlock) },
    UpgradeProposed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "UpgradeControllerFacet", "UpgradeProposed", fromBlock, toBlock) },
    },
  };
}
