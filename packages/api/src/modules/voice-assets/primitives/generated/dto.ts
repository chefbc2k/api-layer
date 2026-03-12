import {
  addBeneficiaryRequestSchemas,
  addDatasetsRequestSchemas,
  addInheritanceRequirementRequestSchemas,
  addVoiceAssetsRequestSchemas,
  approveInheritanceRequestSchemas,
  approveVoiceAssetRequestSchemas,
  authorizeUserRequestSchemas,
  createLegacyPlanRequestSchemas,
  customizeRoyaltyRateRequestSchemas,
  delegateRightsRequestSchemas,
  executeInheritanceRequestSchemas,
  getApprovedRequestSchemas,
  getBasicAcousticFeaturesRequestSchemas,
  getDefaultPlatformFeeRequestSchemas,
  getDefaultRoyaltyRateRequestSchemas,
  getGeographicDataRequestSchemas,
  getLegacyPlanRequestSchemas,
  getMaxRoyaltyRateRequestSchemas,
  getRoyaltyHistoryRequestSchemas,
  getTokenIdRequestSchemas,
  getUserVoicesRequestSchemas,
  getVoiceAssetRequestSchemas,
  getVoiceAssetDetailsRequestSchemas,
  getVoiceAssetsByOwnerRequestSchemas,
  getVoiceCategoriesRequestSchemas,
  getVoiceClassificationsRequestSchemas,
  getVoiceHashRequestSchemas,
  getVoiceHashFromTokenIdRequestSchemas,
  initiateInheritanceRequestSchemas,
  isApprovedForAllRequestSchemas,
  isAuthorizedRequestSchemas,
  isInheritanceReadyRequestSchemas,
  isRegistrationPausedRequestSchemas,
  lockVoiceAssetRequestSchemas,
  nameRequestSchemas,
  ownerOfRequestSchemas,
  recordRoyaltyPaymentRequestSchemas,
  recordRoyaltyPaymentFromRequestSchemas,
  recordUsageRequestSchemas,
  recordUsageFromRequestSchemas,
  registerVoiceAssetRequestSchemas,
  registerVoiceAssetForCallerRequestSchemas,
  revokeUserRequestSchemas,
  safeTransferFromAddressAddressUint256RequestSchemas,
  safeTransferFromAddressAddressUint256BytesRequestSchemas,
  searchVoicesByClassificationRequestSchemas,
  searchVoicesByClassificationPaginatedRequestSchemas,
  setAnalysisVersionRequestSchemas,
  setApprovalForAllRequestSchemas,
  setBeneficiaryRelationshipRequestSchemas,
  setDefaultPlatformFeeRequestSchemas,
  setDefaultRoyaltyRateRequestSchemas,
  setInheritanceConditionsRequestSchemas,
  setMaxBeneficiariesRequestSchemas,
  setMinTimelockPeriodRequestSchemas,
  setRegistrationPausedRequestSchemas,
  symbolRequestSchemas,
  tokenUriRequestSchemas,
  transferFromVoiceAssetRequestSchemas,
  unlockVoiceAssetRequestSchemas,
  voiceAssetBalanceOfRequestSchemas,
  voiceAssetNameRequestSchemas,
  voiceAssetSymbolRequestSchemas,
  analysisVersionUpdatedEventQueryRequestSchema,
  approvalEventQueryRequestSchema,
  approvalForAllEventQueryRequestSchema,
  basicAcousticFeaturesUpdatedEventQueryRequestSchema,
  beneficiaryUpdatedEventQueryRequestSchema,
  classificationCategoryUpdatedEventQueryRequestSchema,
  defaultPlatformFeeUpdatedEventQueryRequestSchema,
  defaultRoyaltyRateUpdatedEventQueryRequestSchema,
  geographicDataUpdatedEventQueryRequestSchema,
  inheritanceActivatedEventQueryRequestSchema,
  inheritanceApprovedEventQueryRequestSchema,
  inheritanceConditionsUpdatedEventQueryRequestSchema,
  legacyPlanCreatedEventQueryRequestSchema,
  registrationPauseChangedEventQueryRequestSchema,
  rightsDelegatedEventQueryRequestSchema,
  royaltyPaidEventQueryRequestSchema,
  royaltyRateChangedEventQueryRequestSchema,
  royaltyRateUpdatedEventQueryRequestSchema,
  transferEventQueryRequestSchema,
  userAuthorizationChangedEventQueryRequestSchema,
  voiceAssetLockChangedEventQueryRequestSchema,
  voiceAssetRegisteredEventQueryRequestSchema,
  voiceAssetUsedEventQueryRequestSchema,
  voiceClassificationsUpdatedEventQueryRequestSchema,
} from "./schemas.js";

