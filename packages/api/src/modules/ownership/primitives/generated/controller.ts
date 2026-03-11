import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { createEventRequestHandler, createMethodRequestHandler } from "../../../../shared/route-factory.js";
import { createOwnershipPrimitiveService } from "./service.js";
import {
  acceptOwnershipRequestSchemas,
  cancelOwnershipTransferRequestSchemas,
  isOwnershipPolicyEnforcedRequestSchemas,
  isOwnerTargetApprovedRequestSchemas,
  ownerRequestSchemas,
  pendingOwnerRequestSchemas,
  proposeOwnershipTransferRequestSchemas,
  setApprovedOwnerTargetRequestSchemas,
  setOwnershipPolicyEnforcedRequestSchemas,
  transferOwnershipRequestSchemas,
  ownershipPolicyEnforcementSetEventQueryRequestSchema,
  ownershipTargetApprovalSetEventQueryRequestSchema,
  ownershipTransferCancelledEventQueryRequestSchema,
  ownershipTransferProposedEventQueryRequestSchema,
  ownershipTransferredEventQueryRequestSchema,
} from "./schemas.js";
import { ownershipEventDefinitions, ownershipMethodDefinitions } from "./mapping.js";

export function createOwnershipPrimitiveController(context: ApiExecutionContext): Record<string, import("express").RequestHandler> {
  const service = createOwnershipPrimitiveService(context);
  return {
    acceptOwnership: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "acceptOwnership")!, acceptOwnershipRequestSchemas, service.acceptOwnership),
    cancelOwnershipTransfer: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "cancelOwnershipTransfer")!, cancelOwnershipTransferRequestSchemas, service.cancelOwnershipTransfer),
    isOwnershipPolicyEnforced: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnershipPolicyEnforced")!, isOwnershipPolicyEnforcedRequestSchemas, service.isOwnershipPolicyEnforced),
    isOwnerTargetApproved: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnerTargetApproved")!, isOwnerTargetApprovedRequestSchemas, service.isOwnerTargetApproved),
    owner: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "owner")!, ownerRequestSchemas, service.owner),
    pendingOwner: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "pendingOwner")!, pendingOwnerRequestSchemas, service.pendingOwner),
    proposeOwnershipTransfer: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "proposeOwnershipTransfer")!, proposeOwnershipTransferRequestSchemas, service.proposeOwnershipTransfer),
    setApprovedOwnerTarget: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "setApprovedOwnerTarget")!, setApprovedOwnerTargetRequestSchemas, service.setApprovedOwnerTarget),
    setOwnershipPolicyEnforced: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "setOwnershipPolicyEnforced")!, setOwnershipPolicyEnforcedRequestSchemas, service.setOwnershipPolicyEnforced),
    transferOwnership: createMethodRequestHandler(ownershipMethodDefinitions.find((definition) => definition.operationId === "transferOwnership")!, transferOwnershipRequestSchemas, service.transferOwnership),
    ownershipPolicyEnforcementSetEventQuery: createEventRequestHandler(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipPolicyEnforcementSetEventQuery")!, ownershipPolicyEnforcementSetEventQueryRequestSchema, service.ownershipPolicyEnforcementSetEventQuery),
    ownershipTargetApprovalSetEventQuery: createEventRequestHandler(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTargetApprovalSetEventQuery")!, ownershipTargetApprovalSetEventQueryRequestSchema, service.ownershipTargetApprovalSetEventQuery),
    ownershipTransferCancelledEventQuery: createEventRequestHandler(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferCancelledEventQuery")!, ownershipTransferCancelledEventQueryRequestSchema, service.ownershipTransferCancelledEventQuery),
    ownershipTransferProposedEventQuery: createEventRequestHandler(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferProposedEventQuery")!, ownershipTransferProposedEventQueryRequestSchema, service.ownershipTransferProposedEventQuery),
    ownershipTransferredEventQuery: createEventRequestHandler(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferredEventQuery")!, ownershipTransferredEventQueryRequestSchema, service.ownershipTransferredEventQuery),
  };
}
