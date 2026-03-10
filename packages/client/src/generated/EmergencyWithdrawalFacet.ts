import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createEmergencyWithdrawalFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "EmergencyWithdrawalFacet" as const,
    read: {
    getApprovalCount: (...args: unknown[]) => invokeRead(context, "EmergencyWithdrawalFacet", "getApprovalCount", args, false, 5),
    isRecipientWhitelisted: (...args: unknown[]) => invokeRead(context, "EmergencyWithdrawalFacet", "isRecipientWhitelisted", args, false, 5),
    },
    write: {
    approveEmergencyWithdrawal: (...args: unknown[]) => invokeWrite(context, "EmergencyWithdrawalFacet", "approveEmergencyWithdrawal", args),
    executeWithdrawal: (...args: unknown[]) => invokeWrite(context, "EmergencyWithdrawalFacet", "executeWithdrawal", args),
    requestEmergencyWithdrawal: (...args: unknown[]) => invokeWrite(context, "EmergencyWithdrawalFacet", "requestEmergencyWithdrawal", args),
    setRecipientWhitelist: (...args: unknown[]) => invokeWrite(context, "EmergencyWithdrawalFacet", "setRecipientWhitelist", args),
    updateWithdrawalConfig: (...args: unknown[]) => invokeWrite(context, "EmergencyWithdrawalFacet", "updateWithdrawalConfig", args),
    },
    events: {
    EmergencyEthWithdrawalApproved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyEthWithdrawalApproved", fromBlock, toBlock) },
    EmergencyEthWithdrawalExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyEthWithdrawalExecuted", fromBlock, toBlock) },
    EmergencyEthWithdrawalRequested: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyEthWithdrawalRequested", fromBlock, toBlock) },
    EmergencyWithdrawal: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyWithdrawal", fromBlock, toBlock) },
    EmergencyWithdrawalApproved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyWithdrawalApproved", fromBlock, toBlock) },
    EmergencyWithdrawalExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyWithdrawalExecuted", fromBlock, toBlock) },
    EmergencyWithdrawalRequested: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "EmergencyWithdrawalRequested", fromBlock, toBlock) },
    RecipientWhitelisted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "RecipientWhitelisted", fromBlock, toBlock) },
    WithdrawalConfigUpdated: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "EmergencyWithdrawalFacet", "WithdrawalConfigUpdated", fromBlock, toBlock) },
    },
  };
}
