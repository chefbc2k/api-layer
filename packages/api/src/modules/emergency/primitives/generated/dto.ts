import {
  approveEmergencyWithdrawalRequestSchemas,
  approveRecoveryRequestSchemas,
  completeRecoveryRequestSchemas,
  emergencyResumeRequestSchemas,
  emergencyStopRequestSchemas,
  executeRecoveryActionRequestSchemas,
  executeRecoveryStepRequestSchemas,
  executeResponseRequestSchemas,
  executeScheduledResumeRequestSchemas,
  executeWithdrawalRequestSchemas,
  extendPausedUntilRequestSchemas,
  freezeAssetsRequestSchemas,
  getApprovalCountRequestSchemas,
  getEmergencyStateRequestSchemas,
  getEmergencyTimeoutRequestSchemas,
  getIncidentRequestSchemas,
  getRecoveryPlanRequestSchemas,
  isAssetFrozenRequestSchemas,
  isEmergencyStoppedRequestSchemas,
  isRecipientWhitelistedRequestSchemas,
  reportIncidentRequestSchemas,
  requestEmergencyWithdrawalRequestSchemas,
  scheduleEmergencyResumeRequestSchemas,
  setEmergencyTimeoutRequestSchemas,
  setRecipientWhitelistRequestSchemas,
  setResumeDelayRequestSchemas,
  startRecoveryRequestSchemas,
  triggerEmergencyRequestSchemas,
  unfreezeAssetsRequestSchemas,
  updateWithdrawalConfigRequestSchemas,
  assetsFrozenEventQueryRequestSchema,
  emergencyEthWithdrawalApprovedEventQueryRequestSchema,
  emergencyEthWithdrawalExecutedEventQueryRequestSchema,
  emergencyEthWithdrawalRequestedEventQueryRequestSchema,
  emergencyResumeExecutedEventQueryRequestSchema,
  emergencyResumeScheduledEventQueryRequestSchema,
  emergencyStateChangedEventQueryRequestSchema,
  emergencyWithdrawalApprovedEventQueryRequestSchema,
  emergencyWithdrawalEventQueryRequestSchema,
  emergencyWithdrawalExecutedEventQueryRequestSchema,
  emergencyWithdrawalRequestedEventQueryRequestSchema,
  incidentReportedEventQueryRequestSchema,
  pauseExtendedEventQueryRequestSchema,
  recipientWhitelistedEventQueryRequestSchema,
  recoveryCompletedEventQueryRequestSchema,
  recoveryStartedEventQueryRequestSchema,
  recoveryStepExecutedEventQueryRequestSchema,
  responseExecutedEventQueryRequestSchema,
  withdrawalConfigUpdatedEventQueryRequestSchema,
} from "./schemas.js";

