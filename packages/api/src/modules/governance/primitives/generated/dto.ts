import {
  cancelProposalRequestSchemas,
  getActiveProposalsRequestSchemas,
  getMinDelayRequestSchemas,
  getOperationRequestSchemas,
  getProposalTypeConfigRequestSchemas,
  getProposerProposalsRequestSchemas,
  getReceiptRequestSchemas,
  getRoleMultiplierRequestSchemas,
  getTimestampRequestSchemas,
  getVotingConfigRequestSchemas,
  governorGovernanceProposerRoleRequestSchemas,
  isOperationExecutedRequestSchemas,
  isOperationPendingRequestSchemas,
  isOperationReadyRequestSchemas,
  prCastVoteRequestSchemas,
  prExecuteRequestSchemas,
  proposalCancelRequestSchemas,
  proposalDeadlineRequestSchemas,
  proposalExecuteRequestSchemas,
  proposalExecutorRoleRequestSchemas,
  proposalExistsRequestSchemas,
  proposalGovernanceProposerRoleRequestSchemas,
  proposalSnapshotRequestSchemas,
  proposalVotesRequestSchemas,
  proposeAddressArrayUint256ArrayBytesArrayStringUint8RequestSchemas,
  proposerRoleRequestSchemas,
  proposeStringStringAddressArrayUint256ArrayBytesArrayUint8RequestSchemas,
  prQueueRequestSchemas,
  prStateRequestSchemas,
  queueRequestSchemas,
  scheduleRequestSchemas,
  setDefaultGasLimitRequestSchemas,
  setProposalTypeConfigRequestSchemas,
  setTrustedTargetRequestSchemas,
  stateRequestSchemas,
  timelockCancelRequestSchemas,
  timelockExecuteRequestSchemas,
  timelockExecutorRoleRequestSchemas,
  timelockRoleRequestSchemas,
  updateMinDelayRequestSchemas,
  updateProposalThresholdRequestSchemas,
  updateQuorumNumeratorRequestSchemas,
  updateVotingDelayRequestSchemas,
  updateVotingPeriodRequestSchemas,
  callExecutedEventQueryRequestSchema,
  minDelayUpdatedUint256Uint256EventQueryRequestSchema,
  operationExecutedBytes32EventQueryRequestSchema,
  operationExecutedBytes32Uint256Uint256EventQueryRequestSchema,
  operationRemovedEventQueryRequestSchema,
  operationScheduledEventQueryRequestSchema,
  operationStoredEventQueryRequestSchema,
  proposalCanceledEventQueryRequestSchema,
  proposalCreatedEventQueryRequestSchema,
  proposalExecutedEventQueryRequestSchema,
  proposalQueuedEventQueryRequestSchema,
  proposalTypeConfigSetEventQueryRequestSchema,
  targetGasLimitUpdatedEventQueryRequestSchema,
  timelockOperationCanceledEventQueryRequestSchema,
  trustedTargetUpdatedEventQueryRequestSchema,
  voteCastEventQueryRequestSchema,
} from "./schemas.js";

