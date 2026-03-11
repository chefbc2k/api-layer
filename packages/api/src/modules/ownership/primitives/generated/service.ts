import type { ApiExecutionContext } from "../../../../shared/execution-context.js";
import { executeHttpEventDefinition, executeHttpMethodDefinition } from "../../../../shared/execution-context.js";
import type { EventInvocationRequest, PrimitiveInvocationRequest } from "../../../../shared/route-types.js";
import { ownershipEventDefinitions, ownershipMethodDefinitions } from "./mapping.js";

export function createOwnershipPrimitiveService(context: ApiExecutionContext) {
  return {
    acceptOwnership: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "acceptOwnership")!, request),
    cancelOwnershipTransfer: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "cancelOwnershipTransfer")!, request),
    isOwnershipPolicyEnforced: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnershipPolicyEnforced")!, request),
    isOwnerTargetApproved: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnerTargetApproved")!, request),
    owner: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "owner")!, request),
    pendingOwner: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "pendingOwner")!, request),
    proposeOwnershipTransfer: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "proposeOwnershipTransfer")!, request),
    setApprovedOwnerTarget: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "setApprovedOwnerTarget")!, request),
    setOwnershipPolicyEnforced: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "setOwnershipPolicyEnforced")!, request),
    transferOwnership: (request: PrimitiveInvocationRequest) => executeHttpMethodDefinition(context, ownershipMethodDefinitions.find((definition) => definition.operationId === "transferOwnership")!, request),
    ownershipPolicyEnforcementSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipPolicyEnforcementSetEventQuery")!, request),
    ownershipTargetApprovalSetEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTargetApprovalSetEventQuery")!, request),
    ownershipTransferCancelledEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferCancelledEventQuery")!, request),
    ownershipTransferProposedEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferProposedEventQuery")!, request),
    ownershipTransferredEventQuery: (request: EventInvocationRequest) => executeHttpEventDefinition(context, ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferredEventQuery")!, request),
  };
}