export type AddBeneficiaryPath = import("zod").infer<typeof addBeneficiaryRequestSchemas.path>;
export type AddBeneficiaryQuery = import("zod").infer<typeof addBeneficiaryRequestSchemas.query>;
export type AddBeneficiaryBody = import("zod").infer<typeof addBeneficiaryRequestSchemas.body>;
export type AddDatasetsPath = import("zod").infer<typeof addDatasetsRequestSchemas.path>;
export type AddDatasetsQuery = import("zod").infer<typeof addDatasetsRequestSchemas.query>;
export type AddDatasetsBody = import("zod").infer<typeof addDatasetsRequestSchemas.body>;
export type AddInheritanceRequirementPath = import("zod").infer<typeof addInheritanceRequirementRequestSchemas.path>;
export type AddInheritanceRequirementQuery = import("zod").infer<typeof addInheritanceRequirementRequestSchemas.query>;
export type AddInheritanceRequirementBody = import("zod").infer<typeof addInheritanceRequirementRequestSchemas.body>;
export type AddVoiceAssetsPath = import("zod").infer<typeof addVoiceAssetsRequestSchemas.path>;
export type AddVoiceAssetsQuery = import("zod").infer<typeof addVoiceAssetsRequestSchemas.query>;
export type AddVoiceAssetsBody = import("zod").infer<typeof addVoiceAssetsRequestSchemas.body>;
export type ApproveInheritancePath = import("zod").infer<typeof approveInheritanceRequestSchemas.path>;
export type ApproveInheritanceQuery = import("zod").infer<typeof approveInheritanceRequestSchemas.query>;
export type ApproveInheritanceBody = import("zod").infer<typeof approveInheritanceRequestSchemas.body>;
export type ApproveVoiceAssetPath = import("zod").infer<typeof approveVoiceAssetRequestSchemas.path>;
export type ApproveVoiceAssetQuery = import("zod").infer<typeof approveVoiceAssetRequestSchemas.query>;
export type ApproveVoiceAssetBody = import("zod").infer<typeof approveVoiceAssetRequestSchemas.body>;
export type AuthorizeUserPath = import("zod").infer<typeof authorizeUserRequestSchemas.path>;
export type AuthorizeUserQuery = import("zod").infer<typeof authorizeUserRequestSchemas.query>;
export type AuthorizeUserBody = import("zod").infer<typeof authorizeUserRequestSchemas.body>;
export type CreateLegacyPlanPath = import("zod").infer<typeof createLegacyPlanRequestSchemas.path>;
export type CreateLegacyPlanQuery = import("zod").infer<typeof createLegacyPlanRequestSchemas.query>;
export type CreateLegacyPlanBody = import("zod").infer<typeof createLegacyPlanRequestSchemas.body>;
export type CustomizeRoyaltyRatePath = import("zod").infer<typeof customizeRoyaltyRateRequestSchemas.path>;
export type CustomizeRoyaltyRateQuery = import("zod").infer<typeof customizeRoyaltyRateRequestSchemas.query>;
export type CustomizeRoyaltyRateBody = import("zod").infer<typeof customizeRoyaltyRateRequestSchemas.body>;
export type DelegateRightsPath = import("zod").infer<typeof delegateRightsRequestSchemas.path>;
export type DelegateRightsQuery = import("zod").infer<typeof delegateRightsRequestSchemas.query>;
export type DelegateRightsBody = import("zod").infer<typeof delegateRightsRequestSchemas.body>;
export type ExecuteInheritancePath = import("zod").infer<typeof executeInheritanceRequestSchemas.path>;
export type ExecuteInheritanceQuery = import("zod").infer<typeof executeInheritanceRequestSchemas.query>;
export type ExecuteInheritanceBody = import("zod").infer<typeof executeInheritanceRequestSchemas.body>;
export type GetApprovedPath = import("zod").infer<typeof getApprovedRequestSchemas.path>;
export type GetApprovedQuery = import("zod").infer<typeof getApprovedRequestSchemas.query>;
export type GetApprovedBody = import("zod").infer<typeof getApprovedRequestSchemas.body>;
export type GetBasicAcousticFeaturesPath = import("zod").infer<typeof getBasicAcousticFeaturesRequestSchemas.path>;
export type GetBasicAcousticFeaturesQuery = import("zod").infer<typeof getBasicAcousticFeaturesRequestSchemas.query>;
export type GetBasicAcousticFeaturesBody = import("zod").infer<typeof getBasicAcousticFeaturesRequestSchemas.body>;
export type GetDefaultPlatformFeePath = import("zod").infer<typeof getDefaultPlatformFeeRequestSchemas.path>;
export type GetDefaultPlatformFeeQuery = import("zod").infer<typeof getDefaultPlatformFeeRequestSchemas.query>;
export type GetDefaultPlatformFeeBody = import("zod").infer<typeof getDefaultPlatformFeeRequestSchemas.body>;
export type GetDefaultRoyaltyRatePath = import("zod").infer<typeof getDefaultRoyaltyRateRequestSchemas.path>;
export type GetDefaultRoyaltyRateQuery = import("zod").infer<typeof getDefaultRoyaltyRateRequestSchemas.query>;
export type GetDefaultRoyaltyRateBody = import("zod").infer<typeof getDefaultRoyaltyRateRequestSchemas.body>;
export type GetGeographicDataPath = import("zod").infer<typeof getGeographicDataRequestSchemas.path>;
export type GetGeographicDataQuery = import("zod").infer<typeof getGeographicDataRequestSchemas.query>;
export type GetGeographicDataBody = import("zod").infer<typeof getGeographicDataRequestSchemas.body>;
export type GetLegacyPlanPath = import("zod").infer<typeof getLegacyPlanRequestSchemas.path>;
export type GetLegacyPlanQuery = import("zod").infer<typeof getLegacyPlanRequestSchemas.query>;
export type GetLegacyPlanBody = import("zod").infer<typeof getLegacyPlanRequestSchemas.body>;
export type GetMaxRoyaltyRatePath = import("zod").infer<typeof getMaxRoyaltyRateRequestSchemas.path>;
export type GetMaxRoyaltyRateQuery = import("zod").infer<typeof getMaxRoyaltyRateRequestSchemas.query>;
export type GetMaxRoyaltyRateBody = import("zod").infer<typeof getMaxRoyaltyRateRequestSchemas.body>;
export type GetRoyaltyHistoryPath = import("zod").infer<typeof getRoyaltyHistoryRequestSchemas.path>;
export type GetRoyaltyHistoryQuery = import("zod").infer<typeof getRoyaltyHistoryRequestSchemas.query>;
export type GetRoyaltyHistoryBody = import("zod").infer<typeof getRoyaltyHistoryRequestSchemas.body>;
export type GetTokenIdPath = import("zod").infer<typeof getTokenIdRequestSchemas.path>;
export type GetTokenIdQuery = import("zod").infer<typeof getTokenIdRequestSchemas.query>;
export type GetTokenIdBody = import("zod").infer<typeof getTokenIdRequestSchemas.body>;
export type GetUserVoicesPath = import("zod").infer<typeof getUserVoicesRequestSchemas.path>;
export type GetUserVoicesQuery = import("zod").infer<typeof getUserVoicesRequestSchemas.query>;
export type GetUserVoicesBody = import("zod").infer<typeof getUserVoicesRequestSchemas.body>;
export type GetVoiceAssetPath = import("zod").infer<typeof getVoiceAssetRequestSchemas.path>;
export type GetVoiceAssetQuery = import("zod").infer<typeof getVoiceAssetRequestSchemas.query>;
export type GetVoiceAssetBody = import("zod").infer<typeof getVoiceAssetRequestSchemas.body>;
export type GetVoiceAssetDetailsPath = import("zod").infer<typeof getVoiceAssetDetailsRequestSchemas.path>;
export type GetVoiceAssetDetailsQuery = import("zod").infer<typeof getVoiceAssetDetailsRequestSchemas.query>;
export type GetVoiceAssetDetailsBody = import("zod").infer<typeof getVoiceAssetDetailsRequestSchemas.body>;
export type GetVoiceAssetsByOwnerPath = import("zod").infer<typeof getVoiceAssetsByOwnerRequestSchemas.path>;
export type GetVoiceAssetsByOwnerQuery = import("zod").infer<typeof getVoiceAssetsByOwnerRequestSchemas.query>;
export type GetVoiceAssetsByOwnerBody = import("zod").infer<typeof getVoiceAssetsByOwnerRequestSchemas.body>;
export type GetVoiceCategoriesPath = import("zod").infer<typeof getVoiceCategoriesRequestSchemas.path>;
export type GetVoiceCategoriesQuery = import("zod").infer<typeof getVoiceCategoriesRequestSchemas.query>;
export type GetVoiceCategoriesBody = import("zod").infer<typeof getVoiceCategoriesRequestSchemas.body>;
export type GetVoiceClassificationsPath = import("zod").infer<typeof getVoiceClassificationsRequestSchemas.path>;
export type GetVoiceClassificationsQuery = import("zod").infer<typeof getVoiceClassificationsRequestSchemas.query>;
export type GetVoiceClassificationsBody = import("zod").infer<typeof getVoiceClassificationsRequestSchemas.body>;
export type GetVoiceHashPath = import("zod").infer<typeof getVoiceHashRequestSchemas.path>;
export type GetVoiceHashQuery = import("zod").infer<typeof getVoiceHashRequestSchemas.query>;
export type GetVoiceHashBody = import("zod").infer<typeof getVoiceHashRequestSchemas.body>;
export type GetVoiceHashFromTokenIdPath = import("zod").infer<typeof getVoiceHashFromTokenIdRequestSchemas.path>;
export type GetVoiceHashFromTokenIdQuery = import("zod").infer<typeof getVoiceHashFromTokenIdRequestSchemas.query>;
export type GetVoiceHashFromTokenIdBody = import("zod").infer<typeof getVoiceHashFromTokenIdRequestSchemas.body>;
export type InitiateInheritancePath = import("zod").infer<typeof initiateInheritanceRequestSchemas.path>;
export type InitiateInheritanceQuery = import("zod").infer<typeof initiateInheritanceRequestSchemas.query>;
export type InitiateInheritanceBody = import("zod").infer<typeof initiateInheritanceRequestSchemas.body>;
export type IsApprovedForAllPath = import("zod").infer<typeof isApprovedForAllRequestSchemas.path>;
export type IsApprovedForAllQuery = import("zod").infer<typeof isApprovedForAllRequestSchemas.query>;
export type IsApprovedForAllBody = import("zod").infer<typeof isApprovedForAllRequestSchemas.body>;
export type IsAuthorizedPath = import("zod").infer<typeof isAuthorizedRequestSchemas.path>;
export type IsAuthorizedQuery = import("zod").infer<typeof isAuthorizedRequestSchemas.query>;
export type IsAuthorizedBody = import("zod").infer<typeof isAuthorizedRequestSchemas.body>;
export type IsInheritanceReadyPath = import("zod").infer<typeof isInheritanceReadyRequestSchemas.path>;
export type IsInheritanceReadyQuery = import("zod").infer<typeof isInheritanceReadyRequestSchemas.query>;
export type IsInheritanceReadyBody = import("zod").infer<typeof isInheritanceReadyRequestSchemas.body>;
export type IsRegistrationPausedPath = import("zod").infer<typeof isRegistrationPausedRequestSchemas.path>;
export type IsRegistrationPausedQuery = import("zod").infer<typeof isRegistrationPausedRequestSchemas.query>;
export type IsRegistrationPausedBody = import("zod").infer<typeof isRegistrationPausedRequestSchemas.body>;
export type LockVoiceAssetPath = import("zod").infer<typeof lockVoiceAssetRequestSchemas.path>;
export type LockVoiceAssetQuery = import("zod").infer<typeof lockVoiceAssetRequestSchemas.query>;
export type LockVoiceAssetBody = import("zod").infer<typeof lockVoiceAssetRequestSchemas.body>;
export type NamePath = import("zod").infer<typeof nameRequestSchemas.path>;
export type NameQuery = import("zod").infer<typeof nameRequestSchemas.query>;
export type NameBody = import("zod").infer<typeof nameRequestSchemas.body>;
export type OwnerOfPath = import("zod").infer<typeof ownerOfRequestSchemas.path>;
export type OwnerOfQuery = import("zod").infer<typeof ownerOfRequestSchemas.query>;
export type OwnerOfBody = import("zod").infer<typeof ownerOfRequestSchemas.body>;
export type RecordRoyaltyPaymentPath = import("zod").infer<typeof recordRoyaltyPaymentRequestSchemas.path>;
export type RecordRoyaltyPaymentQuery = import("zod").infer<typeof recordRoyaltyPaymentRequestSchemas.query>;
export type RecordRoyaltyPaymentBody = import("zod").infer<typeof recordRoyaltyPaymentRequestSchemas.body>;
export type RecordRoyaltyPaymentFromPath = import("zod").infer<typeof recordRoyaltyPaymentFromRequestSchemas.path>;
export type RecordRoyaltyPaymentFromQuery = import("zod").infer<typeof recordRoyaltyPaymentFromRequestSchemas.query>;
export type RecordRoyaltyPaymentFromBody = import("zod").infer<typeof recordRoyaltyPaymentFromRequestSchemas.body>;
export type RecordUsagePath = import("zod").infer<typeof recordUsageRequestSchemas.path>;
export type RecordUsageQuery = import("zod").infer<typeof recordUsageRequestSchemas.query>;
export type RecordUsageBody = import("zod").infer<typeof recordUsageRequestSchemas.body>;
export type RecordUsageFromPath = import("zod").infer<typeof recordUsageFromRequestSchemas.path>;
export type RecordUsageFromQuery = import("zod").infer<typeof recordUsageFromRequestSchemas.query>;
export type RecordUsageFromBody = import("zod").infer<typeof recordUsageFromRequestSchemas.body>;
export type RegisterVoiceAssetPath = import("zod").infer<typeof registerVoiceAssetRequestSchemas.path>;
export type RegisterVoiceAssetQuery = import("zod").infer<typeof registerVoiceAssetRequestSchemas.query>;
export type RegisterVoiceAssetBody = import("zod").infer<typeof registerVoiceAssetRequestSchemas.body>;
export type RegisterVoiceAssetForCallerPath = import("zod").infer<typeof registerVoiceAssetForCallerRequestSchemas.path>;
export type RegisterVoiceAssetForCallerQuery = import("zod").infer<typeof registerVoiceAssetForCallerRequestSchemas.query>;
export type RegisterVoiceAssetForCallerBody = import("zod").infer<typeof registerVoiceAssetForCallerRequestSchemas.body>;
export type RevokeUserPath = import("zod").infer<typeof revokeUserRequestSchemas.path>;
export type RevokeUserQuery = import("zod").infer<typeof revokeUserRequestSchemas.query>;
export type RevokeUserBody = import("zod").infer<typeof revokeUserRequestSchemas.body>;
export type SafeTransferFromAddressAddressUint256Path = import("zod").infer<typeof safeTransferFromAddressAddressUint256RequestSchemas.path>;
export type SafeTransferFromAddressAddressUint256Query = import("zod").infer<typeof safeTransferFromAddressAddressUint256RequestSchemas.query>;
export type SafeTransferFromAddressAddressUint256Body = import("zod").infer<typeof safeTransferFromAddressAddressUint256RequestSchemas.body>;
export type SafeTransferFromAddressAddressUint256BytesPath = import("zod").infer<typeof safeTransferFromAddressAddressUint256BytesRequestSchemas.path>;
export type SafeTransferFromAddressAddressUint256BytesQuery = import("zod").infer<typeof safeTransferFromAddressAddressUint256BytesRequestSchemas.query>;
export type SafeTransferFromAddressAddressUint256BytesBody = import("zod").infer<typeof safeTransferFromAddressAddressUint256BytesRequestSchemas.body>;
export type SearchVoicesByClassificationPath = import("zod").infer<typeof searchVoicesByClassificationRequestSchemas.path>;
export type SearchVoicesByClassificationQuery = import("zod").infer<typeof searchVoicesByClassificationRequestSchemas.query>;
export type SearchVoicesByClassificationBody = import("zod").infer<typeof searchVoicesByClassificationRequestSchemas.body>;
export type SearchVoicesByClassificationPaginatedPath = import("zod").infer<typeof searchVoicesByClassificationPaginatedRequestSchemas.path>;
export type SearchVoicesByClassificationPaginatedQuery = import("zod").infer<typeof searchVoicesByClassificationPaginatedRequestSchemas.query>;
export type SearchVoicesByClassificationPaginatedBody = import("zod").infer<typeof searchVoicesByClassificationPaginatedRequestSchemas.body>;
export type SetAnalysisVersionPath = import("zod").infer<typeof setAnalysisVersionRequestSchemas.path>;
export type SetAnalysisVersionQuery = import("zod").infer<typeof setAnalysisVersionRequestSchemas.query>;
export type SetAnalysisVersionBody = import("zod").infer<typeof setAnalysisVersionRequestSchemas.body>;
export type SetApprovalForAllPath = import("zod").infer<typeof setApprovalForAllRequestSchemas.path>;
export type SetApprovalForAllQuery = import("zod").infer<typeof setApprovalForAllRequestSchemas.query>;
export type SetApprovalForAllBody = import("zod").infer<typeof setApprovalForAllRequestSchemas.body>;
export type SetBeneficiaryRelationshipPath = import("zod").infer<typeof setBeneficiaryRelationshipRequestSchemas.path>;
export type SetBeneficiaryRelationshipQuery = import("zod").infer<typeof setBeneficiaryRelationshipRequestSchemas.query>;
export type SetBeneficiaryRelationshipBody = import("zod").infer<typeof setBeneficiaryRelationshipRequestSchemas.body>;
export type SetDefaultPlatformFeePath = import("zod").infer<typeof setDefaultPlatformFeeRequestSchemas.path>;
export type SetDefaultPlatformFeeQuery = import("zod").infer<typeof setDefaultPlatformFeeRequestSchemas.query>;
export type SetDefaultPlatformFeeBody = import("zod").infer<typeof setDefaultPlatformFeeRequestSchemas.body>;
export type SetDefaultRoyaltyRatePath = import("zod").infer<typeof setDefaultRoyaltyRateRequestSchemas.path>;
export type SetDefaultRoyaltyRateQuery = import("zod").infer<typeof setDefaultRoyaltyRateRequestSchemas.query>;
export type SetDefaultRoyaltyRateBody = import("zod").infer<typeof setDefaultRoyaltyRateRequestSchemas.body>;
export type SetInheritanceConditionsPath = import("zod").infer<typeof setInheritanceConditionsRequestSchemas.path>;
export type SetInheritanceConditionsQuery = import("zod").infer<typeof setInheritanceConditionsRequestSchemas.query>;
export type SetInheritanceConditionsBody = import("zod").infer<typeof setInheritanceConditionsRequestSchemas.body>;
export type SetMaxBeneficiariesPath = import("zod").infer<typeof setMaxBeneficiariesRequestSchemas.path>;
export type SetMaxBeneficiariesQuery = import("zod").infer<typeof setMaxBeneficiariesRequestSchemas.query>;
export type SetMaxBeneficiariesBody = import("zod").infer<typeof setMaxBeneficiariesRequestSchemas.body>;
export type SetMinTimelockPeriodPath = import("zod").infer<typeof setMinTimelockPeriodRequestSchemas.path>;
export type SetMinTimelockPeriodQuery = import("zod").infer<typeof setMinTimelockPeriodRequestSchemas.query>;
export type SetMinTimelockPeriodBody = import("zod").infer<typeof setMinTimelockPeriodRequestSchemas.body>;
export type SetRegistrationPausedPath = import("zod").infer<typeof setRegistrationPausedRequestSchemas.path>;
export type SetRegistrationPausedQuery = import("zod").infer<typeof setRegistrationPausedRequestSchemas.query>;
export type SetRegistrationPausedBody = import("zod").infer<typeof setRegistrationPausedRequestSchemas.body>;
export type SymbolPath = import("zod").infer<typeof symbolRequestSchemas.path>;
export type SymbolQuery = import("zod").infer<typeof symbolRequestSchemas.query>;
export type SymbolBody = import("zod").infer<typeof symbolRequestSchemas.body>;
export type TokenUriPath = import("zod").infer<typeof tokenUriRequestSchemas.path>;
export type TokenUriQuery = import("zod").infer<typeof tokenUriRequestSchemas.query>;
export type TokenUriBody = import("zod").infer<typeof tokenUriRequestSchemas.body>;
export type TransferFromVoiceAssetPath = import("zod").infer<typeof transferFromVoiceAssetRequestSchemas.path>;
export type TransferFromVoiceAssetQuery = import("zod").infer<typeof transferFromVoiceAssetRequestSchemas.query>;
export type TransferFromVoiceAssetBody = import("zod").infer<typeof transferFromVoiceAssetRequestSchemas.body>;
export type UnlockVoiceAssetPath = import("zod").infer<typeof unlockVoiceAssetRequestSchemas.path>;
export type UnlockVoiceAssetQuery = import("zod").infer<typeof unlockVoiceAssetRequestSchemas.query>;
export type UnlockVoiceAssetBody = import("zod").infer<typeof unlockVoiceAssetRequestSchemas.body>;
export type VoiceAssetBalanceOfPath = import("zod").infer<typeof voiceAssetBalanceOfRequestSchemas.path>;
export type VoiceAssetBalanceOfQuery = import("zod").infer<typeof voiceAssetBalanceOfRequestSchemas.query>;
export type VoiceAssetBalanceOfBody = import("zod").infer<typeof voiceAssetBalanceOfRequestSchemas.body>;
export type VoiceAssetNamePath = import("zod").infer<typeof voiceAssetNameRequestSchemas.path>;
export type VoiceAssetNameQuery = import("zod").infer<typeof voiceAssetNameRequestSchemas.query>;
export type VoiceAssetNameBody = import("zod").infer<typeof voiceAssetNameRequestSchemas.body>;
export type VoiceAssetSymbolPath = import("zod").infer<typeof voiceAssetSymbolRequestSchemas.path>;
export type VoiceAssetSymbolQuery = import("zod").infer<typeof voiceAssetSymbolRequestSchemas.query>;
export type VoiceAssetSymbolBody = import("zod").infer<typeof voiceAssetSymbolRequestSchemas.body>;
export type AnalysisVersionUpdatedEventQueryBody = import("zod").infer<typeof analysisVersionUpdatedEventQueryRequestSchema.body>;
export type ApprovalEventQueryBody = import("zod").infer<typeof approvalEventQueryRequestSchema.body>;
export type ApprovalForAllEventQueryBody = import("zod").infer<typeof approvalForAllEventQueryRequestSchema.body>;
export type BasicAcousticFeaturesUpdatedEventQueryBody = import("zod").infer<typeof basicAcousticFeaturesUpdatedEventQueryRequestSchema.body>;
export type BeneficiaryUpdatedEventQueryBody = import("zod").infer<typeof beneficiaryUpdatedEventQueryRequestSchema.body>;
export type ClassificationCategoryUpdatedEventQueryBody = import("zod").infer<typeof classificationCategoryUpdatedEventQueryRequestSchema.body>;
export type DefaultPlatformFeeUpdatedEventQueryBody = import("zod").infer<typeof defaultPlatformFeeUpdatedEventQueryRequestSchema.body>;
export type DefaultRoyaltyRateUpdatedEventQueryBody = import("zod").infer<typeof defaultRoyaltyRateUpdatedEventQueryRequestSchema.body>;
export type GeographicDataUpdatedEventQueryBody = import("zod").infer<typeof geographicDataUpdatedEventQueryRequestSchema.body>;
export type InheritanceActivatedEventQueryBody = import("zod").infer<typeof inheritanceActivatedEventQueryRequestSchema.body>;
export type InheritanceApprovedEventQueryBody = import("zod").infer<typeof inheritanceApprovedEventQueryRequestSchema.body>;
export type InheritanceConditionsUpdatedEventQueryBody = import("zod").infer<typeof inheritanceConditionsUpdatedEventQueryRequestSchema.body>;
export type LegacyPlanCreatedEventQueryBody = import("zod").infer<typeof legacyPlanCreatedEventQueryRequestSchema.body>;
export type RegistrationPauseChangedEventQueryBody = import("zod").infer<typeof registrationPauseChangedEventQueryRequestSchema.body>;
export type RightsDelegatedEventQueryBody = import("zod").infer<typeof rightsDelegatedEventQueryRequestSchema.body>;
export type RoyaltyPaidEventQueryBody = import("zod").infer<typeof royaltyPaidEventQueryRequestSchema.body>;
export type RoyaltyRateChangedEventQueryBody = import("zod").infer<typeof royaltyRateChangedEventQueryRequestSchema.body>;
export type RoyaltyRateUpdatedEventQueryBody = import("zod").infer<typeof royaltyRateUpdatedEventQueryRequestSchema.body>;
export type TransferEventQueryBody = import("zod").infer<typeof transferEventQueryRequestSchema.body>;
export type UserAuthorizationChangedEventQueryBody = import("zod").infer<typeof userAuthorizationChangedEventQueryRequestSchema.body>;
export type VoiceAssetLockChangedEventQueryBody = import("zod").infer<typeof voiceAssetLockChangedEventQueryRequestSchema.body>;
export type VoiceAssetRegisteredEventQueryBody = import("zod").infer<typeof voiceAssetRegisteredEventQueryRequestSchema.body>;
export type VoiceAssetUsedEventQueryBody = import("zod").infer<typeof voiceAssetUsedEventQueryRequestSchema.body>;
export type VoiceClassificationsUpdatedEventQueryBody = import("zod").infer<typeof voiceClassificationsUpdatedEventQueryRequestSchema.body>;
