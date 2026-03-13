import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { multisigEventDefinitions, multisigMethodDefinitions } from "./mapping.js";

export function createMultisigPrimitiveService(context: ApiExecutionContext) {
  return {
    addOperationType: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "addOperationType")!, request),
    addOperator: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "addOperator")!, request),
    approveOperation: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "approveOperation")!, request),
    cancelOperation: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "cancelOperation")!, request),
    canExecuteOperation: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "canExecuteOperation")!, request),
    execute: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "execute")!, request),
    executeOperation: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "executeOperation")!, request),
    getOperationConfig: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "getOperationConfig")!, request),
    getOperationStatus: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "getOperationStatus")!, request),
    hasApprovedOperation: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "hasApprovedOperation")!, request),
    isOperator: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "isOperator")!, request),
    muSetPaused: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "muSetPaused")!, request),
    proposeOperation: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "proposeOperation")!, request),
    removeOperator: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "removeOperator")!, request),
    setOperationConfig: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "setOperationConfig")!, request),
    submitTransaction: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, multisigMethodDefinitions.find((definition) => definition.operationId === "submitTransaction")!, request),
    actionExecutedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "actionExecutedEventQuery")!, request),
    batchCompletedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "batchCompletedEventQuery")!, request),
    multiSigOperationCancelledEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "multiSigOperationCancelledEventQuery")!, request),
    operationApprovedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "operationApprovedEventQuery")!, request),
    operationExecutedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "operationExecutedEventQuery")!, request),
    operationProposedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "operationProposedEventQuery")!, request),
    operationStatusChangedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, multisigEventDefinitions.find((definition) => definition.operationId === "operationStatusChangedEventQuery")!, request),
  };
}
