import { buildEventRequestSchema, buildMethodRequestSchemas } from "../../../../shared/validation.js";
import { ownershipEventDefinitions, ownershipMethodDefinitions } from "./mapping.js";

export const acceptOwnershipRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "acceptOwnership")!);
export const cancelOwnershipTransferRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "cancelOwnershipTransfer")!);
export const isOwnershipPolicyEnforcedRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnershipPolicyEnforced")!);
export const isOwnerTargetApprovedRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "isOwnerTargetApproved")!);
export const ownerRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "owner")!);
export const pendingOwnerRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "pendingOwner")!);
export const proposeOwnershipTransferRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "proposeOwnershipTransfer")!);
export const setApprovedOwnerTargetRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "setApprovedOwnerTarget")!);
export const setOwnershipPolicyEnforcedRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "setOwnershipPolicyEnforced")!);
export const transferOwnershipRequestSchemas = buildMethodRequestSchemas(ownershipMethodDefinitions.find((definition) => definition.operationId === "transferOwnership")!);
export const ownershipPolicyEnforcementSetEventQueryRequestSchema = buildEventRequestSchema(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipPolicyEnforcementSetEventQuery")!);
export const ownershipTargetApprovalSetEventQueryRequestSchema = buildEventRequestSchema(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTargetApprovalSetEventQuery")!);
export const ownershipTransferCancelledEventQueryRequestSchema = buildEventRequestSchema(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferCancelledEventQuery")!);
export const ownershipTransferProposedEventQueryRequestSchema = buildEventRequestSchema(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferProposedEventQuery")!);
export const ownershipTransferredEventQueryRequestSchema = buildEventRequestSchema(ownershipEventDefinitions.find((definition) => definition.operationId === "ownershipTransferredEventQuery")!);
