import {
  approveMultisigWithdrawalRequestSchemas,
  cancelListingRequestSchemas,
  commitDistributionRequestSchemas,
  commitWithdrawRequestSchemas,
  distributePaymentRequestSchemas,
  distributePaymentFromRequestSchemas,
  distributePaymentFromWithDeadlineRequestSchemas,
  distributePaymentWithDeadlineRequestSchemas,
  escrowAssetRequestSchemas,
  executeMultisigWithdrawalRequestSchemas,
  executeQuarterlyBuybackRequestSchemas,
  getAssetRevenueRequestSchemas,
  getAssetStateRequestSchemas,
  getBuybackStatusRequestSchemas,
  getDevFundAddressRequestSchemas,
  getFeeConfigurationRequestSchemas,
  getListingRequestSchemas,
  getMevProtectionConfigRequestSchemas,
  getOriginalOwnerRequestSchemas,
  getPendingPaymentsRequestSchemas,
  getPendingTimewaveGiftRequestSchemas,
  getRevenueMetricsRequestSchemas,
  getTreasuryAddressRequestSchemas,
  getTreasuryWithdrawalLimitRequestSchemas,
  getUnionTreasuryAddressRequestSchemas,
  getUsdcTokenRequestSchemas,
  isInEscrowRequestSchemas,
  isPausedRequestSchemas,
  listAssetRequestSchemas,
  onErc721ReceivedRequestSchemas,
  pauseRequestSchemas,
  pauseBuybacksRequestSchemas,
  paymentPausedRequestSchemas,
  purchaseAssetRequestSchemas,
  releaseAssetRequestSchemas,
  revealDistributionRequestSchemas,
  revealWithdrawRequestSchemas,
  setBuybackConfigRequestSchemas,
  setMevProtectionConfigRequestSchemas,
  setPaymentPausedRequestSchemas,
  setStakingConfigRequestSchemas,
  setTreasuryWithdrawalLimitRequestSchemas,
  setUsdcTokenRequestSchemas,
  unpauseRequestSchemas,
  updateAssetStateRequestSchemas,
  updateDevFundAddressRequestSchemas,
  updateFeeConfigurationRequestSchemas,
  updateListingPriceRequestSchemas,
  updateTreasuryAddressRequestSchemas,
  updateUnionTreasuryAddressRequestSchemas,
  withdrawPaymentsRequestSchemas,
  withdrawPaymentsWithDeadlineRequestSchemas,
  assetListedEventQueryRequestSchema,
  assetPurchasedEventQueryRequestSchema,
  assetReleasedEventQueryRequestSchema,
  assetStateUpdatedEventQueryRequestSchema,
  buybackAccumulatorUpdatedEventQueryRequestSchema,
  buybackConfigUpdatedEventQueryRequestSchema,
  buybackExecutedEventQueryRequestSchema,
  buybackPausedEventQueryRequestSchema,
  claimCommittedEventQueryRequestSchema,
  claimRevealedEventQueryRequestSchema,
  datasetRoyaltyAccruedEventQueryRequestSchema,
  devFundAddressUpdatedEventQueryRequestSchema,
  escrowAssetEscrowedEventQueryRequestSchema,
  feeConfigurationUpdatedEventQueryRequestSchema,
  flashbotsSuggestedEventQueryRequestSchema,
  listingCancelledEventQueryRequestSchema,
  listingPriceUpdatedEventQueryRequestSchema,
  marketplaceAssetEscrowedEventQueryRequestSchema,
  marketplacePausedEventQueryRequestSchema,
  marketplaceUnpausedEventQueryRequestSchema,
  metadataAccessedEventQueryRequestSchema,
  pauseStateChangedEventQueryRequestSchema,
  paymentDistributedEventQueryRequestSchema,
  timewaveGiftCreatedEventQueryRequestSchema,
  treasuryAddressUpdatedEventQueryRequestSchema,
  unionTreasuryAddressUpdatedEventQueryRequestSchema,
  usdcpaymentWithdrawnEventQueryRequestSchema,
  usdcTokenUpdatedEventQueryRequestSchema,
  withdrawalLimitUpdatedEventQueryRequestSchema,
} from "./schemas.js";

