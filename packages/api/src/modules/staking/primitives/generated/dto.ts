import {
  advanceEpochRequestSchemas,
  batchUpdateScoresRequestSchemas,
  calculateBaseRoleMultiplierRequestSchemas,
  claimRewardsRequestSchemas,
  delegateRequestSchemas,
  delegateBySigRequestSchemas,
  delegatesRequestSchemas,
  delegationGetDelegatedVotingPowerRequestSchemas,
  delegationTypehashRequestSchemas,
  domainTypehashRequestSchemas,
  executeUnstakeRequestSchemas,
  fundRewardPoolRequestSchemas,
  getCurrentVotesRequestSchemas,
  getDegradedModeConfigRequestSchemas,
  getEchoScoreOracleV3RequestSchemas,
  getEffectiveApyRequestSchemas,
  getLatestCheckpointRequestSchemas,
  getLockDurationRequestSchemas,
  getLockTimestampRequestSchemas,
  getOracleFutureDriftConfigRequestSchemas,
  getOracleQuorumSignersRequestSchemas,
  getOracleStalenessConfigRequestSchemas,
  getPastVotesRequestSchemas,
  getPendingRewardsRequestSchemas,
  getPriorVotesRequestSchemas,
  getReputationRequestSchemas,
  getReputationHistoryRequestSchemas,
  getRewardBreakdownRequestSchemas,
  getStakeAgeMultiplierRequestSchemas,
  getStakeInfoRequestSchemas,
  getStakingStatsRequestSchemas,
  getTierRequestSchemas,
  getTierConfigRequestSchemas,
  getTotalVotingPowerRequestSchemas,
  getUnstakeRequestRequestSchemas,
  getVotesRequestSchemas,
  getVotingPowerRequestSchemas,
  getVotingPowerWithDelegationsRequestSchemas,
  initStakingRequestSchemas,
  initStakingWithTokenRequestSchemas,
  isDegradedModeActiveRequestSchemas,
  isEchoScorePausedV3RequestSchemas,
  isOracleHealthyRequestSchemas,
  maxBatchSizeRequestSchemas,
  pauseEchoScoreV3RequestSchemas,
  queueTierConfigUpdateRequestSchemas,
  requestUnstakeRequestSchemas,
  setDegradedModeConfigRequestSchemas,
  setEchoScoreBoostRequestSchemas,
  setEchoScoreOracleV3RequestSchemas,
  setMaxLockDurationRequestSchemas,
  setOracleFutureDriftConfigRequestSchemas,
  setOracleQuorumSignersRequestSchemas,
  setOracleStalenessConfigRequestSchemas,
  setRoleMultiplierRequestSchemas,
  setStakingPausedRequestSchemas,
  setupInitialVotingPowerRequestSchemas,
  setZeroLockDurationRequestSchemas,
  stakeRequestSchemas,
  unpauseEchoScoreV3RequestSchemas,
  updateDelegatedVotingPowerRequestSchemas,
  updateDelegatedVotingPowerBatchRequestSchemas,
  updateLockDurationRequestSchemas,
  updateScoreRequestSchemas,
  updateVotingPowerRequestSchemas,
  updateVotingPowerBatchRequestSchemas,
  votingPowerGetDelegatedVotingPowerRequestSchemas,
  delegateChangedAddressAddressAddressEventQueryRequestSchema,
  delegateVotesChangedAddressUint256Uint256EventQueryRequestSchema,
  delegationVotingPowerUpdatedEventQueryRequestSchema,
  epochAdvancedEventQueryRequestSchema,
  lockDurationUpdatedEventQueryRequestSchema,
  maxLockDurationUpdatedEventQueryRequestSchema,
  oracleFutureDriftConfigUpdatedEventQueryRequestSchema,
  oracleQuorumConfigUpdatedEventQueryRequestSchema,
  oracleStalenessConfigUpdatedEventQueryRequestSchema,
  oracleUpdatedEventQueryRequestSchema,
  pausedEventQueryRequestSchema,
  reputationUpdatedEventQueryRequestSchema,
  rewardPoolFundedEventQueryRequestSchema,
  rewardsClaimedDetailedEventQueryRequestSchema,
  rewardsClaimedEventQueryRequestSchema,
  roleMultiplierUpdatedEventQueryRequestSchema,
  scoresUpdatedEventQueryRequestSchema,
  stakedEventQueryRequestSchema,
  stakingInitializedEventQueryRequestSchema,
  stakingPausedEventQueryRequestSchema,
  tierConfigUpdatedEventQueryRequestSchema,
  unpausedEventQueryRequestSchema,
  unstakedEventQueryRequestSchema,
  unstakeRequestedEventQueryRequestSchema,
  votingPowerVotingPowerUpdatedEventQueryRequestSchema,
} from "./schemas.js";

