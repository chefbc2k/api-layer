import {
  allowanceRequestSchemas,
  approveRequestSchemas,
  balanceOfRequestSchemas,
  batchReleaseTwaveVestingRequestSchemas,
  burnRequestSchemas,
  burnFromRequestSchemas,
  calculateCexVestingRequestSchemas,
  calculateDevFundVestingRequestSchemas,
  calculateFounderVestingRequestSchemas,
  calculatePublicVestingRequestSchemas,
  calculateTeamVestingRequestSchemas,
  campaignCountRequestSchemas,
  canTransferVestingRequestSchemas,
  claimRequestSchemas,
  claimableAmountRequestSchemas,
  claimedRequestSchemas,
  createCampaignRequestSchemas,
  createCexVestingRequestSchemas,
  createDevFundVestingRequestSchemas,
  createFounderVestingRequestSchemas,
  createPublicVestingRequestSchemas,
  createTeamVestingRequestSchemas,
  createUsdcVestingScheduleRequestSchemas,
  decimalsRequestSchemas,
  getCampaignRequestSchemas,
  getMinTwaveVestingDurationRequestSchemas,
  getNextUnlockTimeRequestSchemas,
  getQuarterlyUnlockRateRequestSchemas,
  getReleasableTwaveAmountRequestSchemas,
  getSellableAmountRequestSchemas,
  getStandardVestedAmountRequestSchemas,
  getStandardVestingReleasableRequestSchemas,
  getStandardVestingScheduleRequestSchemas,
  getVestedTwaveAmountRequestSchemas,
  getVestingDetailsRequestSchemas,
  getVestingReleasableAmountRequestSchemas,
  getVestingTotalAmountRequestSchemas,
  getVestingTwaveScheduleRequestSchemas,
  getVestingTypeRequestSchemas,
  hasVestingScheduleRequestSchemas,
  initializeTokenRequestSchemas,
  isFullyVestedRequestSchemas,
  isVestingActiveRequestSchemas,
  pauseCampaignRequestSchemas,
  releaseStandardVestingRequestSchemas,
  releaseStandardVestingForRequestSchemas,
  releaseTokensForRequestSchemas,
  releaseTwaveVestingRequestSchemas,
  releaseTwaveVestingForRequestSchemas,
  releaseVestedTokensRequestSchemas,
  revokeTwaveVestingRequestSchemas,
  revokeVestingScheduleRequestSchemas,
  setMerkleRootRequestSchemas,
  setMinimumTwaveVestingDurationRequestSchemas,
  setMinimumVestingDurationRequestSchemas,
  setQuarterlyUnlockRateRequestSchemas,
  supplyFinishMintingRequestSchemas,
  supplyGetMaximumRequestSchemas,
  supplyIsMintingFinishedRequestSchemas,
  supplyMintTokensRequestSchemas,
  supplySetMaximumRequestSchemas,
  thresholdBurnExcessRequestSchemas,
  thresholdBurnTokensRequestSchemas,
  thresholdBurnTokensFromRequestSchemas,
  thresholdCalculateExcessRequestSchemas,
  thresholdGetBurnLimitRequestSchemas,
  thresholdSetBurnLimitRequestSchemas,
  tokenAllowanceRequestSchemas,
  tokenApproveRequestSchemas,
  tokenBalanceOfRequestSchemas,
  tokenNameRequestSchemas,
  tokenSymbolRequestSchemas,
  tokenTransferFromRequestSchemas,
  totalSupplyRequestSchemas,
  transferRequestSchemas,
  transferFromRequestSchemas,
  transferTwaveVestingRequestSchemas,
  transferVestingScheduleRequestSchemas,
  unpauseCampaignRequestSchemas,
  veGetRoleAdminRequestSchemas,
  veGetVestingScheduleRequestSchemas,
  veHasRoleRequestSchemas,
  vestedAmountRequestSchemas,
  veSupportsInterfaceRequestSchemas,
  approvalEventQueryRequestSchema,
  beneficiaryTransferredEventQueryRequestSchema,
  burnThresholdTransferEventQueryRequestSchema,
  burnThresholdUpdatedEventQueryRequestSchema,
  campaignCapConfigEventQueryRequestSchema,
  campaignCreatedEventQueryRequestSchema,
  campaignMerkleRootUpdatedEventQueryRequestSchema,
  campaignPausedEventQueryRequestSchema,
  campaignUnpausedEventQueryRequestSchema,
  campaignVestingConfigEventQueryRequestSchema,
  claimedEventQueryRequestSchema,
  mintingFinishedEventQueryRequestSchema,
  saleRestrictionUpdatedEventQueryRequestSchema,
  thresholdBurnEventQueryRequestSchema,
  tokenInitializedEventQueryRequestSchema,
  tokensReleasedEventQueryRequestSchema,
  tokenSupplyTransferEventQueryRequestSchema,
  tokensVestedEventQueryRequestSchema,
  vestingInitializedEventQueryRequestSchema,
  vestingPausedEventQueryRequestSchema,
  vestingRevokedEventQueryRequestSchema,
  vestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQueryRequestSchema,
  vestingScheduleCreatedEventQueryRequestSchema,
  vestingScheduleRevokedEventQueryRequestSchema,
  vestingTransferredEventQueryRequestSchema,
  vestingUnpausedEventQueryRequestSchema,
} from "./schemas.js";

