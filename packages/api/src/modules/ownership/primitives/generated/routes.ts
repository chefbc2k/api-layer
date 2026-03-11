import { Router } from "express";

import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { registerRoute } from "../../../../shared/route-factory.js";
import { createOwnershipPrimitiveController } from "./controller.js";
import { ownershipEventDefinitions, ownershipMethodDefinitions } from "./mapping.js";

export function createOwnershipPrimitiveRouter(context: ApiExecutionContext): Router {
  const router = Router();
  const controller = createOwnershipPrimitiveController(context);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "acceptOwnership")!, controller["acceptOwnership"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "cancelOwnershipTransfer")!, controller["cancelOwnershipTransfer"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnershipPolicyEnforced")!, controller["isOwnershipPolicyEnforced"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnerTargetApproved")!, controller["isOwnerTargetApproved"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "owner")!, controller["owner"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "pendingOwner")!, controller["pendingOwner"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "proposeOwnershipTransfer")!, controller["proposeOwnershipTransfer"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "setApprovedOwnerTarget")!, controller["setApprovedOwnerTarget"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "setOwnershipPolicyEnforced")!, controller["setOwnershipPolicyEnforced"]);
  registerRoute(router, ownershipMethodDefinitions.find((definition) => definition.operationId === "transferOwnership")!, controller["transferOwnership"]);
  registerRoute(router, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipPolicyEnforcementSetEventQuery")!, controller["ownershipPolicyEnforcementSetEventQuery"]);
  registerRoute(router, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTargetApprovalSetEventQuery")!, controller["ownershipTargetApprovalSetEventQuery"]);
  registerRoute(router, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferCancelledEventQuery")!, controller["ownershipTransferCancelledEventQuery"]);
  registerRoute(router, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferProposedEventQuery")!, controller["ownershipTransferProposedEventQuery"]);
  registerRoute(router, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferredEventQuery")!, controller["ownershipTransferredEventQuery"]);
  return router;
}
