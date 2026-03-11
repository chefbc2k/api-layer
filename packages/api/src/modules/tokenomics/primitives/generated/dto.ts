import {
  allowanceRequestSchemas,
  approveRequestSchemas,
  balanceOfRequestSchemas,
  batchReleaseTwaveVestingRequestSchemas,
  burnRequestSchemas,
  burnFromRequestSchemas,
  canTransferVestingRequestSchemas,
  createUsdcVestingScheduleRequestSchemas,
  decimalsRequestSchemas,
  getMinTwaveVestingDurationRequestSchemas,
  getNextUnlockTimeRequestSchemas,
  getQuarterlyUnlockRateRequestSchemas,
  getReleasableTwaveAmountRequestSchemas,
  getVestedTwaveAmountRequestSchemas,
  getVestingTwaveScheduleRequestSchemas,
  initializeTokenRequestSchemas,
  isFullyVestedRequestSchemas,
  isVestingActiveRequestSchemas,
  nameRequestSchemas,
  releaseTwaveVestingRequestSchemas,
  releaseTwaveVestingForRequestSchemas,
  revokeTwaveVestingRequestSchemas,
  setMinimumTwaveVestingDurationRequestSchemas,
  setQuarterlyUnlockRateRequestSchemas,
  supplyFinishMintingRequestSchemas,
  supplyGetMaximumRequestSchemas,
  supplyIsMintingFinishedRequestSchemas,
  supplyMintTokensRequestSchemas,
  supplySetMaximumRequestSchemas,
  symbolRequestSchemas,
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
  approvalEventQueryRequestSchema,
  burnThresholdTransferEventQueryRequestSchema,
  burnThresholdUpdatedEventQueryRequestSchema,
  mintingFinishedEventQueryRequestSchema,
  thresholdBurnEventQueryRequestSchema,
  tokenInitializedEventQueryRequestSchema,
  tokenSupplyTransferEventQueryRequestSchema,
  tokensVestedEventQueryRequestSchema,
  vestingRevokedEventQueryRequestSchema,
  vestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQueryRequestSchema,
  vestingTransferredEventQueryRequestSchema,
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
export type CanTransferVestingPath = import("zod").infer<typeof canTransferVestingRequestSchemas.path>;
export type CanTransferVestingQuery = import("zod").infer<typeof canTransferVestingRequestSchemas.query>;
export type CanTransferVestingBody = import("zod").infer<typeof canTransferVestingRequestSchemas.body>;
export type CreateUsdcVestingSchedulePath = import("zod").infer<typeof createUsdcVestingScheduleRequestSchemas.path>;
export type CreateUsdcVestingScheduleQuery = import("zod").infer<typeof createUsdcVestingScheduleRequestSchemas.query>;
export type CreateUsdcVestingScheduleBody = import("zod").infer<typeof createUsdcVestingScheduleRequestSchemas.body>;
export type DecimalsPath = import("zod").infer<typeof decimalsRequestSchemas.path>;
export type DecimalsQuery = import("zod").infer<typeof decimalsRequestSchemas.query>;
export type DecimalsBody = import("zod").infer<typeof decimalsRequestSchemas.body>;
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
export type GetVestedTwaveAmountPath = import("zod").infer<typeof getVestedTwaveAmountRequestSchemas.path>;
export type GetVestedTwaveAmountQuery = import("zod").infer<typeof getVestedTwaveAmountRequestSchemas.query>;
export type GetVestedTwaveAmountBody = import("zod").infer<typeof getVestedTwaveAmountRequestSchemas.body>;
export type GetVestingTwaveSchedulePath = import("zod").infer<typeof getVestingTwaveScheduleRequestSchemas.path>;
export type GetVestingTwaveScheduleQuery = import("zod").infer<typeof getVestingTwaveScheduleRequestSchemas.query>;
export type GetVestingTwaveScheduleBody = import("zod").infer<typeof getVestingTwaveScheduleRequestSchemas.body>;
export type InitializeTokenPath = import("zod").infer<typeof initializeTokenRequestSchemas.path>;
export type InitializeTokenQuery = import("zod").infer<typeof initializeTokenRequestSchemas.query>;
export type InitializeTokenBody = import("zod").infer<typeof initializeTokenRequestSchemas.body>;
export type IsFullyVestedPath = import("zod").infer<typeof isFullyVestedRequestSchemas.path>;
export type IsFullyVestedQuery = import("zod").infer<typeof isFullyVestedRequestSchemas.query>;
export type IsFullyVestedBody = import("zod").infer<typeof isFullyVestedRequestSchemas.body>;
export type IsVestingActivePath = import("zod").infer<typeof isVestingActiveRequestSchemas.path>;
export type IsVestingActiveQuery = import("zod").infer<typeof isVestingActiveRequestSchemas.query>;
export type IsVestingActiveBody = import("zod").infer<typeof isVestingActiveRequestSchemas.body>;
export type NamePath = import("zod").infer<typeof nameRequestSchemas.path>;
export type NameQuery = import("zod").infer<typeof nameRequestSchemas.query>;
export type NameBody = import("zod").infer<typeof nameRequestSchemas.body>;
export type ReleaseTwaveVestingPath = import("zod").infer<typeof releaseTwaveVestingRequestSchemas.path>;
export type ReleaseTwaveVestingQuery = import("zod").infer<typeof releaseTwaveVestingRequestSchemas.query>;
export type ReleaseTwaveVestingBody = import("zod").infer<typeof releaseTwaveVestingRequestSchemas.body>;
export type ReleaseTwaveVestingForPath = import("zod").infer<typeof releaseTwaveVestingForRequestSchemas.path>;
export type ReleaseTwaveVestingForQuery = import("zod").infer<typeof releaseTwaveVestingForRequestSchemas.query>;
export type ReleaseTwaveVestingForBody = import("zod").infer<typeof releaseTwaveVestingForRequestSchemas.body>;
export type RevokeTwaveVestingPath = import("zod").infer<typeof revokeTwaveVestingRequestSchemas.path>;
export type RevokeTwaveVestingQuery = import("zod").infer<typeof revokeTwaveVestingRequestSchemas.query>;
export type RevokeTwaveVestingBody = import("zod").infer<typeof revokeTwaveVestingRequestSchemas.body>;
export type SetMinimumTwaveVestingDurationPath = import("zod").infer<typeof setMinimumTwaveVestingDurationRequestSchemas.path>;
export type SetMinimumTwaveVestingDurationQuery = import("zod").infer<typeof setMinimumTwaveVestingDurationRequestSchemas.query>;
export type SetMinimumTwaveVestingDurationBody = import("zod").infer<typeof setMinimumTwaveVestingDurationRequestSchemas.body>;
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
export type SymbolPath = import("zod").infer<typeof symbolRequestSchemas.path>;
export type SymbolQuery = import("zod").infer<typeof symbolRequestSchemas.query>;
export type SymbolBody = import("zod").infer<typeof symbolRequestSchemas.body>;
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
export type ApprovalEventQueryBody = import("zod").infer<typeof approvalEventQueryRequestSchema.body>;
export type BurnThresholdTransferEventQueryBody = import("zod").infer<typeof burnThresholdTransferEventQueryRequestSchema.body>;
export type BurnThresholdUpdatedEventQueryBody = import("zod").infer<typeof burnThresholdUpdatedEventQueryRequestSchema.body>;
export type MintingFinishedEventQueryBody = import("zod").infer<typeof mintingFinishedEventQueryRequestSchema.body>;
export type ThresholdBurnEventQueryBody = import("zod").infer<typeof thresholdBurnEventQueryRequestSchema.body>;
export type TokenInitializedEventQueryBody = import("zod").infer<typeof tokenInitializedEventQueryRequestSchema.body>;
export type TokenSupplyTransferEventQueryBody = import("zod").infer<typeof tokenSupplyTransferEventQueryRequestSchema.body>;
export type TokensVestedEventQueryBody = import("zod").infer<typeof tokensVestedEventQueryRequestSchema.body>;
export type VestingRevokedEventQueryBody = import("zod").infer<typeof vestingRevokedEventQueryRequestSchema.body>;
export type VestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQueryBody = import("zod").infer<typeof vestingScheduleCreatedAddressUint256Uint256Uint256Uint256BoolEventQueryRequestSchema.body>;
export type VestingTransferredEventQueryBody = import("zod").infer<typeof vestingTransferredEventQueryRequestSchema.body>;