export type CancelProposalPath = import("zod").infer<typeof cancelProposalRequestSchemas.path>;
export type CancelProposalQuery = import("zod").infer<typeof cancelProposalRequestSchemas.query>;
export type CancelProposalBody = import("zod").infer<typeof cancelProposalRequestSchemas.body>;
export type GetActiveProposalsPath = import("zod").infer<typeof getActiveProposalsRequestSchemas.path>;
export type GetActiveProposalsQuery = import("zod").infer<typeof getActiveProposalsRequestSchemas.query>;
export type GetActiveProposalsBody = import("zod").infer<typeof getActiveProposalsRequestSchemas.body>;
export type GetMinDelayPath = import("zod").infer<typeof getMinDelayRequestSchemas.path>;
export type GetMinDelayQuery = import("zod").infer<typeof getMinDelayRequestSchemas.query>;
export type GetMinDelayBody = import("zod").infer<typeof getMinDelayRequestSchemas.body>;
export type GetOperationPath = import("zod").infer<typeof getOperationRequestSchemas.path>;
export type GetOperationQuery = import("zod").infer<typeof getOperationRequestSchemas.query>;
export type GetOperationBody = import("zod").infer<typeof getOperationRequestSchemas.body>;
export type GetProposalTypeConfigPath = import("zod").infer<typeof getProposalTypeConfigRequestSchemas.path>;
export type GetProposalTypeConfigQuery = import("zod").infer<typeof getProposalTypeConfigRequestSchemas.query>;
export type GetProposalTypeConfigBody = import("zod").infer<typeof getProposalTypeConfigRequestSchemas.body>;
export type GetProposerProposalsPath = import("zod").infer<typeof getProposerProposalsRequestSchemas.path>;
export type GetProposerProposalsQuery = import("zod").infer<typeof getProposerProposalsRequestSchemas.query>;
export type GetProposerProposalsBody = import("zod").infer<typeof getProposerProposalsRequestSchemas.body>;
export type GetReceiptPath = import("zod").infer<typeof getReceiptRequestSchemas.path>;
export type GetReceiptQuery = import("zod").infer<typeof getReceiptRequestSchemas.query>;
export type GetReceiptBody = import("zod").infer<typeof getReceiptRequestSchemas.body>;
export type GetRoleMultiplierPath = import("zod").infer<typeof getRoleMultiplierRequestSchemas.path>;
export type GetRoleMultiplierQuery = import("zod").infer<typeof getRoleMultiplierRequestSchemas.query>;
export type GetRoleMultiplierBody = import("zod").infer<typeof getRoleMultiplierRequestSchemas.body>;
export type GetTimestampPath = import("zod").infer<typeof getTimestampRequestSchemas.path>;
export type GetTimestampQuery = import("zod").infer<typeof getTimestampRequestSchemas.query>;
export type GetTimestampBody = import("zod").infer<typeof getTimestampRequestSchemas.body>;
export type GetVotingConfigPath = import("zod").infer<typeof getVotingConfigRequestSchemas.path>;
export type GetVotingConfigQuery = import("zod").infer<typeof getVotingConfigRequestSchemas.query>;
export type GetVotingConfigBody = import("zod").infer<typeof getVotingConfigRequestSchemas.body>;
export type GovernorGovernanceProposerRolePath = import("zod").infer<typeof governorGovernanceProposerRoleRequestSchemas.path>;
export type GovernorGovernanceProposerRoleQuery = import("zod").infer<typeof governorGovernanceProposerRoleRequestSchemas.query>;
export type GovernorGovernanceProposerRoleBody = import("zod").infer<typeof governorGovernanceProposerRoleRequestSchemas.body>;
export type IsOperationExecutedPath = import("zod").infer<typeof isOperationExecutedRequestSchemas.path>;
export type IsOperationExecutedQuery = import("zod").infer<typeof isOperationExecutedRequestSchemas.query>;
export type IsOperationExecutedBody = import("zod").infer<typeof isOperationExecutedRequestSchemas.body>;
export type IsOperationPendingPath = import("zod").infer<typeof isOperationPendingRequestSchemas.path>;
export type IsOperationPendingQuery = import("zod").infer<typeof isOperationPendingRequestSchemas.query>;
export type IsOperationPendingBody = import("zod").infer<typeof isOperationPendingRequestSchemas.body>;
export type IsOperationReadyPath = import("zod").infer<typeof isOperationReadyRequestSchemas.path>;
export type IsOperationReadyQuery = import("zod").infer<typeof isOperationReadyRequestSchemas.query>;
export type IsOperationReadyBody = import("zod").infer<typeof isOperationReadyRequestSchemas.body>;
export type PrCastVotePath = import("zod").infer<typeof prCastVoteRequestSchemas.path>;
export type PrCastVoteQuery = import("zod").infer<typeof prCastVoteRequestSchemas.query>;
export type PrCastVoteBody = import("zod").infer<typeof prCastVoteRequestSchemas.body>;
export type PrExecutePath = import("zod").infer<typeof prExecuteRequestSchemas.path>;
export type PrExecuteQuery = import("zod").infer<typeof prExecuteRequestSchemas.query>;
export type PrExecuteBody = import("zod").infer<typeof prExecuteRequestSchemas.body>;
export type ProposalCancelPath = import("zod").infer<typeof proposalCancelRequestSchemas.path>;
export type ProposalCancelQuery = import("zod").infer<typeof proposalCancelRequestSchemas.query>;
export type ProposalCancelBody = import("zod").infer<typeof proposalCancelRequestSchemas.body>;
export type ProposalDeadlinePath = import("zod").infer<typeof proposalDeadlineRequestSchemas.path>;
export type ProposalDeadlineQuery = import("zod").infer<typeof proposalDeadlineRequestSchemas.query>;
export type ProposalDeadlineBody = import("zod").infer<typeof proposalDeadlineRequestSchemas.body>;
export type ProposalExecutePath = import("zod").infer<typeof proposalExecuteRequestSchemas.path>;
export type ProposalExecuteQuery = import("zod").infer<typeof proposalExecuteRequestSchemas.query>;
export type ProposalExecuteBody = import("zod").infer<typeof proposalExecuteRequestSchemas.body>;
export type ProposalExecutorRolePath = import("zod").infer<typeof proposalExecutorRoleRequestSchemas.path>;
export type ProposalExecutorRoleQuery = import("zod").infer<typeof proposalExecutorRoleRequestSchemas.query>;
export type ProposalExecutorRoleBody = import("zod").infer<typeof proposalExecutorRoleRequestSchemas.body>;
export type ProposalExistsPath = import("zod").infer<typeof proposalExistsRequestSchemas.path>;
export type ProposalExistsQuery = import("zod").infer<typeof proposalExistsRequestSchemas.query>;
export type ProposalExistsBody = import("zod").infer<typeof proposalExistsRequestSchemas.body>;
export type ProposalGovernanceProposerRolePath = import("zod").infer<typeof proposalGovernanceProposerRoleRequestSchemas.path>;
export type ProposalGovernanceProposerRoleQuery = import("zod").infer<typeof proposalGovernanceProposerRoleRequestSchemas.query>;
export type ProposalGovernanceProposerRoleBody = import("zod").infer<typeof proposalGovernanceProposerRoleRequestSchemas.body>;
export type ProposalSnapshotPath = import("zod").infer<typeof proposalSnapshotRequestSchemas.path>;
export type ProposalSnapshotQuery = import("zod").infer<typeof proposalSnapshotRequestSchemas.query>;
export type ProposalSnapshotBody = import("zod").infer<typeof proposalSnapshotRequestSchemas.body>;
export type ProposalVotesPath = import("zod").infer<typeof proposalVotesRequestSchemas.path>;
export type ProposalVotesQuery = import("zod").infer<typeof proposalVotesRequestSchemas.query>;
export type ProposalVotesBody = import("zod").infer<typeof proposalVotesRequestSchemas.body>;
export type ProposeAddressArrayUint256ArrayBytesArrayStringUint8Path = import("zod").infer<typeof proposeAddressArrayUint256ArrayBytesArrayStringUint8RequestSchemas.path>;
export type ProposeAddressArrayUint256ArrayBytesArrayStringUint8Query = import("zod").infer<typeof proposeAddressArrayUint256ArrayBytesArrayStringUint8RequestSchemas.query>;
export type ProposeAddressArrayUint256ArrayBytesArrayStringUint8Body = import("zod").infer<typeof proposeAddressArrayUint256ArrayBytesArrayStringUint8RequestSchemas.body>;
export type ProposerRolePath = import("zod").infer<typeof proposerRoleRequestSchemas.path>;
export type ProposerRoleQuery = import("zod").infer<typeof proposerRoleRequestSchemas.query>;
export type ProposerRoleBody = import("zod").infer<typeof proposerRoleRequestSchemas.body>;
export type ProposeStringStringAddressArrayUint256ArrayBytesArrayUint8Path = import("zod").infer<typeof proposeStringStringAddressArrayUint256ArrayBytesArrayUint8RequestSchemas.path>;
export type ProposeStringStringAddressArrayUint256ArrayBytesArrayUint8Query = import("zod").infer<typeof proposeStringStringAddressArrayUint256ArrayBytesArrayUint8RequestSchemas.query>;
export type ProposeStringStringAddressArrayUint256ArrayBytesArrayUint8Body = import("zod").infer<typeof proposeStringStringAddressArrayUint256ArrayBytesArrayUint8RequestSchemas.body>;
export type PrQueuePath = import("zod").infer<typeof prQueueRequestSchemas.path>;
export type PrQueueQuery = import("zod").infer<typeof prQueueRequestSchemas.query>;
export type PrQueueBody = import("zod").infer<typeof prQueueRequestSchemas.body>;
export type PrStatePath = import("zod").infer<typeof prStateRequestSchemas.path>;
export type PrStateQuery = import("zod").infer<typeof prStateRequestSchemas.query>;
export type PrStateBody = import("zod").infer<typeof prStateRequestSchemas.body>;
export type QueuePath = import("zod").infer<typeof queueRequestSchemas.path>;
export type QueueQuery = import("zod").infer<typeof queueRequestSchemas.query>;
export type QueueBody = import("zod").infer<typeof queueRequestSchemas.body>;
export type SchedulePath = import("zod").infer<typeof scheduleRequestSchemas.path>;
export type ScheduleQuery = import("zod").infer<typeof scheduleRequestSchemas.query>;
export type ScheduleBody = import("zod").infer<typeof scheduleRequestSchemas.body>;
export type SetDefaultGasLimitPath = import("zod").infer<typeof setDefaultGasLimitRequestSchemas.path>;
export type SetDefaultGasLimitQuery = import("zod").infer<typeof setDefaultGasLimitRequestSchemas.query>;
export type SetDefaultGasLimitBody = import("zod").infer<typeof setDefaultGasLimitRequestSchemas.body>;
export type SetProposalTypeConfigPath = import("zod").infer<typeof setProposalTypeConfigRequestSchemas.path>;
export type SetProposalTypeConfigQuery = import("zod").infer<typeof setProposalTypeConfigRequestSchemas.query>;
export type SetProposalTypeConfigBody = import("zod").infer<typeof setProposalTypeConfigRequestSchemas.body>;
export type SetTrustedTargetPath = import("zod").infer<typeof setTrustedTargetRequestSchemas.path>;
export type SetTrustedTargetQuery = import("zod").infer<typeof setTrustedTargetRequestSchemas.query>;
export type SetTrustedTargetBody = import("zod").infer<typeof setTrustedTargetRequestSchemas.body>;
export type StatePath = import("zod").infer<typeof stateRequestSchemas.path>;
export type StateQuery = import("zod").infer<typeof stateRequestSchemas.query>;
export type StateBody = import("zod").infer<typeof stateRequestSchemas.body>;
export type TimelockCancelPath = import("zod").infer<typeof timelockCancelRequestSchemas.path>;
export type TimelockCancelQuery = import("zod").infer<typeof timelockCancelRequestSchemas.query>;
export type TimelockCancelBody = import("zod").infer<typeof timelockCancelRequestSchemas.body>;
export type TimelockExecutePath = import("zod").infer<typeof timelockExecuteRequestSchemas.path>;
export type TimelockExecuteQuery = import("zod").infer<typeof timelockExecuteRequestSchemas.query>;
export type TimelockExecuteBody = import("zod").infer<typeof timelockExecuteRequestSchemas.body>;
export type TimelockExecutorRolePath = import("zod").infer<typeof timelockExecutorRoleRequestSchemas.path>;
export type TimelockExecutorRoleQuery = import("zod").infer<typeof timelockExecutorRoleRequestSchemas.query>;
export type TimelockExecutorRoleBody = import("zod").infer<typeof timelockExecutorRoleRequestSchemas.body>;
export type TimelockRolePath = import("zod").infer<typeof timelockRoleRequestSchemas.path>;
export type TimelockRoleQuery = import("zod").infer<typeof timelockRoleRequestSchemas.query>;
export type TimelockRoleBody = import("zod").infer<typeof timelockRoleRequestSchemas.body>;
export type UpdateMinDelayPath = import("zod").infer<typeof updateMinDelayRequestSchemas.path>;
export type UpdateMinDelayQuery = import("zod").infer<typeof updateMinDelayRequestSchemas.query>;
export type UpdateMinDelayBody = import("zod").infer<typeof updateMinDelayRequestSchemas.body>;
export type UpdateProposalThresholdPath = import("zod").infer<typeof updateProposalThresholdRequestSchemas.path>;
export type UpdateProposalThresholdQuery = import("zod").infer<typeof updateProposalThresholdRequestSchemas.query>;
export type UpdateProposalThresholdBody = import("zod").infer<typeof updateProposalThresholdRequestSchemas.body>;
export type UpdateQuorumNumeratorPath = import("zod").infer<typeof updateQuorumNumeratorRequestSchemas.path>;
export type UpdateQuorumNumeratorQuery = import("zod").infer<typeof updateQuorumNumeratorRequestSchemas.query>;
export type UpdateQuorumNumeratorBody = import("zod").infer<typeof updateQuorumNumeratorRequestSchemas.body>;
export type UpdateVotingDelayPath = import("zod").infer<typeof updateVotingDelayRequestSchemas.path>;
export type UpdateVotingDelayQuery = import("zod").infer<typeof updateVotingDelayRequestSchemas.query>;
export type UpdateVotingDelayBody = import("zod").infer<typeof updateVotingDelayRequestSchemas.body>;
export type UpdateVotingPeriodPath = import("zod").infer<typeof updateVotingPeriodRequestSchemas.path>;
export type UpdateVotingPeriodQuery = import("zod").infer<typeof updateVotingPeriodRequestSchemas.query>;
export type UpdateVotingPeriodBody = import("zod").infer<typeof updateVotingPeriodRequestSchemas.body>;
export type CallExecutedEventQueryBody = import("zod").infer<typeof callExecutedEventQueryRequestSchema.body>;
export type MinDelayUpdatedUint256Uint256EventQueryBody = import("zod").infer<typeof minDelayUpdatedUint256Uint256EventQueryRequestSchema.body>;
export type OperationExecutedBytes32EventQueryBody = import("zod").infer<typeof operationExecutedBytes32EventQueryRequestSchema.body>;
export type OperationExecutedBytes32Uint256Uint256EventQueryBody = import("zod").infer<typeof operationExecutedBytes32Uint256Uint256EventQueryRequestSchema.body>;
export type OperationRemovedEventQueryBody = import("zod").infer<typeof operationRemovedEventQueryRequestSchema.body>;
export type OperationScheduledEventQueryBody = import("zod").infer<typeof operationScheduledEventQueryRequestSchema.body>;
export type OperationStoredEventQueryBody = import("zod").infer<typeof operationStoredEventQueryRequestSchema.body>;
export type ProposalCanceledEventQueryBody = import("zod").infer<typeof proposalCanceledEventQueryRequestSchema.body>;
export type ProposalCreatedEventQueryBody = import("zod").infer<typeof proposalCreatedEventQueryRequestSchema.body>;
export type ProposalExecutedEventQueryBody = import("zod").infer<typeof proposalExecutedEventQueryRequestSchema.body>;
export type ProposalQueuedEventQueryBody = import("zod").infer<typeof proposalQueuedEventQueryRequestSchema.body>;
export type ProposalTypeConfigSetEventQueryBody = import("zod").infer<typeof proposalTypeConfigSetEventQueryRequestSchema.body>;
export type TargetGasLimitUpdatedEventQueryBody = import("zod").infer<typeof targetGasLimitUpdatedEventQueryRequestSchema.body>;
export type TimelockOperationCanceledEventQueryBody = import("zod").infer<typeof timelockOperationCanceledEventQueryRequestSchema.body>;
export type TrustedTargetUpdatedEventQueryBody = import("zod").infer<typeof trustedTargetUpdatedEventQueryRequestSchema.body>;
export type VoteCastEventQueryBody = import("zod").infer<typeof voteCastEventQueryRequestSchema.body>;
