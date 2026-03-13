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
  setOperationConfigRequestSchemas,
  submitTransactionRequestSchemas,
  actionExecutedEventQueryRequestSchema,
  batchCompletedEventQueryRequestSchema,
  multiSigOperationCancelledEventQueryRequestSchema,
  operationApprovedEventQueryRequestSchema,
  operationExecutedEventQueryRequestSchema,
  operationProposedEventQueryRequestSchema,
  operationStatusChangedEventQueryRequestSchema,
} from "./schemas.js";

export type AddOperationTypePath = import("zod").infer<typeof addOperationTypeRequestSchemas.path>;
export type AddOperationTypeQuery = import("zod").infer<typeof addOperationTypeRequestSchemas.query>;
export type AddOperationTypeBody = import("zod").infer<typeof addOperationTypeRequestSchemas.body>;
export type AddOperatorPath = import("zod").infer<typeof addOperatorRequestSchemas.path>;
export type AddOperatorQuery = import("zod").infer<typeof addOperatorRequestSchemas.query>;
export type AddOperatorBody = import("zod").infer<typeof addOperatorRequestSchemas.body>;
export type ApproveOperationPath = import("zod").infer<typeof approveOperationRequestSchemas.path>;
export type ApproveOperationQuery = import("zod").infer<typeof approveOperationRequestSchemas.query>;
export type ApproveOperationBody = import("zod").infer<typeof approveOperationRequestSchemas.body>;
export type CancelOperationPath = import("zod").infer<typeof cancelOperationRequestSchemas.path>;
export type CancelOperationQuery = import("zod").infer<typeof cancelOperationRequestSchemas.query>;
export type CancelOperationBody = import("zod").infer<typeof cancelOperationRequestSchemas.body>;
export type CanExecuteOperationPath = import("zod").infer<typeof canExecuteOperationRequestSchemas.path>;
export type CanExecuteOperationQuery = import("zod").infer<typeof canExecuteOperationRequestSchemas.query>;
export type CanExecuteOperationBody = import("zod").infer<typeof canExecuteOperationRequestSchemas.body>;
export type ExecutePath = import("zod").infer<typeof executeRequestSchemas.path>;
export type ExecuteQuery = import("zod").infer<typeof executeRequestSchemas.query>;
export type ExecuteBody = import("zod").infer<typeof executeRequestSchemas.body>;
export type ExecuteOperationPath = import("zod").infer<typeof executeOperationRequestSchemas.path>;
export type ExecuteOperationQuery = import("zod").infer<typeof executeOperationRequestSchemas.query>;
export type ExecuteOperationBody = import("zod").infer<typeof executeOperationRequestSchemas.body>;
export type GetOperationConfigPath = import("zod").infer<typeof getOperationConfigRequestSchemas.path>;
export type GetOperationConfigQuery = import("zod").infer<typeof getOperationConfigRequestSchemas.query>;
export type GetOperationConfigBody = import("zod").infer<typeof getOperationConfigRequestSchemas.body>;
export type GetOperationStatusPath = import("zod").infer<typeof getOperationStatusRequestSchemas.path>;
export type GetOperationStatusQuery = import("zod").infer<typeof getOperationStatusRequestSchemas.query>;
export type GetOperationStatusBody = import("zod").infer<typeof getOperationStatusRequestSchemas.body>;
export type HasApprovedOperationPath = import("zod").infer<typeof hasApprovedOperationRequestSchemas.path>;
export type HasApprovedOperationQuery = import("zod").infer<typeof hasApprovedOperationRequestSchemas.query>;
export type HasApprovedOperationBody = import("zod").infer<typeof hasApprovedOperationRequestSchemas.body>;
export type IsOperatorPath = import("zod").infer<typeof isOperatorRequestSchemas.path>;
export type IsOperatorQuery = import("zod").infer<typeof isOperatorRequestSchemas.query>;
export type IsOperatorBody = import("zod").infer<typeof isOperatorRequestSchemas.body>;
export type MuSetPausedPath = import("zod").infer<typeof muSetPausedRequestSchemas.path>;
export type MuSetPausedQuery = import("zod").infer<typeof muSetPausedRequestSchemas.query>;
export type MuSetPausedBody = import("zod").infer<typeof muSetPausedRequestSchemas.body>;
export type ProposeOperationPath = import("zod").infer<typeof proposeOperationRequestSchemas.path>;
export type ProposeOperationQuery = import("zod").infer<typeof proposeOperationRequestSchemas.query>;
export type ProposeOperationBody = import("zod").infer<typeof proposeOperationRequestSchemas.body>;
export type RemoveOperatorPath = import("zod").infer<typeof removeOperatorRequestSchemas.path>;
export type RemoveOperatorQuery = import("zod").infer<typeof removeOperatorRequestSchemas.query>;
export type RemoveOperatorBody = import("zod").infer<typeof removeOperatorRequestSchemas.body>;
export type SetOperationConfigPath = import("zod").infer<typeof setOperationConfigRequestSchemas.path>;
export type SetOperationConfigQuery = import("zod").infer<typeof setOperationConfigRequestSchemas.query>;
export type SetOperationConfigBody = import("zod").infer<typeof setOperationConfigRequestSchemas.body>;
export type SubmitTransactionPath = import("zod").infer<typeof submitTransactionRequestSchemas.path>;
export type SubmitTransactionQuery = import("zod").infer<typeof submitTransactionRequestSchemas.query>;
export type SubmitTransactionBody = import("zod").infer<typeof submitTransactionRequestSchemas.body>;
export type ActionExecutedEventQueryBody = import("zod").infer<typeof actionExecutedEventQueryRequestSchema.body>;
export type BatchCompletedEventQueryBody = import("zod").infer<typeof batchCompletedEventQueryRequestSchema.body>;
export type MultiSigOperationCancelledEventQueryBody = import("zod").infer<typeof multiSigOperationCancelledEventQueryRequestSchema.body>;
export type OperationApprovedEventQueryBody = import("zod").infer<typeof operationApprovedEventQueryRequestSchema.body>;
export type OperationExecutedEventQueryBody = import("zod").infer<typeof operationExecutedEventQueryRequestSchema.body>;
export type OperationProposedEventQueryBody = import("zod").infer<typeof operationProposedEventQueryRequestSchema.body>;
export type OperationStatusChangedEventQueryBody = import("zod").infer<typeof operationStatusChangedEventQueryRequestSchema.body>;
