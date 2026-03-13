import { Router } from "express";

import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { registerRoute } from "../../../../shared/route-factory.js";
import { createMultisigPrimitiveController } from "./controller.js";
import { multisigEventDefinitions, multisigMethodDefinitions } from "./mapping.js";

export function createMultisigPrimitiveRouter(context: ApiExecutionContext): Router {
  const router = Router();
  const controller = createMultisigPrimitiveController(context);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "addOperationType")!, controller["addOperationType"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "addOperator")!, controller["addOperator"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "approveOperation")!, controller["approveOperation"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "cancelOperation")!, controller["cancelOperation"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "canExecuteOperation")!, controller["canExecuteOperation"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "execute")!, controller["execute"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "executeOperation")!, controller["executeOperation"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "getOperationConfig")!, controller["getOperationConfig"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "getOperationStatus")!, controller["getOperationStatus"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "hasApprovedOperation")!, controller["hasApprovedOperation"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "isOperator")!, controller["isOperator"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "muSetPaused")!, controller["muSetPaused"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "proposeOperation")!, controller["proposeOperation"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "removeOperator")!, controller["removeOperator"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "setOperationConfig")!, controller["setOperationConfig"]);
  registerRoute(router, multisigMethodDefinitions.find((definition) => definition.operationId === "submitTransaction")!, controller["submitTransaction"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "actionExecutedEventQuery")!, controller["actionExecutedEventQuery"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "batchCompletedEventQuery")!, controller["batchCompletedEventQuery"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "multiSigOperationCancelledEventQuery")!, controller["multiSigOperationCancelledEventQuery"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "operationApprovedEventQuery")!, controller["operationApprovedEventQuery"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "operationExecutedEventQuery")!, controller["operationExecutedEventQuery"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "operationProposedEventQuery")!, controller["operationProposedEventQuery"]);
  registerRoute(router, multisigEventDefinitions.find((definition) => definition.operationId === "operationStatusChangedEventQuery")!, controller["operationStatusChangedEventQuery"]);
  return router;
}