export type AllowancePath = import("zod").infer<typeof allowanceRequestSchemas.path>;
export type AllowanceQuery = import("zod").infer<typeof allowanceRequestSchemas.query>;
export type AllowanceBody = import("zod").infer<typeof allowanceRequestSchemas.body>;
export type ApprovePath = import("zod").infer<typeof approveRequestSchemas.path>;
export type ApproveQuery = import("zod").infer<typeof approveRequestSchemas.query>;
export type ApproveBody = import("zod").infer<typeof approveRequestSchemas.body>;
export type BalanceOfPath = import("zod").infer<typeof balanceOfRequestSchemas.path>;
export type BalanceOfQuery = import("zod").infer<typeof balanceOfRequestSchemas.query>;
export type BalanceOfBody = import("zod").infer<typeof balanceOfRequestSchemas.body>;
export type BatchReleaseTwaveVestingPath = import("zod").infer<typeof batchReleaseTwaveVestingRequestSchemas.path>;
export type BatchReleaseTwaveVestingQuery = import("zod").infer<typeof batchReleaseTwaveVestingRequestSchemas.query>;
export type BatchReleaseTwaveVestingBody = import("zod").infer<typeof batchReleaseTwaveVestingRequestSchemas.body>;
export type BurnPath = import("zod").infer<typeof burnRequestSchemas.path>;
export type BurnQuery = import("zod").infer<typeof burnRequestSchemas.query>;
export type BurnBody = import("zod").infer<typeof burnRequestSchemas.body>;
export type BurnFromPath = import("zod").infer<typeof burnFromRequestSchemas.path>;
export type BurnFromQuery = import("zod").infer<typeof burnFromRequestSchemas.query>;
export type BurnFromBody = import("zod").infer<typeof burnFromRequestSchemas.body>;
export type CalculateCexVestingPath = import("zod").infer<typeof calculateCexVestingRequestSchemas.path>;
export type CalculateCexVestingQuery = import("zod").infer<typeof calculateCexVestingRequestSchemas.query>;
export type CalculateCexVestingBody = import("zod").infer<typeof calculateCexVestingRequestSchemas.body>;
export type CalculateDevFundVestingPath = import("zod").infer<typeof calculateDevFundVestingRequestSchemas.path>;
export type CalculateDevFundVestingQuery = import("zod").infer<typeof calculateDevFundVestingRequestSchemas.query>;
export type CalculateDevFundVestingBody = import("zod").infer<typeof calculateDevFundVestingRequestSchemas.body>;
export type CalculateFounderVestingPath = import("zod").infer<typeof calculateFounderVestingRequestSchemas.path>;
export type CalculateFounderVestingQuery = import("zod").infer<typeof calculateFounderVestingRequestSchemas.query>;
export type CalculateFounderVestingBody = import("zod").infer<typeof calculateFounderVestingRequestSchemas.body>;
export type CalculatePublicVestingPath = import("zod").infer<typeof calculatePublicVestingRequestSchemas.path>;
export type CalculatePublicVestingQuery = import("zod").infer<typeof calculatePublicVestingRequestSchemas.query>;
export type CalculatePublicVestingBody = import("zod").infer<typeof calculatePublicVestingRequestSchemas.body>;
export type CalculateTeamVestingPath = import("zod").infer<typeof calculateTeamVestingRequestSchemas.path>;
export type CalculateTeamVestingQuery = import("zod").infer<typeof calculateTeamVestingRequestSchemas.query>;
export type CalculateTeamVestingBody = import("zod").infer<typeof calculateTeamVestingRequestSchemas.body>;
export type CampaignCountPath = import("zod").infer<typeof campaignCountRequestSchemas.path>;
export type CampaignCountQuery = import("zod").infer<typeof campaignCountRequestSchemas.query>;
export type CampaignCountBody = import("zod").infer<typeof campaignCountRequestSchemas.body>;
export type CanTransferVestingPath = import("zod").infer<typeof canTransferVestingRequestSchemas.path>;
export type CanTransferVestingQuery = import("zod").infer<typeof canTransferVestingRequestSchemas.query>;
export type CanTransferVestingBody = import("zod").infer<typeof canTransferVestingRequestSchemas.body>;
export type ClaimPath = import("zod").infer<typeof claimRequestSchemas.path>;
export type ClaimQuery = import("zod").infer<typeof claimRequestSchemas.query>;
export type ClaimBody = import("zod").infer<typeof claimRequestSchemas.body>;
export type ClaimableAmountPath = import("zod").infer<typeof claimableAmountRequestSchemas.path>;
export type ClaimableAmountQuery = import("zod").infer<typeof claimableAmountRequestSchemas.query>;
export type ClaimableAmountBody = import("zod").infer<typeof claimableAmountRequestSchemas.body>;
export type ClaimedPath = import("zod").infer<typeof claimedRequestSchemas.path>;
export type ClaimedQuery = import("zod").infer<typeof claimedRequestSchemas.query>;
export type ClaimedBody = import("zod").infer<typeof claimedRequestSchemas.body>;
export type CreateCampaignPath = import("zod").infer<typeof createCampaignRequestSchemas.path>;
export type CreateCampaignQuery = import("zod").infer<typeof createCampaignRequestSchemas.query>;
export type CreateCampaignBody = import("zod").infer<typeof createCampaignRequestSchemas.body>;
export type CreateCexVestingPath = import("zod").infer<typeof createCexVestingRequestSchemas.path>;
export type CreateCexVestingQuery = import("zod").infer<typeof createCexVestingRequestSchemas.query>;
export type CreateCexVestingBody = import("zod").infer<typeof createCexVestingRequestSchemas.body>;
export type CreateDevFundVestingPath = import("zod").infer<typeof createDevFundVestingRequestSchemas.path>;
export type CreateDevFundVestingQuery = import("zod").infer<typeof createDevFundVestingRequestSchemas.query>;
export type CreateDevFundVestingBody = import("zod").infer<typeof createDevFundVestingRequestSchemas.body>;
export type CreateFounderVestingPath = import("zod").infer<typeof createFounderVestingRequestSchemas.path>;
export type CreateFounderVestingQuery = import("zod").infer<typeof createFounderVestingRequestSchemas.query>;
export type CreateFounderVestingBody = import("zod").infer<typeof createFounderVestingRequestSchemas.body>;
export type CreatePublicVestingPath = import("zod").infer<typeof createPublicVestingRequestSchemas.path>;
export type CreatePublicVestingQuery = import("zod").infer<typeof createPublicVestingRequestSchemas.query>;
export type CreatePublicVestingBody = import("zod").infer<typeof createPublicVestingRequestSchemas.body>;
export type CreateTeamVestingPath = import("zod").infer<typeof createTeamVestingRequestSchemas.path>;
export type CreateTeamVestingQuery = import("zod").infer<typeof createTeamVestingRequestSchemas.query>;
export type CreateTeamVestingBody = import("zod").infer<typeof createTeamVestingRequestSchemas.body>;
export type CreateUsdcVestingSchedulePath = import("zod").infer<typeof createUsdcVestingScheduleRequestSchemas.path>;
export type CreateUsdcVestingScheduleQuery = import("zod").infer<typeof createUsdcVestingScheduleRequestSchemas.query>;
export type CreateUsdcVestingScheduleBody = import("zod").infer<typeof createUsdcVestingScheduleRequestSchemas.body>;
export type DecimalsPath = import("zod").infer<typeof decimalsRequestSchemas.path>;
export type DecimalsQuery = import("zod").infer<typeof decimalsRequestSchemas.query>;
export type DecimalsBody = import("zod").infer<typeof decimalsRequestSchemas.body>;
export type GetCampaignPath = import("zod").infer<typeof getCampaignRequestSchemas.path>;
export type GetCampaignQuery = import("zod").infer<typeof getCampaignRequestSchemas.query>;
export type GetCampaignBody = import("zod").infer<typeof getCampaignRequestSchemas.body>;
export type GetMinTwaveVestingDurationPath = import("zod").infer<typeof getMinTwaveVestingDurationRequestSchemas.path>;
export type GetMinTwaveVestingDurationQuery = import("zod").infer<typeof getMinTwaveVestingDurationRequestSchemas.query>;
export type GetMinTwaveVestingDurationBody = import("zod").infer<typeof getMinTwaveVestingDurationRequestSchemas.body>;
export type GetNextUnlockTimePath = import("zod").infer<typeof getNextUnlockTimeRequestSchemas.path>;
export type GetNextUnlockTimeQuery = import("zod").infer<typeof getNextUnlockTimeRequestSchemas.query>;
export type GetNextUnlockTimeBody = import("zod").infer<typeof getNextUnlockTimeRequestSchemas.body>;
export type GetQuarterlyUnlockRatePath = import("zod").infer<typeof getQuarterlyUnlockRateRequestSchemas.path>;
export type GetQuarterlyUnlockRateQuery = import("zod").infer<typeof getQuarterlyUnlockRateRequestSchemas.query>;
export type GetQuarterlyUnlockRateBody = import("zod").infer<typeof getQuarterlyUnlockRateRequestSchemas.body>;
export type GetReleasableTwaveAmountPath = import("zod").infer<typeof getReleasableTwaveAmountRequestSchemas.path>;
export type GetReleasableTwaveAmountQuery = import("zod").infer<typeof getReleasableTwaveAmountRequestSchemas.query>;
export type GetReleasableTwaveAmountBody = import("zod").infer<typeof getReleasableTwaveAmountRequestSchemas.body>;
export type GetSellableAmountPath = import("zod").infer<typeof getSellableAmountRequestSchemas.path>;
export type GetSellableAmountQuery = import("zod").infer<typeof getSellableAmountRequestSchemas.query>;
export type GetSellableAmountBody = import("zod").infer<typeof getSellableAmountRequestSchemas.body>;
export type GetStandardVestedAmountPath = import("zod").infer<typeof getStandardVestedAmountRequestSchemas.path>;
export type GetStandardVestedAmountQuery = import("zod").infer<typeof getStandardVestedAmountRequestSchemas.query>;
export type GetStandardVestedAmountBody = import("zod").infer<typeof getStandardVestedAmountRequestSchemas.body>;
export type GetStandardVestingReleasablePath = import("zod").infer<typeof getStandardVestingReleasableRequestSchemas.path>;
export type GetStandardVestingReleasableQuery = import("zod").infer<typeof getStandardVestingReleasableRequestSchemas.query>;
export type GetStandardVestingReleasableBody = import("zod").infer<typeof getStandardVestingReleasableRequestSchemas.body>;
export type GetStandardVestingSchedulePath = import("zod").infer<typeof getStandardVestingScheduleRequestSchemas.path>;
export type GetStandardVestingScheduleQuery = import("zod").infer<typeof getStandardVestingScheduleRequestSchemas.query>;
export type GetStandardVestingScheduleBody = import("zod").infer<typeof getStandardVestingScheduleRequestSchemas.body>;
export type GetVestedTwaveAmountPath = import("zod").infer<typeof getVestedTwaveAmountRequestSchemas.path>;
export type GetVestedTwaveAmountQuery = import("zod").infer<typeof getVestedTwaveAmountRequestSchemas.query>;
export type GetVestedTwaveAmountBody = import("zod").infer<typeof getVestedTwaveAmountRequestSchemas.body>;
export type GetVestingDetailsPath = import("zod").infer<typeof getVestingDetailsRequestSchemas.path>;
export type GetVestingDetailsQuery = import("zod").infer<typeof getVestingDetailsRequestSchemas.query>;
export type GetVestingDetailsBody = import("zod").infer<typeof getVestingDetailsRequestSchemas.body>;
export type GetVestingReleasableAmountPath = import("zod").infer<typeof getVestingReleasableAmountRequestSchemas.path>;
export type GetVestingReleasableAmountQuery = import("zod").infer<typeof getVestingReleasableAmountRequestSchemas.query>;
export type GetVestingReleasableAmountBody = import("zod").infer<typeof getVestingReleasableAmountRequestSchemas.body>;
export type GetVestingTotalAmountPath = import("zod").infer<typeof getVestingTotalAmountRequestSchemas.path>;
export type GetVestingTotalAmountQuery = import("zod").infer<typeof getVestingTotalAmountRequestSchemas.query>;
export type GetVestingTotalAmountBody = import("zod").infer<typeof getVestingTotalAmountRequestSchemas.body>;
export type GetVestingTwaveSchedulePath = import("zod").infer<typeof getVestingTwaveScheduleRequestSchemas.path>;
export type GetVestingTwaveScheduleQuery = import("zod").infer<typeof getVestingTwaveScheduleRequestSchemas.query>;
export type GetVestingTwaveScheduleBody = import("zod").infer<typeof getVestingTwaveScheduleRequestSchemas.body>;
export type GetVestingTypePath = import("zod").infer<typeof getVestingTypeRequestSchemas.path>;
export type GetVestingTypeQuery = import("zod").infer<typeof getVestingTypeRequestSchemas.query>;
export type GetVestingTypeBody = import("zod").infer<typeof getVestingTypeRequestSchemas.body>;
export type HasVestingSchedulePath = import("zod").infer<typeof hasVestingScheduleRequestSchemas.path>;
export type HasVestingScheduleQuery = import("zod").infer<typeof hasVestingScheduleRequestSchemas.query>;
export type HasVestingScheduleBody = import("zod").infer<typeof hasVestingScheduleRequestSchemas.body>;
export type InitializeTokenPath = import("zod").infer<typeof initializeTokenRequestSchemas.path>;
export type InitializeTokenQuery = import("zod").infer<typeof initializeTokenRequestSchemas.query>;
export type InitializeTokenBody = import("zod").infer<typeof initializeTokenRequestSchemas.body>;
export type IsFullyVestedPath = import("zod").infer<typeof isFullyVestedRequestSchemas.path>;
export type IsFullyVestedQuery = import("zod").infer<typeof isFullyVestedRequestSchemas.query>;
export type IsFullyVestedBody = import("zod").infer<typeof isFullyVestedRequestSchemas.body>;
export type IsVestingActivePath = import("zod").infer<typeof isVestingActiveRequestSchemas.path>;
export type IsVestingActiveQuery = import("zod").infer<typeof isVestingActiveRequestSchemas.query>;
export type IsVestingActiveBody = import("zod").infer<typeof isVestingActiveRequestSchemas.body>;
export type PauseCampaignPath = import("zod").infer<typeof pauseCampaignRequestSchemas.path>;
export type PauseCampaignQuery = import("zod").infer<typeof pauseCampaignRequestSchemas.query>;
export type PauseCampaignBody = import("zod").infer<typeof pauseCampaignRequestSchemas.body>;
export type ReleaseStandardVestingPath = import("zod").infer<typeof releaseStandardVestingRequestSchemas.path>;
export type ReleaseStandardVestingQuery = import("zod").infer<typeof releaseStandardVestingRequestSchemas.query>;
export type ReleaseStandardVestingBody = import("zod").infer<typeof releaseStandardVestingRequestSchemas.body>;
export type ReleaseStandardVestingForPath = import("zod").infer<typeof releaseStandardVestingForRequestSchemas.path>;
export type ReleaseStandardVestingForQuery = import("zod").infer<typeof releaseStandardVestingForRequestSchemas.query>;
export type ReleaseStandardVestingForBody = import("zod").infer<typeof releaseStandardVestingForRequestSchemas.body>;
export type ReleaseTokensForPath = import("zod").infer<typeof releaseTokensForRequestSchemas.path>;
export type ReleaseTokensForQuery = import("zod").infer<typeof releaseTokensForRequestSchemas.query>;
export type ReleaseTokensForBody = import("zod").infer<typeof releaseTokensForRequestSchemas.body>;
export type ReleaseTwaveVestingPath = import("zod").infer<typeof releaseTwaveVestingRequestSchemas.path>;
export type ReleaseTwaveVestingQuery = import("zod").infer<typeof releaseTwaveVestingRequestSchemas.query>;
export type ReleaseTwaveVestingBody = import("zod").infer<typeof releaseTwaveVestingRequestSchemas.body>;
export type ReleaseTwaveVestingForPath = import("zod").infer<typeof releaseTwaveVestingForRequestSchemas.path>;
export type ReleaseTwaveVestingForQuery = import("zod").infer<typeof releaseTwaveVestingForRequestSchemas.query>;
export type ReleaseTwaveVestingForBody = import("zod").infer<typeof releaseTwaveVestingForRequestSchemas.body>;
export type ReleaseVestedTokensPath = import("zod").infer<typeof releaseVestedTokensRequestSchemas.path>;
export type ReleaseVestedTokensQuery = import("zod").infer<typeof releaseVestedTokensRequestSchemas.query>;
export type ReleaseVestedTokensBody = import("zod").infer<typeof releaseVestedTokensRequestSchemas.body>;
export type RevokeTwaveVestingPath = import("zod").infer<typeof revokeTwaveVestingRequestSchemas.path>;
export type RevokeTwaveVestingQuery = import("zod").infer<typeof revokeTwaveVestingRequestSchemas.query>;
export type RevokeTwaveVestingBody = import("zod").infer<typeof revokeTwaveVestingRequestSchemas.body>;
export type RevokeVestingSchedulePath = import("zod").infer<typeof revokeVestingScheduleRequestSchemas.path>;
export type RevokeVestingScheduleQuery = import("zod").infer<typeof revokeVestingScheduleRequestSchemas.query>;
export type RevokeVestingScheduleBody = import("zod").infer<typeof revokeVestingScheduleRequestSchemas.body>;
export type SetMerkleRootPath = import("zod").infer<typeof setMerkleRootRequestSchemas.path>;
export type SetMerkleRootQuery = import("zod").infer<typeof setMerkleRootRequestSchemas.query>;
export type SetMerkleRootBody = import("zod").infer<typeof setMerkleRootRequestSchemas.body>;
export type SetMinimumTwaveVestingDurationPath = import("zod").infer<typeof setMinimumTwaveVestingDurationRequestSchemas.path>;
export type SetMinimumTwaveVestingDurationQuery = import("zod").infer<typeof setMinimumTwaveVestingDurationRequestSchemas.query>;
export type SetMinimumTwaveVestingDurationBody = import("zod").infer<typeof setMinimumTwaveVestingDurationRequestSchemas.body>;
export type SetMinimumVestingDurationPath = import("zod").infer<typeof setMinimumVestingDurationRequestSchemas.path>;
export type SetMinimumVestingDurationQuery = import("zod").infer<typeof setMinimumVestingDurationRequestSchemas.query>;
export type SetMinimumVestingDurationBody = import("zod").infer<typeof setMinimumVestingDurationRequestSchemas.body>;
export type SetQuarterlyUnlockRatePath = import("zod").infer<typeof setQuarterlyUnlockRateRequestSchemas.path>;
export type SetQuarterlyUnlockRateQuery = import("zod").infer<typeof setQuarterlyUnlockRateRequestSchemas.query>;
export type SetQuarterlyUnlockRateBody = import("zod").infer<typeof setQuarterlyUnlockRateRequestSchemas.body>;
export type SupplyFinishMintingPath = import("zod").infer<typeof supplyFinishMintingRequestSchemas.path>;
export type SupplyFinishMintingQuery = import("zod").infer<typeof supplyFinishMintingRequestSchemas.query>;
export type SupplyFinishMintingBody = import("zod").infer<typeof supplyFinishMintingRequestSchemas.body>;
export type SupplyGetMaximumPath = import("zod").infer<typeof supplyGetMaximumRequestSchemas.path>;
export type SupplyGetMaximumQuery = import("zod").infer<typeof supplyGetMaximumRequestSchemas.query>;
export type SupplyGetMaximumBody = import("zod").infer<typeof supplyGetMaximumRequestSchemas.body>;
export type SupplyIsMintingFinishedPath = import("zod").infer<typeof supplyIsMintingFinishedRequestSchemas.path>;
export type SupplyIsMintingFinishedQuery = import("zod").infer<typeof supplyIsMintingFinishedRequestSchemas.query>;
export type SupplyIsMintingFinishedBody = import("zod").infer<typeof supplyIsMintingFinishedRequestSchemas.body>;
export type SupplyMintTokensPath = import("zod").infer<typeof supplyMintTokensRequestSchemas.path>;
export type SupplyMintTokensQuery = import("zod").infer<typeof supplyMintTokensRequestSchemas.query>;
export type SupplyMintTokensBody = import("zod").infer<typeof supplyMintTokensRequestSchemas.body>;
export type SupplySetMaximumPath = import("zod").infer<typeof supplySetMaximumRequestSchemas.path>;
export type SupplySetMaximumQuery = import("zod").infer<typeof supplySetMaximumRequestSchemas.query>;
export type SupplySetMaximumBody = import("zod").infer<typeof supplySetMaximumRequestSchemas.body>;
export type ThresholdBurnExcessPath = import("zod").infer<typeof thresholdBurnExcessRequestSchemas.path>;
export type ThresholdBurnExcessQuery = import("zod").infer<typeof thresholdBurnExcessRequestSchemas.query>;
export type ThresholdBurnExcessBody = import("zod").infer<typeof thresholdBurnExcessRequestSchemas.body>;
export type ThresholdBurnTokensPath = import("zod").infer<typeof thresholdBurnTokensRequestSchemas.path>;
export type ThresholdBurnTokensQuery = import("zod").infer<typeof thresholdBurnTokensRequestSchemas.query>;
export type ThresholdBurnTokensBody = import("zod").infer<typeof thresholdBurnTokensRequestSchemas.body>;
export type ThresholdBurnTokensFromPath = import("zod").infer<typeof thresholdBurnTokensFromRequestSchemas.path>;
export type ThresholdBurnTokensFromQuery = import("zod").infer<typeof thresholdBurnTokensFromRequestSchemas.query>;
export type ThresholdBurnTokensFromBody = import("zod").infer<typeof thresholdBurnTokensFromRequestSchemas.body>;
export type ThresholdCalculateExcessPath = import("zod").infer<typeof thresholdCalculateExcessRequestSchemas.path>;
export type ThresholdCalculateExcessQuery = import("zod").infer<typeof thresholdCalculateExcessRequestSchemas.query>;
export type ThresholdCalculateExcessBody = import("zod").infer<typeof thresholdCalculateExcessRequestSchemas.body>;
export type ThresholdGetBurnLimitPath = import("zod").infer<typeof thresholdGetBurnLimitRequestSchemas.path>;
export type ThresholdGetBurnLimitQuery = import("zod").infer<typeof thresholdGetBurnLimitRequestSchemas.query>;
export type ThresholdGetBurnLimitBody = import("zod").infer<typeof thresholdGetBurnLimitRequestSchemas.body>;
export type ThresholdSetBurnLimitPath = import("zod").infer<typeof thresholdSetBurnLimitRequestSchemas.path>;
export type ThresholdSetBurnLimitQuery = import("zod").infer<typeof thresholdSetBurnLimitRequestSchemas.query>;
export type ThresholdSetBurnLimitBody = import("zod").infer<typeof thresholdSetBurnLimitRequestSchemas.body>;
export type TokenAllowancePath = import("zod").infer<typeof tokenAllowanceRequestSchemas.path>;
export type TokenAllowanceQuery = import("zod").infer<typeof tokenAllowanceRequestSchemas.query>;
export type TokenAllowanceBody = import("zod").infer<typeof tokenAllowanceRequestSchemas.body>;
export type TokenApprovePath = import("zod").infer<typeof tokenApproveRequestSchemas.path>;
export type TokenApproveQuery = import("zod").infer<typeof tokenApproveRequestSchemas.query>;
export type TokenApproveBody = import("zod").infer<typeof tokenApproveRequestSchemas.body>;
export type TokenBalanceOfPath = import("zod").infer<typeof tokenBalanceOfRequestSchemas.path>;
export type TokenBalanceOfQuery = import("zod").infer<typeof tokenBalanceOfRequestSchemas.query>;
export type TokenBalanceOfBody = import("zod").infer<typeof tokenBalanceOfRequestSchemas.body>;
export type TokenNamePath = import("zod").infer<typeof tokenNameRequestSchemas.path>;
export type TokenNameQuery = import("zod").infer<typeof tokenNameRequestSchemas.query>;
export type TokenNameBody = import("zod").infer<typeof tokenNameRequestSchemas.body>;
export type TokenSymbolPath = import("zod").infer<typeof tokenSymbolRequestSchemas.path>;
export type TokenSymbolQuery = import("zod").infer<typeof tokenSymbolRequestSchemas.query>;
export type TokenSymbolBody = import("zod").infer<typeof tokenSymbolRequestSchemas.body>;
export type TokenTransferFromPath = import("zod").infer<typeof tokenTransferFromRequestSchemas.path>;
export type TokenTransferFromQuery = import("zod").infer<typeof tokenTransferFromRequestSchemas.query>;
export type TokenTransferFromBody = import("zod").infer<typeof tokenTransferFromRequestSchemas.body>;
export type TotalSupplyPath = import("zod").infer<typeof totalSupplyRequestSchemas.path>;
export type TotalSupplyQuery = import("zod").infer<typeof totalSupplyRequestSchemas.query>;
export type TotalSupplyBody = import("zod").infer<typeof totalSupplyRequestSchemas.body>;
export type TransferPath = import("zod").infer<typeof transferRequestSchemas.path>;
export type TransferQuery = import("zod").infer<typeof transferRequestSchemas.query>;
export type TransferBody = import("zod").infer<typeof transferRequestSchemas.body>;
export type TransferFromPath = import("zod").infer<typeof transferFromRequestSchemas.path>;
export type TransferFromQuery = import("zod").infer<typeof transferFromRequestSchemas.query>;
export type TransferFromBody = import("zod").infer<typeof transferFromRequestSchemas.body>;
export type TransferTwaveVestingPath = import("zod").infer<typeof transferTwaveVestingRequestSchemas.path>;
export type TransferTwaveVestingQuery = import("zod").infer<typeof transferTwaveVestingRequestSchemas.query>;
export type TransferTwaveVestingBody = import("zod").infer<typeof transferTwaveVestingRequestSchemas.body>;
export type TransferVestingSchedulePath = import("zod").infer<typeof transferVestingScheduleRequestSchemas.path>;
export type TransferVestingScheduleQuery = import("zod").infer<typeof transferVestingScheduleRequestSchemas.query>;
export type TransferVestingScheduleBody = import("zod").infer<typeof transferVestingScheduleRequestSchemas.body>;
export type UnpauseCampaignPath = import("zod").infer<typeof unpauseCampaignRequestSchemas.path>;
export type UnpauseCampaignQuery = import("zod").infer<typeof unpauseCampaignRequestSchemas.query>;
export type UnpauseCampaignBody = import("zod").infer<typeof unpauseCampaignRequestSchemas.body>;
export type VeGetRoleAdminPath = import("zod").infer<typeof veGetRoleAdminRequestSchemas.path>;
export type VeGetRoleAdminQuery = import("zod").infer<typeof veGetRoleAdminRequestSchemas.query>;
export type VeGetRoleAdminBody = import("zod").infer<typeof veGetRoleAdminRequestSchemas.body>;
export type VeGetVestingSchedulePath = import("zod").infer<typeof veGetVestingScheduleRequestSchemas.path>;
export type VeGetVestingScheduleQuery = import("zod").infer<typeof veGetVestingScheduleRequestSchemas.query>;
export type VeGetVestingScheduleBody = import("zod").infer<typeof veGetVestingScheduleRequestSchemas.body>;
export type VeHasRolePath = import("zod").infer<typeof veHasRoleRequestSchemas.path>;
export type VeHasRoleQuery = import("zod").infer<typeof veHasRoleRequestSchemas.query>;
export type VeHasRoleBody = import("zod").infer<typeof veHasRoleRequestSchemas.body>;
export type VestedAmountPath = import("zod").infer<typeof vestedAmountRequestSchemas.path>;
export type VestedAmountQuery = import("zod").infer<typeof vestedAmountRequestSchemas.query>;
export type VestedAmountBody = import("zod").infer<typeof vestedAmountRequestSchemas.body>;
export type VeSupportsInterfacePath = import("zod").infer<typeof veSupportsInterfaceRequestSchemas.path>;
export type VeSupportsInterfaceQuery = import("zod").infer<typeof veSupportsInterfaceRequestSchemas.query>;
export type VeSupportsInterfaceBody = import("zod").infer<typeof veSupportsInterfaceRequestSchemas.body>;
export type ApprovalEventQueryBody = import("zod").infer<typeof approvalEventQueryRequestSchema.body>;
export type BeneficiaryTransferredEventQueryBody = import("zod").infer<typeof beneficiaryTransferredEventQueryRequestSchema.body>;
export type BurnThresholdTransferEventQueryBody = import("zod").infer<typeof burnThresholdTransferEventQueryRequestSchema.body>;
export type BurnThresholdUpdatedEventQueryBody = import("zod").infer<typeof burnThresholdUpdatedEventQueryRequestSchema.body>;
export type CampaignCapConfigEventQueryBody = import("zod").infer<typeof campaignCapConfigEventQueryRequestSchema.body>;
export type CampaignCreatedEventQueryBody = import("zod").infer<typeof campaignCreatedEventQueryRequestSchema.body>;
export type CampaignMerkleRootUpdatedEventQueryBody = import("zod").infer<typeof campaignMerkleRootUpdatedEventQueryRequestSchema.body>;
export type CampaignPausedEventQueryBody = import("zod").infer<typeof campaignPausedEventQueryRequestSchema.body>;
export type CampaignUnpausedEventQueryBody = import("zod").infer<typeof campaignUnpausedEventQueryRequestSchema.body>;
export type CampaignVestingConfigEventQueryBody = import("zod").infer<typeof campaignVestingConfigEventQueryRequestSchema.body>;
export type ClaimedEventQueryBody = import("zod").infer<typeof claimedEventQueryRequestSchema.body>;
export type MintingFinishedEventQueryBody = import("zod").infer<typeof mintingFinishedEventQueryRequestSchema.body>;
export type SaleRestrictionUpdatedEventQueryBody = import("zod").infer<typeof saleRestrictionUpdatedEventQueryRequestSchema.body>;
export type ThresholdBurnEventQueryBody = import("zod").infer<typeof thresholdBurnEventQueryRequestSchema.body>;
export type TokenInitializedEventQueryBody = import("zod").infer<typeof tokenInitializedEventQueryRequestSchema.body>;
export type TokensReleasedEventQueryBody = import("zod").infer<typeof tokensReleasedEventQueryRequestSchema.body>;
export type TokenSupplyTransferEventQueryBody = import("zod").infer<typeof tokenSupplyTransferEventQueryRequestSchema.body>;
export type TokensVestedEventQueryBody = import("zod").infer<typeof tokensVestedEventQueryRequestSchema.body>;
export type VestingInitializedEventQueryBody = import("zod").infer<typeof vestingInitializedEventQueryRequestSchema.body>;
export type VestingPausedEventQueryBody = import("zod").infer<typeof vestingPausedEventQueryRequestSchema.body>;
export type VestingRevokedEventQueryBody = import("zod").infer<typeof vestingRevokedEventQueryRequestSchema.body>;
export type VestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQueryBody = import("zod").infer<typeof vestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQueryRequestSchema.body>;
export type VestingScheduleCreatedEventQueryBody = import("zod").infer<typeof vestingScheduleCreatedEventQueryRequestSchema.body>;
export type VestingScheduleRevokedEventQueryBody = import("zod").infer<typeof vestingScheduleRevokedEventQueryRequestSchema.body>;
export type VestingTransferredEventQueryBody = import("zod").infer<typeof vestingTransferredEventQueryRequestSchema.body>;
export type VestingUnpausedEventQueryBody = import("zod").infer<typeof vestingUnpausedEventQueryRequestSchema.body>;