export type AdvanceEpochPath = import("zod").infer<typeof advanceEpochRequestSchemas.path>;
export type AdvanceEpochQuery = import("zod").infer<typeof advanceEpochRequestSchemas.query>;
export type AdvanceEpochBody = import("zod").infer<typeof advanceEpochRequestSchemas.body>;
export type BatchUpdateScoresPath = import("zod").infer<typeof batchUpdateScoresRequestSchemas.path>;
export type BatchUpdateScoresQuery = import("zod").infer<typeof batchUpdateScoresRequestSchemas.query>;
export type BatchUpdateScoresBody = import("zod").infer<typeof batchUpdateScoresRequestSchemas.body>;
export type CalculateBaseRoleMultiplierPath = import("zod").infer<typeof calculateBaseRoleMultiplierRequestSchemas.path>;
export type CalculateBaseRoleMultiplierQuery = import("zod").infer<typeof calculateBaseRoleMultiplierRequestSchemas.query>;
export type CalculateBaseRoleMultiplierBody = import("zod").infer<typeof calculateBaseRoleMultiplierRequestSchemas.body>;
export type ClaimRewardsPath = import("zod").infer<typeof claimRewardsRequestSchemas.path>;
export type ClaimRewardsQuery = import("zod").infer<typeof claimRewardsRequestSchemas.query>;
export type ClaimRewardsBody = import("zod").infer<typeof claimRewardsRequestSchemas.body>;
export type DelegatePath = import("zod").infer<typeof delegateRequestSchemas.path>;
export type DelegateQuery = import("zod").infer<typeof delegateRequestSchemas.query>;
export type DelegateBody = import("zod").infer<typeof delegateRequestSchemas.body>;
export type DelegateBySigPath = import("zod").infer<typeof delegateBySigRequestSchemas.path>;
export type DelegateBySigQuery = import("zod").infer<typeof delegateBySigRequestSchemas.query>;
export type DelegateBySigBody = import("zod").infer<typeof delegateBySigRequestSchemas.body>;
export type DelegatesPath = import("zod").infer<typeof delegatesRequestSchemas.path>;
export type DelegatesQuery = import("zod").infer<typeof delegatesRequestSchemas.query>;
export type DelegatesBody = import("zod").infer<typeof delegatesRequestSchemas.body>;
export type DelegationGetDelegatedVotingPowerPath = import("zod").infer<typeof delegationGetDelegatedVotingPowerRequestSchemas.path>;
export type DelegationGetDelegatedVotingPowerQuery = import("zod").infer<typeof delegationGetDelegatedVotingPowerRequestSchemas.query>;
export type DelegationGetDelegatedVotingPowerBody = import("zod").infer<typeof delegationGetDelegatedVotingPowerRequestSchemas.body>;
export type DelegationTypehashPath = import("zod").infer<typeof delegationTypehashRequestSchemas.path>;
export type DelegationTypehashQuery = import("zod").infer<typeof delegationTypehashRequestSchemas.query>;
export type DelegationTypehashBody = import("zod").infer<typeof delegationTypehashRequestSchemas.body>;
export type DomainTypehashPath = import("zod").infer<typeof domainTypehashRequestSchemas.path>;
export type DomainTypehashQuery = import("zod").infer<typeof domainTypehashRequestSchemas.query>;
export type DomainTypehashBody = import("zod").infer<typeof domainTypehashRequestSchemas.body>;
export type ExecuteUnstakePath = import("zod").infer<typeof executeUnstakeRequestSchemas.path>;
export type ExecuteUnstakeQuery = import("zod").infer<typeof executeUnstakeRequestSchemas.query>;
export type ExecuteUnstakeBody = import("zod").infer<typeof executeUnstakeRequestSchemas.body>;
export type FundRewardPoolPath = import("zod").infer<typeof fundRewardPoolRequestSchemas.path>;
export type FundRewardPoolQuery = import("zod").infer<typeof fundRewardPoolRequestSchemas.query>;
export type FundRewardPoolBody = import("zod").infer<typeof fundRewardPoolRequestSchemas.body>;
export type GetCurrentVotesPath = import("zod").infer<typeof getCurrentVotesRequestSchemas.path>;
export type GetCurrentVotesQuery = import("zod").infer<typeof getCurrentVotesRequestSchemas.query>;
export type GetCurrentVotesBody = import("zod").infer<typeof getCurrentVotesRequestSchemas.body>;
export type GetDegradedModeConfigPath = import("zod").infer<typeof getDegradedModeConfigRequestSchemas.path>;
export type GetDegradedModeConfigQuery = import("zod").infer<typeof getDegradedModeConfigRequestSchemas.query>;
export type GetDegradedModeConfigBody = import("zod").infer<typeof getDegradedModeConfigRequestSchemas.body>;
export type GetEchoScoreOracleV3Path = import("zod").infer<typeof getEchoScoreOracleV3RequestSchemas.path>;
export type GetEchoScoreOracleV3Query = import("zod").infer<typeof getEchoScoreOracleV3RequestSchemas.query>;
export type GetEchoScoreOracleV3Body = import("zod").infer<typeof getEchoScoreOracleV3RequestSchemas.body>;
export type GetEffectiveApyPath = import("zod").infer<typeof getEffectiveApyRequestSchemas.path>;
export type GetEffectiveApyQuery = import("zod").infer<typeof getEffectiveApyRequestSchemas.query>;
export type GetEffectiveApyBody = import("zod").infer<typeof getEffectiveApyRequestSchemas.body>;
export type GetLatestCheckpointPath = import("zod").infer<typeof getLatestCheckpointRequestSchemas.path>;
export type GetLatestCheckpointQuery = import("zod").infer<typeof getLatestCheckpointRequestSchemas.query>;
export type GetLatestCheckpointBody = import("zod").infer<typeof getLatestCheckpointRequestSchemas.body>;
export type GetLockDurationPath = import("zod").infer<typeof getLockDurationRequestSchemas.path>;
export type GetLockDurationQuery = import("zod").infer<typeof getLockDurationRequestSchemas.query>;
export type GetLockDurationBody = import("zod").infer<typeof getLockDurationRequestSchemas.body>;
export type GetLockTimestampPath = import("zod").infer<typeof getLockTimestampRequestSchemas.path>;
export type GetLockTimestampQuery = import("zod").infer<typeof getLockTimestampRequestSchemas.query>;
export type GetLockTimestampBody = import("zod").infer<typeof getLockTimestampRequestSchemas.body>;
export type GetOracleFutureDriftConfigPath = import("zod").infer<typeof getOracleFutureDriftConfigRequestSchemas.path>;
export type GetOracleFutureDriftConfigQuery = import("zod").infer<typeof getOracleFutureDriftConfigRequestSchemas.query>;
export type GetOracleFutureDriftConfigBody = import("zod").infer<typeof getOracleFutureDriftConfigRequestSchemas.body>;
export type GetOracleQuorumSignersPath = import("zod").infer<typeof getOracleQuorumSignersRequestSchemas.path>;
export type GetOracleQuorumSignersQuery = import("zod").infer<typeof getOracleQuorumSignersRequestSchemas.query>;
export type GetOracleQuorumSignersBody = import("zod").infer<typeof getOracleQuorumSignersRequestSchemas.body>;
export type GetOracleStalenessConfigPath = import("zod").infer<typeof getOracleStalenessConfigRequestSchemas.path>;
export type GetOracleStalenessConfigQuery = import("zod").infer<typeof getOracleStalenessConfigRequestSchemas.query>;
export type GetOracleStalenessConfigBody = import("zod").infer<typeof getOracleStalenessConfigRequestSchemas.body>;
export type GetPastVotesPath = import("zod").infer<typeof getPastVotesRequestSchemas.path>;
export type GetPastVotesQuery = import("zod").infer<typeof getPastVotesRequestSchemas.query>;
export type GetPastVotesBody = import("zod").infer<typeof getPastVotesRequestSchemas.body>;
export type GetPendingRewardsPath = import("zod").infer<typeof getPendingRewardsRequestSchemas.path>;
export type GetPendingRewardsQuery = import("zod").infer<typeof getPendingRewardsRequestSchemas.query>;
export type GetPendingRewardsBody = import("zod").infer<typeof getPendingRewardsRequestSchemas.body>;
export type GetPriorVotesPath = import("zod").infer<typeof getPriorVotesRequestSchemas.path>;
export type GetPriorVotesQuery = import("zod").infer<typeof getPriorVotesRequestSchemas.query>;
export type GetPriorVotesBody = import("zod").infer<typeof getPriorVotesRequestSchemas.body>;
export type GetReputationPath = import("zod").infer<typeof getReputationRequestSchemas.path>;
export type GetReputationQuery = import("zod").infer<typeof getReputationRequestSchemas.query>;
export type GetReputationBody = import("zod").infer<typeof getReputationRequestSchemas.body>;
export type GetReputationHistoryPath = import("zod").infer<typeof getReputationHistoryRequestSchemas.path>;
export type GetReputationHistoryQuery = import("zod").infer<typeof getReputationHistoryRequestSchemas.query>;
export type GetReputationHistoryBody = import("zod").infer<typeof getReputationHistoryRequestSchemas.body>;
export type GetRewardBreakdownPath = import("zod").infer<typeof getRewardBreakdownRequestSchemas.path>;
export type GetRewardBreakdownQuery = import("zod").infer<typeof getRewardBreakdownRequestSchemas.query>;
export type GetRewardBreakdownBody = import("zod").infer<typeof getRewardBreakdownRequestSchemas.body>;
export type GetStakeAgeMultiplierPath = import("zod").infer<typeof getStakeAgeMultiplierRequestSchemas.path>;
export type GetStakeAgeMultiplierQuery = import("zod").infer<typeof getStakeAgeMultiplierRequestSchemas.query>;
export type GetStakeAgeMultiplierBody = import("zod").infer<typeof getStakeAgeMultiplierRequestSchemas.body>;
export type GetStakeInfoPath = import("zod").infer<typeof getStakeInfoRequestSchemas.path>;
export type GetStakeInfoQuery = import("zod").infer<typeof getStakeInfoRequestSchemas.query>;
export type GetStakeInfoBody = import("zod").infer<typeof getStakeInfoRequestSchemas.body>;
export type GetStakingStatsPath = import("zod").infer<typeof getStakingStatsRequestSchemas.path>;
export type GetStakingStatsQuery = import("zod").infer<typeof getStakingStatsRequestSchemas.query>;
export type GetStakingStatsBody = import("zod").infer<typeof getStakingStatsRequestSchemas.body>;
export type GetTierPath = import("zod").infer<typeof getTierRequestSchemas.path>;
export type GetTierQuery = import("zod").infer<typeof getTierRequestSchemas.query>;
export type GetTierBody = import("zod").infer<typeof getTierRequestSchemas.body>;
export type GetTierConfigPath = import("zod").infer<typeof getTierConfigRequestSchemas.path>;
export type GetTierConfigQuery = import("zod").infer<typeof getTierConfigRequestSchemas.query>;
export type GetTierConfigBody = import("zod").infer<typeof getTierConfigRequestSchemas.body>;
export type GetTotalVotingPowerPath = import("zod").infer<typeof getTotalVotingPowerRequestSchemas.path>;
export type GetTotalVotingPowerQuery = import("zod").infer<typeof getTotalVotingPowerRequestSchemas.query>;
export type GetTotalVotingPowerBody = import("zod").infer<typeof getTotalVotingPowerRequestSchemas.body>;
export type GetUnstakeRequestPath = import("zod").infer<typeof getUnstakeRequestRequestSchemas.path>;
export type GetUnstakeRequestQuery = import("zod").infer<typeof getUnstakeRequestRequestSchemas.query>;
export type GetUnstakeRequestBody = import("zod").infer<typeof getUnstakeRequestRequestSchemas.body>;
export type GetVotesPath = import("zod").infer<typeof getVotesRequestSchemas.path>;
export type GetVotesQuery = import("zod").infer<typeof getVotesRequestSchemas.query>;
export type GetVotesBody = import("zod").infer<typeof getVotesRequestSchemas.body>;
export type GetVotingPowerPath = import("zod").infer<typeof getVotingPowerRequestSchemas.path>;
export type GetVotingPowerQuery = import("zod").infer<typeof getVotingPowerRequestSchemas.query>;
export type GetVotingPowerBody = import("zod").infer<typeof getVotingPowerRequestSchemas.body>;
export type GetVotingPowerWithDelegationsPath = import("zod").infer<typeof getVotingPowerWithDelegationsRequestSchemas.path>;
export type GetVotingPowerWithDelegationsQuery = import("zod").infer<typeof getVotingPowerWithDelegationsRequestSchemas.query>;
export type GetVotingPowerWithDelegationsBody = import("zod").infer<typeof getVotingPowerWithDelegationsRequestSchemas.body>;
export type InitStakingPath = import("zod").infer<typeof initStakingRequestSchemas.path>;
export type InitStakingQuery = import("zod").infer<typeof initStakingRequestSchemas.query>;
export type InitStakingBody = import("zod").infer<typeof initStakingRequestSchemas.body>;
export type InitStakingWithTokenPath = import("zod").infer<typeof initStakingWithTokenRequestSchemas.path>;
export type InitStakingWithTokenQuery = import("zod").infer<typeof initStakingWithTokenRequestSchemas.query>;
export type InitStakingWithTokenBody = import("zod").infer<typeof initStakingWithTokenRequestSchemas.body>;
export type IsDegradedModeActivePath = import("zod").infer<typeof isDegradedModeActiveRequestSchemas.path>;
export type IsDegradedModeActiveQuery = import("zod").infer<typeof isDegradedModeActiveRequestSchemas.query>;
export type IsDegradedModeActiveBody = import("zod").infer<typeof isDegradedModeActiveRequestSchemas.body>;
export type IsEchoScorePausedV3Path = import("zod").infer<typeof isEchoScorePausedV3RequestSchemas.path>;
export type IsEchoScorePausedV3Query = import("zod").infer<typeof isEchoScorePausedV3RequestSchemas.query>;
export type IsEchoScorePausedV3Body = import("zod").infer<typeof isEchoScorePausedV3RequestSchemas.body>;
export type IsOracleHealthyPath = import("zod").infer<typeof isOracleHealthyRequestSchemas.path>;
export type IsOracleHealthyQuery = import("zod").infer<typeof isOracleHealthyRequestSchemas.query>;
export type IsOracleHealthyBody = import("zod").infer<typeof isOracleHealthyRequestSchemas.body>;
export type MaxBatchSizePath = import("zod").infer<typeof maxBatchSizeRequestSchemas.path>;
export type MaxBatchSizeQuery = import("zod").infer<typeof maxBatchSizeRequestSchemas.query>;
export type MaxBatchSizeBody = import("zod").infer<typeof maxBatchSizeRequestSchemas.body>;
export type PauseEchoScoreV3Path = import("zod").infer<typeof pauseEchoScoreV3RequestSchemas.path>;
export type PauseEchoScoreV3Query = import("zod").infer<typeof pauseEchoScoreV3RequestSchemas.query>;
export type PauseEchoScoreV3Body = import("zod").infer<typeof pauseEchoScoreV3RequestSchemas.body>;
export type QueueTierConfigUpdatePath = import("zod").infer<typeof queueTierConfigUpdateRequestSchemas.path>;
export type QueueTierConfigUpdateQuery = import("zod").infer<typeof queueTierConfigUpdateRequestSchemas.query>;
export type QueueTierConfigUpdateBody = import("zod").infer<typeof queueTierConfigUpdateRequestSchemas.body>;
export type RequestUnstakePath = import("zod").infer<typeof requestUnstakeRequestSchemas.path>;
export type RequestUnstakeQuery = import("zod").infer<typeof requestUnstakeRequestSchemas.query>;
export type RequestUnstakeBody = import("zod").infer<typeof requestUnstakeRequestSchemas.body>;
export type SetDegradedModeConfigPath = import("zod").infer<typeof setDegradedModeConfigRequestSchemas.path>;
export type SetDegradedModeConfigQuery = import("zod").infer<typeof setDegradedModeConfigRequestSchemas.query>;
export type SetDegradedModeConfigBody = import("zod").infer<typeof setDegradedModeConfigRequestSchemas.body>;
export type SetEchoScoreBoostPath = import("zod").infer<typeof setEchoScoreBoostRequestSchemas.path>;
export type SetEchoScoreBoostQuery = import("zod").infer<typeof setEchoScoreBoostRequestSchemas.query>;
export type SetEchoScoreBoostBody = import("zod").infer<typeof setEchoScoreBoostRequestSchemas.body>;
export type SetEchoScoreOracleV3Path = import("zod").infer<typeof setEchoScoreOracleV3RequestSchemas.path>;
export type SetEchoScoreOracleV3Query = import("zod").infer<typeof setEchoScoreOracleV3RequestSchemas.query>;
export type SetEchoScoreOracleV3Body = import("zod").infer<typeof setEchoScoreOracleV3RequestSchemas.body>;
export type SetMaxLockDurationPath = import("zod").infer<typeof setMaxLockDurationRequestSchemas.path>;
export type SetMaxLockDurationQuery = import("zod").infer<typeof setMaxLockDurationRequestSchemas.query>;
export type SetMaxLockDurationBody = import("zod").infer<typeof setMaxLockDurationRequestSchemas.body>;
export type SetOracleFutureDriftConfigPath = import("zod").infer<typeof setOracleFutureDriftConfigRequestSchemas.path>;
export type SetOracleFutureDriftConfigQuery = import("zod").infer<typeof setOracleFutureDriftConfigRequestSchemas.query>;
export type SetOracleFutureDriftConfigBody = import("zod").infer<typeof setOracleFutureDriftConfigRequestSchemas.body>;
export type SetOracleQuorumSignersPath = import("zod").infer<typeof setOracleQuorumSignersRequestSchemas.path>;
export type SetOracleQuorumSignersQuery = import("zod").infer<typeof setOracleQuorumSignersRequestSchemas.query>;
export type SetOracleQuorumSignersBody = import("zod").infer<typeof setOracleQuorumSignersRequestSchemas.body>;
export type SetOracleStalenessConfigPath = import("zod").infer<typeof setOracleStalenessConfigRequestSchemas.path>;
export type SetOracleStalenessConfigQuery = import("zod").infer<typeof setOracleStalenessConfigRequestSchemas.query>;
export type SetOracleStalenessConfigBody = import("zod").infer<typeof setOracleStalenessConfigRequestSchemas.body>;
export type SetRoleMultiplierPath = import("zod").infer<typeof setRoleMultiplierRequestSchemas.path>;
export type SetRoleMultiplierQuery = import("zod").infer<typeof setRoleMultiplierRequestSchemas.query>;
export type SetRoleMultiplierBody = import("zod").infer<typeof setRoleMultiplierRequestSchemas.body>;
export type SetStakingPausedPath = import("zod").infer<typeof setStakingPausedRequestSchemas.path>;
export type SetStakingPausedQuery = import("zod").infer<typeof setStakingPausedRequestSchemas.query>;
export type SetStakingPausedBody = import("zod").infer<typeof setStakingPausedRequestSchemas.body>;
export type SetupInitialVotingPowerPath = import("zod").infer<typeof setupInitialVotingPowerRequestSchemas.path>;
export type SetupInitialVotingPowerQuery = import("zod").infer<typeof setupInitialVotingPowerRequestSchemas.query>;
export type SetupInitialVotingPowerBody = import("zod").infer<typeof setupInitialVotingPowerRequestSchemas.body>;
export type SetZeroLockDurationPath = import("zod").infer<typeof setZeroLockDurationRequestSchemas.path>;
export type SetZeroLockDurationQuery = import("zod").infer<typeof setZeroLockDurationRequestSchemas.query>;
export type SetZeroLockDurationBody = import("zod").infer<typeof setZeroLockDurationRequestSchemas.body>;
export type StakePath = import("zod").infer<typeof stakeRequestSchemas.path>;
export type StakeQuery = import("zod").infer<typeof stakeRequestSchemas.query>;
export type StakeBody = import("zod").infer<typeof stakeRequestSchemas.body>;
export type UnpauseEchoScoreV3Path = import("zod").infer<typeof unpauseEchoScoreV3RequestSchemas.path>;
export type UnpauseEchoScoreV3Query = import("zod").infer<typeof unpauseEchoScoreV3RequestSchemas.query>;
export type UnpauseEchoScoreV3Body = import("zod").infer<typeof unpauseEchoScoreV3RequestSchemas.body>;
export type UpdateDelegatedVotingPowerPath = import("zod").infer<typeof updateDelegatedVotingPowerRequestSchemas.path>;
export type UpdateDelegatedVotingPowerQuery = import("zod").infer<typeof updateDelegatedVotingPowerRequestSchemas.query>;
export type UpdateDelegatedVotingPowerBody = import("zod").infer<typeof updateDelegatedVotingPowerRequestSchemas.body>;
export type UpdateDelegatedVotingPowerBatchPath = import("zod").infer<typeof updateDelegatedVotingPowerBatchRequestSchemas.path>;
export type UpdateDelegatedVotingPowerBatchQuery = import("zod").infer<typeof updateDelegatedVotingPowerBatchRequestSchemas.query>;
export type UpdateDelegatedVotingPowerBatchBody = import("zod").infer<typeof updateDelegatedVotingPowerBatchRequestSchemas.body>;
export type UpdateLockDurationPath = import("zod").infer<typeof updateLockDurationRequestSchemas.path>;
export type UpdateLockDurationQuery = import("zod").infer<typeof updateLockDurationRequestSchemas.query>;
export type UpdateLockDurationBody = import("zod").infer<typeof updateLockDurationRequestSchemas.body>;
export type UpdateScorePath = import("zod").infer<typeof updateScoreRequestSchemas.path>;
export type UpdateScoreQuery = import("zod").infer<typeof updateScoreRequestSchemas.query>;
export type UpdateScoreBody = import("zod").infer<typeof updateScoreRequestSchemas.body>;
export type UpdateVotingPowerPath = import("zod").infer<typeof updateVotingPowerRequestSchemas.path>;
export type UpdateVotingPowerQuery = import("zod").infer<typeof updateVotingPowerRequestSchemas.query>;
export type UpdateVotingPowerBody = import("zod").infer<typeof updateVotingPowerRequestSchemas.body>;
export type UpdateVotingPowerBatchPath = import("zod").infer<typeof updateVotingPowerBatchRequestSchemas.path>;
export type UpdateVotingPowerBatchQuery = import("zod").infer<typeof updateVotingPowerBatchRequestSchemas.query>;
export type UpdateVotingPowerBatchBody = import("zod").infer<typeof updateVotingPowerBatchRequestSchemas.body>;
export type VotingPowerGetDelegatedVotingPowerPath = import("zod").infer<typeof votingPowerGetDelegatedVotingPowerRequestSchemas.path>;
export type VotingPowerGetDelegatedVotingPowerQuery = import("zod").infer<typeof votingPowerGetDelegatedVotingPowerRequestSchemas.query>;
export type VotingPowerGetDelegatedVotingPowerBody = import("zod").infer<typeof votingPowerGetDelegatedVotingPowerRequestSchemas.body>;
export type DelegateChangedAddressAddressAddressEventQueryBody = import("zod").infer<typeof delegateChangedAddressAddressAddressEventQueryRequestSchema.body>;
export type DelegateVotesChangedAddressUint256Uint256EventQueryBody = import("zod").infer<typeof delegateVotesChangedAddressUint256Uint256EventQueryRequestSchema.body>;
export type DelegationVotingPowerUpdatedEventQueryBody = import("zod").infer<typeof delegationVotingPowerUpdatedEventQueryRequestSchema.body>;
export type EpochAdvancedEventQueryBody = import("zod").infer<typeof epochAdvancedEventQueryRequestSchema.body>;
export type LockDurationUpdatedEventQueryBody = import("zod").infer<typeof lockDurationUpdatedEventQueryRequestSchema.body>;
export type MaxLockDurationUpdatedEventQueryBody = import("zod").infer<typeof maxLockDurationUpdatedEventQueryRequestSchema.body>;
export type OracleFutureDriftConfigUpdatedEventQueryBody = import("zod").infer<typeof oracleFutureDriftConfigUpdatedEventQueryRequestSchema.body>;
export type OracleQuorumConfigUpdatedEventQueryBody = import("zod").infer<typeof oracleQuorumConfigUpdatedEventQueryRequestSchema.body>;
export type OracleStalenessConfigUpdatedEventQueryBody = import("zod").infer<typeof oracleStalenessConfigUpdatedEventQueryRequestSchema.body>;
export type OracleUpdatedEventQueryBody = import("zod").infer<typeof oracleUpdatedEventQueryRequestSchema.body>;
export type PausedEventQueryBody = import("zod").infer<typeof pausedEventQueryRequestSchema.body>;
export type ReputationUpdatedEventQueryBody = import("zod").infer<typeof reputationUpdatedEventQueryRequestSchema.body>;
export type RewardPoolFundedEventQueryBody = import("zod").infer<typeof rewardPoolFundedEventQueryRequestSchema.body>;
export type RewardsClaimedDetailedEventQueryBody = import("zod").infer<typeof rewardsClaimedDetailedEventQueryRequestSchema.body>;
export type RewardsClaimedEventQueryBody = import("zod").infer<typeof rewardsClaimedEventQueryRequestSchema.body>;
export type RoleMultiplierUpdatedEventQueryBody = import("zod").infer<typeof roleMultiplierUpdatedEventQueryRequestSchema.body>;
export type ScoresUpdatedEventQueryBody = import("zod").infer<typeof scoresUpdatedEventQueryRequestSchema.body>;
export type StakedEventQueryBody = import("zod").infer<typeof stakedEventQueryRequestSchema.body>;
export type StakingInitializedEventQueryBody = import("zod").infer<typeof stakingInitializedEventQueryRequestSchema.body>;
export type StakingPausedEventQueryBody = import("zod").infer<typeof stakingPausedEventQueryRequestSchema.body>;
export type TierConfigUpdatedEventQueryBody = import("zod").infer<typeof tierConfigUpdatedEventQueryRequestSchema.body>;
export type UnpausedEventQueryBody = import("zod").infer<typeof unpausedEventQueryRequestSchema.body>;
export type UnstakedEventQueryBody = import("zod").infer<typeof unstakedEventQueryRequestSchema.body>;
export type UnstakeRequestedEventQueryBody = import("zod").infer<typeof unstakeRequestedEventQueryRequestSchema.body>;
export type VotingPowerVotingPowerUpdatedEventQueryBody = import("zod").infer<typeof votingPowerVotingPowerUpdatedEventQueryRequestSchema.body>;
