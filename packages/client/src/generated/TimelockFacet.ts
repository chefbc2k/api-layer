import { invokeRead, invokeWrite, queryEvent } from "../runtime/invoke.js";
import type { FacetWrapperContext } from "../types.js";

export function createTimelockFacetWrapper(context: FacetWrapperContext) {
  return {
    facetName: "TimelockFacet" as const,
    read: {
    EXECUTOR_ROLE: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "EXECUTOR_ROLE", args, false, 5),
    PROPOSER_ROLE: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "PROPOSER_ROLE", args, false, 5),
    getMinDelay: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "getMinDelay", args, false, 600),
    getOperation: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "getOperation", args, false, 30),
    getTimestamp: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "getTimestamp", args, false, 5),
    isOperationExecuted: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "isOperationExecuted", args, false, 5),
    isOperationPending: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "isOperationPending", args, false, 5),
    isOperationReady: (...args: unknown[]) => invokeRead(context, "TimelockFacet", "isOperationReady", args, false, 5),
    },
    write: {
    cancel: (...args: unknown[]) => invokeWrite(context, "TimelockFacet", "cancel", args),
    execute: (...args: unknown[]) => invokeWrite(context, "TimelockFacet", "execute", args),
    schedule: (...args: unknown[]) => invokeWrite(context, "TimelockFacet", "schedule", args),
    updateMinDelay: (...args: unknown[]) => invokeWrite(context, "TimelockFacet", "updateMinDelay", args),
    },
    events: {
    CallExecuted: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "CallExecuted", fromBlock, toBlock) },
    "MinDelayUpdated(uint256,uint256)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "MinDelayUpdated(uint256,uint256)", fromBlock, toBlock) },
    "OperationExecuted(bytes32,uint256,uint256)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "OperationExecuted(bytes32,uint256,uint256)", fromBlock, toBlock) },
    "OperationExecuted(bytes32)": { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "OperationExecuted(bytes32)", fromBlock, toBlock) },
    OperationRemoved: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "OperationRemoved", fromBlock, toBlock) },
    OperationScheduled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "OperationScheduled", fromBlock, toBlock) },
    OperationStored: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "OperationStored", fromBlock, toBlock) },
    TimelockOperationCanceled: { query: (fromBlock?: bigint | number, toBlock?: bigint | number | "latest") => queryEvent(context, "TimelockFacet", "TimelockOperationCanceled", fromBlock, toBlock) },
    },
  };
}