export type ApproveMultisigWithdrawalPath = import("zod").infer<typeof approveMultisigWithdrawalRequestSchemas.path>;
export type ApproveMultisigWithdrawalQuery = import("zod").infer<typeof approveMultisigWithdrawalRequestSchemas.query>;
export type ApproveMultisigWithdrawalBody = import("zod").infer<typeof approveMultisigWithdrawalRequestSchemas.body>;
export type CancelListingPath = import("zod").infer<typeof cancelListingRequestSchemas.path>;
export type CancelListingQuery = import("zod").infer<typeof cancelListingRequestSchemas.query>;
export type CancelListingBody = import("zod").infer<typeof cancelListingRequestSchemas.body>;
export type CommitDistributionPath = import("zod").infer<typeof commitDistributionRequestSchemas.path>;
export type CommitDistributionQuery = import("zod").infer<typeof commitDistributionRequestSchemas.query>;
export type CommitDistributionBody = import("zod").infer<typeof commitDistributionRequestSchemas.body>;
export type CommitWithdrawPath = import("zod").infer<typeof commitWithdrawRequestSchemas.path>;
export type CommitWithdrawQuery = import("zod").infer<typeof commitWithdrawRequestSchemas.query>;
export type CommitWithdrawBody = import("zod").infer<typeof commitWithdrawRequestSchemas.body>;
export type DistributePaymentPath = import("zod").infer<typeof distributePaymentRequestSchemas.path>;
export type DistributePaymentQuery = import("zod").infer<typeof distributePaymentRequestSchemas.query>;
export type DistributePaymentBody = import("zod").infer<typeof distributePaymentRequestSchemas.body>;
export type DistributePaymentFromPath = import("zod").infer<typeof distributePaymentFromRequestSchemas.path>;
export type DistributePaymentFromQuery = import("zod").infer<typeof distributePaymentFromRequestSchemas.query>;
export type DistributePaymentFromBody = import("zod").infer<typeof distributePaymentFromRequestSchemas.body>;
export type DistributePaymentFromWithDeadlinePath = import("zod").infer<typeof distributePaymentFromWithDeadlineRequestSchemas.path>;
export type DistributePaymentFromWithDeadlineQuery = import("zod").infer<typeof distributePaymentFromWithDeadlineRequestSchemas.query>;
export type DistributePaymentFromWithDeadlineBody = import("zod").infer<typeof distributePaymentFromWithDeadlineRequestSchemas.body>;
export type DistributePaymentWithDeadlinePath = import("zod").infer<typeof distributePaymentWithDeadlineRequestSchemas.path>;
export type DistributePaymentWithDeadlineQuery = import("zod").infer<typeof distributePaymentWithDeadlineRequestSchemas.query>;
export type DistributePaymentWithDeadlineBody = import("zod").infer<typeof distributePaymentWithDeadlineRequestSchemas.body>;
export type EscrowAssetPath = import("zod").infer<typeof escrowAssetRequestSchemas.path>;
export type EscrowAssetQuery = import("zod").infer<typeof escrowAssetRequestSchemas.query>;
export type EscrowAssetBody = import("zod").infer<typeof escrowAssetRequestSchemas.body>;
export type ExecuteMultisigWithdrawalPath = import("zod").infer<typeof executeMultisigWithdrawalRequestSchemas.path>;
export type ExecuteMultisigWithdrawalQuery = import("zod").infer<typeof executeMultisigWithdrawalRequestSchemas.query>;
export type ExecuteMultisigWithdrawalBody = import("zod").infer<typeof executeMultisigWithdrawalRequestSchemas.body>;
export type ExecuteQuarterlyBuybackPath = import("zod").infer<typeof executeQuarterlyBuybackRequestSchemas.path>;
export type ExecuteQuarterlyBuybackQuery = import("zod").infer<typeof executeQuarterlyBuybackRequestSchemas.query>;
export type ExecuteQuarterlyBuybackBody = import("zod").infer<typeof executeQuarterlyBuybackRequestSchemas.body>;
export type GetAssetRevenuePath = import("zod").infer<typeof getAssetRevenueRequestSchemas.path>;
export type GetAssetRevenueQuery = import("zod").infer<typeof getAssetRevenueRequestSchemas.query>;
export type GetAssetRevenueBody = import("zod").infer<typeof getAssetRevenueRequestSchemas.body>;
export type GetAssetStatePath = import("zod").infer<typeof getAssetStateRequestSchemas.path>;
export type GetAssetStateQuery = import("zod").infer<typeof getAssetStateRequestSchemas.query>;
export type GetAssetStateBody = import("zod").infer<typeof getAssetStateRequestSchemas.body>;
export type GetBuybackStatusPath = import("zod").infer<typeof getBuybackStatusRequestSchemas.path>;
export type GetBuybackStatusQuery = import("zod").infer<typeof getBuybackStatusRequestSchemas.query>;
export type GetBuybackStatusBody = import("zod").infer<typeof getBuybackStatusRequestSchemas.body>;
export type GetDevFundAddressPath = import("zod").infer<typeof getDevFundAddressRequestSchemas.path>;
export type GetDevFundAddressQuery = import("zod").infer<typeof getDevFundAddressRequestSchemas.query>;
export type GetDevFundAddressBody = import("zod").infer<typeof getDevFundAddressRequestSchemas.body>;
export type GetFeeConfigurationPath = import("zod").infer<typeof getFeeConfigurationRequestSchemas.path>;
export type GetFeeConfigurationQuery = import("zod").infer<typeof getFeeConfigurationRequestSchemas.query>;
export type GetFeeConfigurationBody = import("zod").infer<typeof getFeeConfigurationRequestSchemas.body>;
export type GetListingPath = import("zod").infer<typeof getListingRequestSchemas.path>;
export type GetListingQuery = import("zod").infer<typeof getListingRequestSchemas.query>;
export type GetListingBody = import("zod").infer<typeof getListingRequestSchemas.body>;
export type GetMevProtectionConfigPath = import("zod").infer<typeof getMevProtectionConfigRequestSchemas.path>;
export type GetMevProtectionConfigQuery = import("zod").infer<typeof getMevProtectionConfigRequestSchemas.query>;
export type GetMevProtectionConfigBody = import("zod").infer<typeof getMevProtectionConfigRequestSchemas.body>;
export type GetOriginalOwnerPath = import("zod").infer<typeof getOriginalOwnerRequestSchemas.path>;
export type GetOriginalOwnerQuery = import("zod").infer<typeof getOriginalOwnerRequestSchemas.query>;
export type GetOriginalOwnerBody = import("zod").infer<typeof getOriginalOwnerRequestSchemas.body>;
export type GetPendingPaymentsPath = import("zod").infer<typeof getPendingPaymentsRequestSchemas.path>;
export type GetPendingPaymentsQuery = import("zod").infer<typeof getPendingPaymentsRequestSchemas.query>;
export type GetPendingPaymentsBody = import("zod").infer<typeof getPendingPaymentsRequestSchemas.body>;
export type GetPendingTimewaveGiftPath = import("zod").infer<typeof getPendingTimewaveGiftRequestSchemas.path>;
export type GetPendingTimewaveGiftQuery = import("zod").infer<typeof getPendingTimewaveGiftRequestSchemas.query>;
export type GetPendingTimewaveGiftBody = import("zod").infer<typeof getPendingTimewaveGiftRequestSchemas.body>;
export type GetRevenueMetricsPath = import("zod").infer<typeof getRevenueMetricsRequestSchemas.path>;
export type GetRevenueMetricsQuery = import("zod").infer<typeof getRevenueMetricsRequestSchemas.query>;
export type GetRevenueMetricsBody = import("zod").infer<typeof getRevenueMetricsRequestSchemas.body>;
export type GetTreasuryAddressPath = import("zod").infer<typeof getTreasuryAddressRequestSchemas.path>;
export type GetTreasuryAddressQuery = import("zod").infer<typeof getTreasuryAddressRequestSchemas.query>;
export type GetTreasuryAddressBody = import("zod").infer<typeof getTreasuryAddressRequestSchemas.body>;
export type GetTreasuryWithdrawalLimitPath = import("zod").infer<typeof getTreasuryWithdrawalLimitRequestSchemas.path>;
export type GetTreasuryWithdrawalLimitQuery = import("zod").infer<typeof getTreasuryWithdrawalLimitRequestSchemas.query>;
export type GetTreasuryWithdrawalLimitBody = import("zod").infer<typeof getTreasuryWithdrawalLimitRequestSchemas.body>;
export type GetUnionTreasuryAddressPath = import("zod").infer<typeof getUnionTreasuryAddressRequestSchemas.path>;
export type GetUnionTreasuryAddressQuery = import("zod").infer<typeof getUnionTreasuryAddressRequestSchemas.query>;
export type GetUnionTreasuryAddressBody = import("zod").infer<typeof getUnionTreasuryAddressRequestSchemas.body>;
export type GetUsdcTokenPath = import("zod").infer<typeof getUsdcTokenRequestSchemas.path>;
export type GetUsdcTokenQuery = import("zod").infer<typeof getUsdcTokenRequestSchemas.query>;
export type GetUsdcTokenBody = import("zod").infer<typeof getUsdcTokenRequestSchemas.body>;
export type IsInEscrowPath = import("zod").infer<typeof isInEscrowRequestSchemas.path>;
export type IsInEscrowQuery = import("zod").infer<typeof isInEscrowRequestSchemas.query>;
export type IsInEscrowBody = import("zod").infer<typeof isInEscrowRequestSchemas.body>;
export type IsPausedPath = import("zod").infer<typeof isPausedRequestSchemas.path>;
export type IsPausedQuery = import("zod").infer<typeof isPausedRequestSchemas.query>;
export type IsPausedBody = import("zod").infer<typeof isPausedRequestSchemas.body>;
export type ListAssetPath = import("zod").infer<typeof listAssetRequestSchemas.path>;
export type ListAssetQuery = import("zod").infer<typeof listAssetRequestSchemas.query>;
export type ListAssetBody = import("zod").infer<typeof listAssetRequestSchemas.body>;
export type OnErc721ReceivedPath = import("zod").infer<typeof onErc721ReceivedRequestSchemas.path>;
export type OnErc721ReceivedQuery = import("zod").infer<typeof onErc721ReceivedRequestSchemas.query>;
export type OnErc721ReceivedBody = import("zod").infer<typeof onErc721ReceivedRequestSchemas.body>;
export type PausePath = import("zod").infer<typeof pauseRequestSchemas.path>;
export type PauseQuery = import("zod").infer<typeof pauseRequestSchemas.query>;
export type PauseBody = import("zod").infer<typeof pauseRequestSchemas.body>;
export type PauseBuybacksPath = import("zod").infer<typeof pauseBuybacksRequestSchemas.path>;
export type PauseBuybacksQuery = import("zod").infer<typeof pauseBuybacksRequestSchemas.query>;
export type PauseBuybacksBody = import("zod").infer<typeof pauseBuybacksRequestSchemas.body>;
export type PaymentPausedPath = import("zod").infer<typeof paymentPausedRequestSchemas.path>;
export type PaymentPausedQuery = import("zod").infer<typeof paymentPausedRequestSchemas.query>;
export type PaymentPausedBody = import("zod").infer<typeof paymentPausedRequestSchemas.body>;
export type PurchaseAssetPath = import("zod").infer<typeof purchaseAssetRequestSchemas.path>;
export type PurchaseAssetQuery = import("zod").infer<typeof purchaseAssetRequestSchemas.query>;
export type PurchaseAssetBody = import("zod").infer<typeof purchaseAssetRequestSchemas.body>;
export type ReleaseAssetPath = import("zod").infer<typeof releaseAssetRequestSchemas.path>;
export type ReleaseAssetQuery = import("zod").infer<typeof releaseAssetRequestSchemas.query>;
export type ReleaseAssetBody = import("zod").infer<typeof releaseAssetRequestSchemas.body>;
export type RevealDistributionPath = import("zod").infer<typeof revealDistributionRequestSchemas.path>;
export type RevealDistributionQuery = import("zod").infer<typeof revealDistributionRequestSchemas.query>;
export type RevealDistributionBody = import("zod").infer<typeof revealDistributionRequestSchemas.body>;
export type RevealWithdrawPath = import("zod").infer<typeof revealWithdrawRequestSchemas.path>;
export type RevealWithdrawQuery = import("zod").infer<typeof revealWithdrawRequestSchemas.query>;
export type RevealWithdrawBody = import("zod").infer<typeof revealWithdrawRequestSchemas.body>;
export type SetBuybackConfigPath = import("zod").infer<typeof setBuybackConfigRequestSchemas.path>;
export type SetBuybackConfigQuery = import("zod").infer<typeof setBuybackConfigRequestSchemas.query>;
export type SetBuybackConfigBody = import("zod").infer<typeof setBuybackConfigRequestSchemas.body>;
export type SetMevProtectionConfigPath = import("zod").infer<typeof setMevProtectionConfigRequestSchemas.path>;
export type SetMevProtectionConfigQuery = import("zod").infer<typeof setMevProtectionConfigRequestSchemas.query>;
export type SetMevProtectionConfigBody = import("zod").infer<typeof setMevProtectionConfigRequestSchemas.body>;
export type SetPaymentPausedPath = import("zod").infer<typeof setPaymentPausedRequestSchemas.path>;
export type SetPaymentPausedQuery = import("zod").infer<typeof setPaymentPausedRequestSchemas.query>;
export type SetPaymentPausedBody = import("zod").infer<typeof setPaymentPausedRequestSchemas.body>;
export type SetStakingConfigPath = import("zod").infer<typeof setStakingConfigRequestSchemas.path>;
export type SetStakingConfigQuery = import("zod").infer<typeof setStakingConfigRequestSchemas.query>;
export type SetStakingConfigBody = import("zod").infer<typeof setStakingConfigRequestSchemas.body>;
export type SetTreasuryWithdrawalLimitPath = import("zod").infer<typeof setTreasuryWithdrawalLimitRequestSchemas.path>;
export type SetTreasuryWithdrawalLimitQuery = import("zod").infer<typeof setTreasuryWithdrawalLimitRequestSchemas.query>;
export type SetTreasuryWithdrawalLimitBody = import("zod").infer<typeof setTreasuryWithdrawalLimitRequestSchemas.body>;
export type SetUsdcTokenPath = import("zod").infer<typeof setUsdcTokenRequestSchemas.path>;
export type SetUsdcTokenQuery = import("zod").infer<typeof setUsdcTokenRequestSchemas.query>;
export type SetUsdcTokenBody = import("zod").infer<typeof setUsdcTokenRequestSchemas.body>;
export type UnpausePath = import("zod").infer<typeof unpauseRequestSchemas.path>;
export type UnpauseQuery = import("zod").infer<typeof unpauseRequestSchemas.query>;
export type UnpauseBody = import("zod").infer<typeof unpauseRequestSchemas.body>;
export type UpdateAssetStatePath = import("zod").infer<typeof updateAssetStateRequestSchemas.path>;
export type UpdateAssetStateQuery = import("zod").infer<typeof updateAssetStateRequestSchemas.query>;
export type UpdateAssetStateBody = import("zod").infer<typeof updateAssetStateRequestSchemas.body>;
export type UpdateDevFundAddressPath = import("zod").infer<typeof updateDevFundAddressRequestSchemas.path>;
export type UpdateDevFundAddressQuery = import("zod").infer<typeof updateDevFundAddressRequestSchemas.query>;
export type UpdateDevFundAddressBody = import("zod").infer<typeof updateDevFundAddressRequestSchemas.body>;
export type UpdateFeeConfigurationPath = import("zod").infer<typeof updateFeeConfigurationRequestSchemas.path>;
export type UpdateFeeConfigurationQuery = import("zod").infer<typeof updateFeeConfigurationRequestSchemas.query>;
export type UpdateFeeConfigurationBody = import("zod").infer<typeof updateFeeConfigurationRequestSchemas.body>;
export type UpdateListingPricePath = import("zod").infer<typeof updateListingPriceRequestSchemas.path>;
export type UpdateListingPriceQuery = import("zod").infer<typeof updateListingPriceRequestSchemas.query>;
export type UpdateListingPriceBody = import("zod").infer<typeof updateListingPriceRequestSchemas.body>;
export type UpdateTreasuryAddressPath = import("zod").infer<typeof updateTreasuryAddressRequestSchemas.path>;
export type UpdateTreasuryAddressQuery = import("zod").infer<typeof updateTreasuryAddressRequestSchemas.query>;
export type UpdateTreasuryAddressBody = import("zod").infer<typeof updateTreasuryAddressRequestSchemas.body>;
export type UpdateUnionTreasuryAddressPath = import("zod").infer<typeof updateUnionTreasuryAddressRequestSchemas.path>;
export type UpdateUnionTreasuryAddressQuery = import("zod").infer<typeof updateUnionTreasuryAddressRequestSchemas.query>;
export type UpdateUnionTreasuryAddressBody = import("zod").infer<typeof updateUnionTreasuryAddressRequestSchemas.body>;
export type WithdrawPaymentsPath = import("zod").infer<typeof withdrawPaymentsRequestSchemas.path>;
export type WithdrawPaymentsQuery = import("zod").infer<typeof withdrawPaymentsRequestSchemas.query>;
export type WithdrawPaymentsBody = import("zod").infer<typeof withdrawPaymentsRequestSchemas.body>;
export type WithdrawPaymentsWithDeadlinePath = import("zod").infer<typeof withdrawPaymentsWithDeadlineRequestSchemas.path>;
export type WithdrawPaymentsWithDeadlineQuery = import("zod").infer<typeof withdrawPaymentsWithDeadlineRequestSchemas.query>;
export type WithdrawPaymentsWithDeadlineBody = import("zod").infer<typeof withdrawPaymentsWithDeadlineRequestSchemas.body>;
export type AssetListedEventQueryBody = import("zod").infer<typeof assetListedEventQueryRequestSchema.body>;
export type AssetPurchasedEventQueryBody = import("zod").infer<typeof assetPurchasedEventQueryRequestSchema.body>;
export type AssetReleasedEventQueryBody = import("zod").infer<typeof assetReleasedEventQueryRequestSchema.body>;
export type AssetStateUpdatedEventQueryBody = import("zod").infer<typeof assetStateUpdatedEventQueryRequestSchema.body>;
export type BuybackAccumulatorUpdatedEventQueryBody = import("zod").infer<typeof buybackAccumulatorUpdatedEventQueryRequestSchema.body>;
export type BuybackConfigUpdatedEventQueryBody = import("zod").infer<typeof buybackConfigUpdatedEventQueryRequestSchema.body>;
export type BuybackExecutedEventQueryBody = import("zod").infer<typeof buybackExecutedEventQueryRequestSchema.body>;
export type BuybackPausedEventQueryBody = import("zod").infer<typeof buybackPausedEventQueryRequestSchema.body>;
export type ClaimCommittedEventQueryBody = import("zod").infer<typeof claimCommittedEventQueryRequestSchema.body>;
export type ClaimRevealedEventQueryBody = import("zod").infer<typeof claimRevealedEventQueryRequestSchema.body>;
export type DatasetRoyaltyAccruedEventQueryBody = import("zod").infer<typeof datasetRoyaltyAccruedEventQueryRequestSchema.body>;
export type DevFundAddressUpdatedEventQueryBody = import("zod").infer<typeof devFundAddressUpdatedEventQueryRequestSchema.body>;
export type EscrowAssetEscrowedEventQueryBody = import("zod").infer<typeof escrowAssetEscrowedEventQueryRequestSchema.body>;
export type FeeConfigurationUpdatedEventQueryBody = import("zod").infer<typeof feeConfigurationUpdatedEventQueryRequestSchema.body>;
export type FlashbotsSuggestedEventQueryBody = import("zod").infer<typeof flashbotsSuggestedEventQueryRequestSchema.body>;
export type ListingCancelledEventQueryBody = import("zod").infer<typeof listingCancelledEventQueryRequestSchema.body>;
export type ListingPriceUpdatedEventQueryBody = import("zod").infer<typeof listingPriceUpdatedEventQueryRequestSchema.body>;
export type MarketplaceAssetEscrowedEventQueryBody = import("zod").infer<typeof marketplaceAssetEscrowedEventQueryRequestSchema.body>;
export type MarketplacePausedEventQueryBody = import("zod").infer<typeof marketplacePausedEventQueryRequestSchema.body>;
export type MarketplaceUnpausedEventQueryBody = import("zod").infer<typeof marketplaceUnpausedEventQueryRequestSchema.body>;
export type MetadataAccessedEventQueryBody = import("zod").infer<typeof metadataAccessedEventQueryRequestSchema.body>;
export type PauseStateChangedEventQueryBody = import("zod").infer<typeof pauseStateChangedEventQueryRequestSchema.body>;
export type PaymentDistributedEventQueryBody = import("zod").infer<typeof paymentDistributedEventQueryRequestSchema.body>;
export type TimewaveGiftCreatedEventQueryBody = import("zod").infer<typeof timewaveGiftCreatedEventQueryRequestSchema.body>;
export type TreasuryAddressUpdatedEventQueryBody = import("zod").infer<typeof treasuryAddressUpdatedEventQueryRequestSchema.body>;
export type UnionTreasuryAddressUpdatedEventQueryBody = import("zod").infer<typeof unionTreasuryAddressUpdatedEventQueryRequestSchema.body>;
export type UsdcpaymentWithdrawnEventQueryBody = import("zod").infer<typeof usdcpaymentWithdrawnEventQueryRequestSchema.body>;
export type UsdcTokenUpdatedEventQueryBody = import("zod").infer<typeof usdcTokenUpdatedEventQueryRequestSchema.body>;
export type WithdrawalLimitUpdatedEventQueryBody = import("zod").infer<typeof withdrawalLimitUpdatedEventQueryRequestSchema.body>;
