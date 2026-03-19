import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createMultiSigFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "MultiSigFacet" as const,
    read: {
    canExecuteOperation: (...args: unknown[]) => invokeRead(context, "MultiSigFacet", "canExecuteOperation", args, false, 5),
    getOperation: (...args: unknown[]) => invokeRead(context, "MultiSigFacet", "getOperation", args, false, null),
    getOperationConfig: (...args: unknown[]) => invokeRead(context, "MultiSigFacet", "getOperationConfig", args, false, 30),
    getOperationStatus: (...args: unknown[]) => invokeRead(context, "MultiSigFacet", "getOperationStatus", args, false, 30),
    hasApprovedOperation: (...args: unknown[]) => invokeRead(context, "MultiSigFacet", "hasApprovedOperation", args, true, null),
    isOperator: (...args: unknown[]) => invokeRead(context, "MultiSigFacet", "isOperator", args, false, 5),
    },
    write: {
    addOperationType: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "addOperationType", args),
    addOperator: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "addOperator", args),
    approveOperation: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "approveOperation", args),
    cancelOperation: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "cancelOperation", args),
    execute: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "execute", args),
    executeOperation: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "executeOperation", args),
    muSetPaused: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "muSetPaused", args),
    proposeOperation: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "proposeOperation", args),
    removeOperator: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "removeOperator", args),
    setOperationConfig: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "setOperationConfig", args),
    submitTransaction: (...args: unknown[]) => invokeWrite(context, "MultiSigFacet", "submitTransaction", args),
    },
    events: {
    ActionExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "ActionExecuted", fromBlock, toBlock) },
    BatchCompleted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "BatchCompleted", fromBlock, toBlock) },
    MultiSigOperationCancelled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "MultiSigOperationCancelled", fromBlock, toBlock) },
    OperationApproved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "OperationApproved", fromBlock, toBlock) },
    OperationExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "OperationExecuted", fromBlock, toBlock) },
    OperationProposed: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "OperationProposed", fromBlock, toBlock) },
    OperationStatusChanged: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "MultiSigFacet", "OperationStatusChanged", fromBlock, toBlock) },
    },
  };
}