export type ApproveEmergencyWithdrawalPath = import("zod").infer<typeof approveEmergencyWithdrawalRequestSchemas.path>;
export type ApproveEmergencyWithdrawalQuery = import("zod").infer<typeof approveEmergencyWithdrawalRequestSchemas.query>;
export type ApproveEmergencyWithdrawalBody = import("zod").infer<typeof approveEmergencyWithdrawalRequestSchemas.body>;
export type ApproveRecoveryPath = import("zod").infer<typeof approveRecoveryRequestSchemas.path>;
export type ApproveRecoveryQuery = import("zod").infer<typeof approveRecoveryRequestSchemas.query>;
export type ApproveRecoveryBody = import("zod").infer<typeof approveRecoveryRequestSchemas.body>;
export type CompleteRecoveryPath = import("zod").infer<typeof completeRecoveryRequestSchemas.path>;
export type CompleteRecoveryQuery = import("zod").infer<typeof completeRecoveryRequestSchemas.query>;
export type CompleteRecoveryBody = import("zod").infer<typeof completeRecoveryRequestSchemas.body>;
export type EmergencyResumePath = import("zod").infer<typeof emergencyResumeRequestSchemas.path>;
export type EmergencyResumeQuery = import("zod").infer<typeof emergencyResumeRequestSchemas.query>;
export type EmergencyResumeBody = import("zod").infer<typeof emergencyResumeRequestSchemas.body>;
export type EmergencyStopPath = import("zod").infer<typeof emergencyStopRequestSchemas.path>;
export type EmergencyStopQuery = import("zod").infer<typeof emergencyStopRequestSchemas.query>;
export type EmergencyStopBody = import("zod").infer<typeof emergencyStopRequestSchemas.body>;
export type ExecuteRecoveryActionPath = import("zod").infer<typeof executeRecoveryActionRequestSchemas.path>;
export type ExecuteRecoveryActionQuery = import("zod").infer<typeof executeRecoveryActionRequestSchemas.query>;
export type ExecuteRecoveryActionBody = import("zod").infer<typeof executeRecoveryActionRequestSchemas.body>;
export type ExecuteRecoveryStepPath = import("zod").infer<typeof executeRecoveryStepRequestSchemas.path>;
export type ExecuteRecoveryStepQuery = import("zod").infer<typeof executeRecoveryStepRequestSchemas.query>;
export type ExecuteRecoveryStepBody = import("zod").infer<typeof executeRecoveryStepRequestSchemas.body>;
export type ExecuteResponsePath = import("zod").infer<typeof executeResponseRequestSchemas.path>;
export type ExecuteResponseQuery = import("zod").infer<typeof executeResponseRequestSchemas.query>;
export type ExecuteResponseBody = import("zod").infer<typeof executeResponseRequestSchemas.body>;
export type ExecuteScheduledResumePath = import("zod").infer<typeof executeScheduledResumeRequestSchemas.path>;
export type ExecuteScheduledResumeQuery = import("zod").infer<typeof executeScheduledResumeRequestSchemas.query>;
export type ExecuteScheduledResumeBody = import("zod").infer<typeof executeScheduledResumeRequestSchemas.body>;
export type ExecuteWithdrawalPath = import("zod").infer<typeof executeWithdrawalRequestSchemas.path>;
export type ExecuteWithdrawalQuery = import("zod").infer<typeof executeWithdrawalRequestSchemas.query>;
export type ExecuteWithdrawalBody = import("zod").infer<typeof executeWithdrawalRequestSchemas.body>;
export type ExtendPausedUntilPath = import("zod").infer<typeof extendPausedUntilRequestSchemas.path>;
export type ExtendPausedUntilQuery = import("zod").infer<typeof extendPausedUntilRequestSchemas.query>;
export type ExtendPausedUntilBody = import("zod").infer<typeof extendPausedUntilRequestSchemas.body>;
export type FreezeAssetsPath = import("zod").infer<typeof freezeAssetsRequestSchemas.path>;
export type FreezeAssetsQuery = import("zod").infer<typeof freezeAssetsRequestSchemas.query>;
export type FreezeAssetsBody = import("zod").infer<typeof freezeAssetsRequestSchemas.body>;
export type GetApprovalCountPath = import("zod").infer<typeof getApprovalCountRequestSchemas.path>;
export type GetApprovalCountQuery = import("zod").infer<typeof getApprovalCountRequestSchemas.query>;
export type GetApprovalCountBody = import("zod").infer<typeof getApprovalCountRequestSchemas.body>;
export type GetEmergencyStatePath = import("zod").infer<typeof getEmergencyStateRequestSchemas.path>;
export type GetEmergencyStateQuery = import("zod").infer<typeof getEmergencyStateRequestSchemas.query>;
export type GetEmergencyStateBody = import("zod").infer<typeof getEmergencyStateRequestSchemas.body>;
export type GetEmergencyTimeoutPath = import("zod").infer<typeof getEmergencyTimeoutRequestSchemas.path>;
export type GetEmergencyTimeoutQuery = import("zod").infer<typeof getEmergencyTimeoutRequestSchemas.query>;
export type GetEmergencyTimeoutBody = import("zod").infer<typeof getEmergencyTimeoutRequestSchemas.body>;
export type GetIncidentPath = import("zod").infer<typeof getIncidentRequestSchemas.path>;
export type GetIncidentQuery = import("zod").infer<typeof getIncidentRequestSchemas.query>;
export type GetIncidentBody = import("zod").infer<typeof getIncidentRequestSchemas.body>;
export type GetRecoveryPlanPath = import("zod").infer<typeof getRecoveryPlanRequestSchemas.path>;
export type GetRecoveryPlanQuery = import("zod").infer<typeof getRecoveryPlanRequestSchemas.query>;
export type GetRecoveryPlanBody = import("zod").infer<typeof getRecoveryPlanRequestSchemas.body>;
export type IsAssetFrozenPath = import("zod").infer<typeof isAssetFrozenRequestSchemas.path>;
export type IsAssetFrozenQuery = import("zod").infer<typeof isAssetFrozenRequestSchemas.query>;
export type IsAssetFrozenBody = import("zod").infer<typeof isAssetFrozenRequestSchemas.body>;
export type IsEmergencyStoppedPath = import("zod").infer<typeof isEmergencyStoppedRequestSchemas.path>;
export type IsEmergencyStoppedQuery = import("zod").infer<typeof isEmergencyStoppedRequestSchemas.query>;
export type IsEmergencyStoppedBody = import("zod").infer<typeof isEmergencyStoppedRequestSchemas.body>;
export type IsRecipientWhitelistedPath = import("zod").infer<typeof isRecipientWhitelistedRequestSchemas.path>;
export type IsRecipientWhitelistedQuery = import("zod").infer<typeof isRecipientWhitelistedRequestSchemas.query>;
export type IsRecipientWhitelistedBody = import("zod").infer<typeof isRecipientWhitelistedRequestSchemas.body>;
export type ReportIncidentPath = import("zod").infer<typeof reportIncidentRequestSchemas.path>;
export type ReportIncidentQuery = import("zod").infer<typeof reportIncidentRequestSchemas.query>;
export type ReportIncidentBody = import("zod").infer<typeof reportIncidentRequestSchemas.body>;
export type RequestEmergencyWithdrawalPath = import("zod").infer<typeof requestEmergencyWithdrawalRequestSchemas.path>;
export type RequestEmergencyWithdrawalQuery = import("zod").infer<typeof requestEmergencyWithdrawalRequestSchemas.query>;
export type RequestEmergencyWithdrawalBody = import("zod").infer<typeof requestEmergencyWithdrawalRequestSchemas.body>;
export type ScheduleEmergencyResumePath = import("zod").infer<typeof scheduleEmergencyResumeRequestSchemas.path>;
export type ScheduleEmergencyResumeQuery = import("zod").infer<typeof scheduleEmergencyResumeRequestSchemas.query>;
export type ScheduleEmergencyResumeBody = import("zod").infer<typeof scheduleEmergencyResumeRequestSchemas.body>;
export type SetEmergencyTimeoutPath = import("zod").infer<typeof setEmergencyTimeoutRequestSchemas.path>;
export type SetEmergencyTimeoutQuery = import("zod").infer<typeof setEmergencyTimeoutRequestSchemas.query>;
export type SetEmergencyTimeoutBody = import("zod").infer<typeof setEmergencyTimeoutRequestSchemas.body>;
export type SetRecipientWhitelistPath = import("zod").infer<typeof setRecipientWhitelistRequestSchemas.path>;
export type SetRecipientWhitelistQuery = import("zod").infer<typeof setRecipientWhitelistRequestSchemas.query>;
export type SetRecipientWhitelistBody = import("zod").infer<typeof setRecipientWhitelistRequestSchemas.body>;
export type SetResumeDelayPath = import("zod").infer<typeof setResumeDelayRequestSchemas.path>;
export type SetResumeDelayQuery = import("zod").infer<typeof setResumeDelayRequestSchemas.query>;
export type SetResumeDelayBody = import("zod").infer<typeof setResumeDelayRequestSchemas.body>;
export type StartRecoveryPath = import("zod").infer<typeof startRecoveryRequestSchemas.path>;
export type StartRecoveryQuery = import("zod").infer<typeof startRecoveryRequestSchemas.query>;
export type StartRecoveryBody = import("zod").infer<typeof startRecoveryRequestSchemas.body>;
export type TriggerEmergencyPath = import("zod").infer<typeof triggerEmergencyRequestSchemas.path>;
export type TriggerEmergencyQuery = import("zod").infer<typeof triggerEmergencyRequestSchemas.query>;
export type TriggerEmergencyBody = import("zod").infer<typeof triggerEmergencyRequestSchemas.body>;
export type UnfreezeAssetsPath = import("zod").infer<typeof unfreezeAssetsRequestSchemas.path>;
export type UnfreezeAssetsQuery = import("zod").infer<typeof unfreezeAssetsRequestSchemas.query>;
export type UnfreezeAssetsBody = import("zod").infer<typeof unfreezeAssetsRequestSchemas.body>;
export type UpdateWithdrawalConfigPath = import("zod").infer<typeof updateWithdrawalConfigRequestSchemas.path>;
export type UpdateWithdrawalConfigQuery = import("zod").infer<typeof updateWithdrawalConfigRequestSchemas.query>;
export type UpdateWithdrawalConfigBody = import("zod").infer<typeof updateWithdrawalConfigRequestSchemas.body>;
export type AssetsFrozenEventQueryBody = import("zod").infer<typeof assetsFrozenEventQueryRequestSchema.body>;
export type EmergencyEthWithdrawalApprovedEventQueryBody = import("zod").infer<typeof emergencyEthWithdrawalApprovedEventQueryRequestSchema.body>;
export type EmergencyEthWithdrawalExecutedEventQueryBody = import("zod").infer<typeof emergencyEthWithdrawalExecutedEventQueryRequestSchema.body>;
export type EmergencyEthWithdrawalRequestedEventQueryBody = import("zod").infer<typeof emergencyEthWithdrawalRequestedEventQueryRequestSchema.body>;
export type EmergencyResumeExecutedEventQueryBody = import("zod").infer<typeof emergencyResumeExecutedEventQueryRequestSchema.body>;
export type EmergencyResumeScheduledEventQueryBody = import("zod").infer<typeof emergencyResumeScheduledEventQueryRequestSchema.body>;
export type EmergencyStateChangedEventQueryBody = import("zod").infer<typeof emergencyStateChangedEventQueryRequestSchema.body>;
export type EmergencyWithdrawalApprovedEventQueryBody = import("zod").infer<typeof emergencyWithdrawalApprovedEventQueryRequestSchema.body>;
export type EmergencyWithdrawalEventQueryBody = import("zod").infer<typeof emergencyWithdrawalEventQueryRequestSchema.body>;
export type EmergencyWithdrawalExecutedEventQueryBody = import("zod").infer<typeof emergencyWithdrawalExecutedEventQueryRequestSchema.body>;
export type EmergencyWithdrawalRequestedEventQueryBody = import("zod").infer<typeof emergencyWithdrawalRequestedEventQueryRequestSchema.body>;
export type IncidentReportedEventQueryBody = import("zod").infer<typeof incidentReportedEventQueryRequestSchema.body>;
export type PauseExtendedEventQueryBody = import("zod").infer<typeof pauseExtendedEventQueryRequestSchema.body>;
export type RecipientWhitelistedEventQueryBody = import("zod").infer<typeof recipientWhitelistedEventQueryRequestSchema.body>;
export type RecoveryCompletedEventQueryBody = import("zod").infer<typeof recoveryCompletedEventQueryRequestSchema.body>;
export type RecoveryStartedEventQueryBody = import("zod").infer<typeof recoveryStartedEventQueryRequestSchema.body>;
export type RecoveryStepExecutedEventQueryBody = import("zod").infer<typeof recoveryStepExecutedEventQueryRequestSchema.body>;
export type ResponseExecutedEventQueryBody = import("zod").infer<typeof responseExecutedEventQueryRequestSchema.body>;
export type WithdrawalConfigUpdatedEventQueryBody = import("zod").infer<typeof withdrawalConfigUpdatedEventQueryRequestSchema.body>;
