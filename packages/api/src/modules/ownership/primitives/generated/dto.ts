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

export type AcceptOwnershipPath = import("zod").infer<typeof acceptOwnershipRequestSchemas.path>;
export type AcceptOwnershipQuery = import("zod").infer<typeof acceptOwnershipRequestSchemas.query>;
export type AcceptOwnershipBody = import("zod").infer<typeof acceptOwnershipRequestSchemas.body>;
export type CancelOwnershipTransferPath = import("zod").infer<typeof cancelOwnershipTransferRequestSchemas.path>;
export type CancelOwnershipTransferQuery = import("zod").infer<typeof cancelOwnershipTransferRequestSchemas.query>;
export type CancelOwnershipTransferBody = import("zod").infer<typeof cancelOwnershipTransferRequestSchemas.body>;
export type IsOwnershipPolicyEnforcedPath = import("zod").infer<typeof isOwnershipPolicyEnforcedRequestSchemas.path>;
export type IsOwnershipPolicyEnforcedQuery = import("zod").infer<typeof isOwnershipPolicyEnforcedRequestSchemas.query>;
export type IsOwnershipPolicyEnforcedBody = import("zod").infer<typeof isOwnershipPolicyEnforcedRequestSchemas.body>;
export type IsOwnerTargetApprovedPath = import("zod").infer<typeof isOwnerTargetApprovedRequestSchemas.path>;
export type IsOwnerTargetApprovedQuery = import("zod").infer<typeof isOwnerTargetApprovedRequestSchemas.query>;
export type IsOwnerTargetApprovedBody = import("zod").infer<typeof isOwnerTargetApprovedRequestSchemas.body>;
export type OwnerPath = import("zod").infer<typeof ownerRequestSchemas.path>;
export type OwnerQuery = import("zod").infer<typeof ownerRequestSchemas.query>;
export type OwnerBody = import("zod").infer<typeof ownerRequestSchemas.body>;
export type PendingOwnerPath = import("zod").infer<typeof pendingOwnerRequestSchemas.path>;
export type PendingOwnerQuery = import("zod").infer<typeof pendingOwnerRequestSchemas.query>;
export type PendingOwnerBody = import("zod").infer<typeof pendingOwnerRequestSchemas.body>;
export type ProposeOwnershipTransferPath = import("zod").infer<typeof proposeOwnershipTransferRequestSchemas.path>;
export type ProposeOwnershipTransferQuery = import("zod").infer<typeof proposeOwnershipTransferRequestSchemas.query>;
export type ProposeOwnershipTransferBody = import("zod").infer<typeof proposeOwnershipTransferRequestSchemas.body>;
export type SetApprovedOwnerTargetPath = import("zod").infer<typeof setApprovedOwnerTargetRequestSchemas.path>;
export type SetApprovedOwnerTargetQuery = import("zod").infer<typeof setApprovedOwnerTargetRequestSchemas.query>;
export type SetApprovedOwnerTargetBody = import("zod").infer<typeof setApprovedOwnerTargetRequestSchemas.body>;
export type SetOwnershipPolicyEnforcedPath = import("zod").infer<typeof setOwnershipPolicyEnforcedRequestSchemas.path>;
export type SetOwnershipPolicyEnforcedQuery = import("zod").infer<typeof setOwnershipPolicyEnforcedRequestSchemas.query>;
export type SetOwnershipPolicyEnforcedBody = import("zod").infer<typeof setOwnershipPolicyEnforcedRequestSchemas.body>;
export type TransferOwnershipPath = import("zod").infer<typeof transferOwnershipRequestSchemas.path>;
export type TransferOwnershipQuery = import("zod").infer<typeof transferOwnershipRequestSchemas.query>;
export type TransferOwnershipBody = import("zod").infer<typeof transferOwnershipRequestSchemas.body>;
export type OwnershipPolicyEnforcementSetEventQueryBody = import("zod").infer<typeof ownershipPolicyEnforcementSetEventQueryRequestSchema.body>;
export type OwnershipTargetApprovalSetEventQueryBody = import("zod").infer<typeof ownershipTargetApprovalSetEventQueryRequestSchema.body>;
export type OwnershipTransferCancelledEventQueryBody = import("zod").infer<typeof ownershipTransferCancelledEventQueryRequestSchema.body>;
export type OwnershipTransferProposedEventQueryBody = import("zod").infer<typeof ownershipTransferProposedEventQueryRequestSchema.body>;
export type OwnershipTransferredEventQueryBody = import("zod").infer<typeof ownershipTransferredEventQueryRequestSchema.body>;
