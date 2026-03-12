import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { createEventRequestHandler, createMethodRequestHandler } from "../../../../shared/route-factory.js";
import { createMultisigPrimitiveService } from "./service.js";
import {
  addOperationTypeRequestSchemas,
  addOperatorRequestSchemas,
  approveOperationRequestSchemas,
  cancelOperationRequestSchemas,
  canExecuteOperationRequestSchemas,
  executeRequestSchemas,
  executeOperationRequestSchemas,
  getOperationConfigRequestSchemas,
  getOperationStatusRequestSchemas,
  hasApprovedOperationRequestSchemas,
  isOperatorRequestSchemas,
  muSetPausedRequestSchemas,
  proposeOperationRequestSchemas,
  removeOperatorRequestSchemas,
  submitTransactionRequestSchemas,
  actionExecutedEventQueryRequestSchema,
  batchCompletedEventQueryRequestSchema,
  multiSigOperationCancelledEventQueryRequestSchema,
  operationApprovedEventQueryRequestSchema,
  operationExecutedEventQueryRequestSchema,
  operationProposedEventQueryRequestSchema,
  operationStatusChangedEventQueryRequestSchema,
} from "./schemas.js";
import { multisigEventDefinitions, multisigMethodDefinitions } from "./mapping.js";

export function createMultisigPrimitiveController(context: ApiExecutionContext): Record<string, import("express").RequestHandler> {
  const service = createMultisigPrimitiveService(context);
  return {
    addOperationType: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "addOperationType")!, addOperationTypeRequestSchemas, service.addOperationType),
    addOperator: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "addOperator")!, addOperatorRequestSchemas, service.addOperator),
    approveOperation: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "approveOperation")!, approveOperationRequestSchemas, service.approveOperation),
    cancelOperation: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "cancelOperation")!, cancelOperationRequestSchemas, service.cancelOperation),
    canExecuteOperation: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "canExecuteOperation")!, canExecuteOperationRequestSchemas, service.canExecuteOperation),
    execute: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "execute")!, executeRequestSchemas, service.execute),
    executeOperation: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "executeOperation")!, executeOperationRequestSchemas, service.executeOperation),
    getOperationConfig: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "getOperationConfig")!, getOperationConfigRequestSchemas, service.getOperationConfig),
    getOperationStatus: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "getOperationStatus")!, getOperationStatusRequestSchemas, service.getOperationStatus),
    hasApprovedOperation: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "hasApprovedOperation")!, hasApprovedOperationRequestSchemas, service.hasApprovedOperation),
    isOperator: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "isOperator")!, isOperatorRequestSchemas, service.isOperator),
    muSetPaused: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "muSetPaused")!, muSetPausedRequestSchemas, service.muSetPaused),
    proposeOperation: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "proposeOperation")!, proposeOperationRequestSchemas, service.proposeOperation),
    removeOperator: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "removeOperator")!, removeOperatorRequestSchemas, service.removeOperator),
    submitTransaction: createMethodRequestHandler(multisigMethodDefinitions.find((definition) => definition.operationId === "submitTransaction")!, submitTransactionRequestSchemas, service.submitTransaction),
    actionExecutedEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "actionExecutedEventQuery")!, actionExecutedEventQueryRequestSchema, service.actionExecutedEventQuery),
    batchCompletedEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "batchCompletedEventQuery")!, batchCompletedEventQueryRequestSchema, service.batchCompletedEventQuery),
    multiSigOperationCancelledEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "multiSigOperationCancelledEventQuery")!, multiSigOperationCancelledEventQueryRequestSchema, service.multiSigOperationCancelledEventQuery),
    operationApprovedEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "operationApprovedEventQuery")!, operationApprovedEventQueryRequestSchema, service.operationApprovedEventQuery),
    operationExecutedEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "operationExecutedEventQuery")!, operationExecutedEventQueryRequestSchema, service.operationExecutedEventQuery),
    operationProposedEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "operationProposedEventQuery")!, operationProposedEventQueryRequestSchema, service.operationProposedEventQuery),
    operationStatusChangedEventQuery: createEventRequestHandler(multisigEventDefinitions.find((definition) => definition.operationId === "operationStatusChangedEventQuery")!, operationStatusChangedEventQueryRequestSchema, service.operationStatusChangedEventQuery),
  };
}
