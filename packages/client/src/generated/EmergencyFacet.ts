import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createEmergencyFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "EmergencyFacet" as const,
    read: {
    getEmergencyState: (...args: unknown[]) => invokeRead(context, "EmergencyFacet", "getEmergencyState", args, false, 5),
    getEmergencyTimeout: (...args: unknown[]) => invokeRead(context, "EmergencyFacet", "getEmergencyTimeout", args, false, 5),
    getIncident: (...args: unknown[]) => invokeRead(context, "EmergencyFacet", "getIncident", args, false, 5),
    getRecoveryPlan: (...args: unknown[]) => invokeRead(context, "EmergencyFacet", "getRecoveryPlan", args, false, 5),
    isAssetFrozen: (...args: unknown[]) => invokeRead(context, "EmergencyFacet", "isAssetFrozen", args, false, 5),
    isEmergencyStopped: (...args: unknown[]) => invokeRead(context, "EmergencyFacet", "isEmergencyStopped", args, false, 5),
    },
    write: {
    approveRecovery: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "approveRecovery", args),
    completeRecovery: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "completeRecovery", args),
    emergencyResume: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "emergencyResume", args),
    emergencyStop: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "emergencyStop", args),
    executeRecoveryAction: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "executeRecoveryAction", args),
    executeRecoveryStep: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "executeRecoveryStep", args),
    executeResponse: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "executeResponse", args),
    executeScheduledResume: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "executeScheduledResume", args),
    extendPausedUntil: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "extendPausedUntil", args),
    freezeAssets: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "freezeAssets", args),
    reportIncident: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "reportIncident", args),
    scheduleEmergencyResume: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "scheduleEmergencyResume", args),
    setEmergencyTimeout: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "setEmergencyTimeout", args),
    setResumeDelay: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "setResumeDelay", args),
    startRecovery: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "startRecovery", args),
    triggerEmergency: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "triggerEmergency", args),
    unfreezeAssets: (...args: unknown[]) => invokeWrite(context, "EmergencyFacet", "unfreezeAssets", args),
    },
    events: {
    AssetsFrozen: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "AssetsFrozen", fromBlock, toBlock) },
    EmergencyResumeExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "EmergencyResumeExecuted", fromBlock, toBlock) },
    EmergencyResumeScheduled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "EmergencyResumeScheduled", fromBlock, toBlock) },
    EmergencyStateChanged: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "EmergencyStateChanged", fromBlock, toBlock) },
    IncidentReported: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "IncidentReported", fromBlock, toBlock) },
    PauseExtended: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "PauseExtended", fromBlock, toBlock) },
    RecoveryCompleted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "RecoveryCompleted", fromBlock, toBlock) },
    RecoveryStarted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "RecoveryStarted", fromBlock, toBlock) },
    RecoveryStepExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "RecoveryStepExecuted", fromBlock, toBlock) },
    ResponseExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyFacet", "ResponseExecuted", fromBlock, toBlock) },
    },
  };
}
