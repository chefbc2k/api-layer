import {
  addCollaboratorRequestSchemas,
  createLicenseWithMarketplaceRequestSchemas,
  getCategoryContractsRequestSchemas,
  getCollaboratorRequestSchemas,
  getCreatorTemplatesRequestSchemas,
  getLicenseRequestSchemas,
  getLicenseesRequestSchemas,
  getLicenseHistoryRequestSchemas,
  getLicenseTermsRequestSchemas,
  getPendingRevenueRequestSchemas,
  getRightCategoryRequestSchemas,
  getRightContractRequestSchemas,
  getRightsGroupRequestSchemas,
  getTemplateRequestSchemas,
  getUsageCountRequestSchemas,
  getUserRightsRequestSchemas,
  issueLicenseRequestSchemas,
  isTemplateActiveRequestSchemas,
  isUsageRefUsedRequestSchemas,
  recordLicensedUsageRequestSchemas,
  registerRightContractRequestSchemas,
  removeCollaboratorRequestSchemas,
  revokeLicenseRequestSchemas,
  revokeRightRequestSchemas,
  rightIdExistsRequestSchemas,
  setTemplateStatusRequestSchemas,
  transferLicenseRequestSchemas,
  updateCollaboratorShareRequestSchemas,
  updateLicenseTermsRequestSchemas,
  updateRightContractRequestSchemas,
  validateLicenseRequestSchemas,
  withdrawLicenseRevenueRequestSchemas,
  collaboratorUpdatedEventQueryRequestSchema,
  debugEventQueryRequestSchema,
  licenseBatchGrantedEventQueryRequestSchema,
  licenseCreatedBytes32AddressBytes32Uint256Uint256EventQueryRequestSchema,
  licenseCreatedBytes32Bytes32AddressUint256Uint256EventQueryRequestSchema,
  licenseCreatedEventQueryRequestSchema,
  licenseEndedEventQueryRequestSchema,
  licenseRenewedEventQueryRequestSchema,
  licenseRevokedEventQueryRequestSchema,
  licenseTermsUpdatedEventQueryRequestSchema,
  licenseTransferredEventQueryRequestSchema,
  licenseUsedEventQueryRequestSchema,
  rightContractRegisteredEventQueryRequestSchema,
  rightContractUpdatedEventQueryRequestSchema,
  rightGrantedEventQueryRequestSchema,
  rightRevokedEventQueryRequestSchema,
  rightsGroupCreatedEventQueryRequestSchema,
  voiceAssetUsedEventQueryRequestSchema,
  voiceLicenseTemplateTemplateUpdatedEventQueryRequestSchema,
  voiceLicenseTemplateUpdatedEventQueryRequestSchema,
} from "./schemas.js";

export type AddCollaboratorPath = import("zod").infer<typeof addCollaboratorRequestSchemas.path>;
export type AddCollaboratorQuery = import("zod").infer<typeof addCollaboratorRequestSchemas.query>;
export type AddCollaboratorBody = import("zod").infer<typeof addCollaboratorRequestSchemas.body>;
export type CreateLicenseWithMarketplacePath = import("zod").infer<typeof createLicenseWithMarketplaceRequestSchemas.path>;
export type CreateLicenseWithMarketplaceQuery = import("zod").infer<typeof createLicenseWithMarketplaceRequestSchemas.query>;
export type CreateLicenseWithMarketplaceBody = import("zod").infer<typeof createLicenseWithMarketplaceRequestSchemas.body>;
export type GetCategoryContractsPath = import("zod").infer<typeof getCategoryContractsRequestSchemas.path>;
export type GetCategoryContractsQuery = import("zod").infer<typeof getCategoryContractsRequestSchemas.query>;
export type GetCategoryContractsBody = import("zod").infer<typeof getCategoryContractsRequestSchemas.body>;
export type GetCollaboratorPath = import("zod").infer<typeof getCollaboratorRequestSchemas.path>;
export type GetCollaboratorQuery = import("zod").infer<typeof getCollaboratorRequestSchemas.query>;
export type GetCollaboratorBody = import("zod").infer<typeof getCollaboratorRequestSchemas.body>;
export type GetCreatorTemplatesPath = import("zod").infer<typeof getCreatorTemplatesRequestSchemas.path>;
export type GetCreatorTemplatesQuery = import("zod").infer<typeof getCreatorTemplatesRequestSchemas.query>;
export type GetCreatorTemplatesBody = import("zod").infer<typeof getCreatorTemplatesRequestSchemas.body>;
export type GetLicensePath = import("zod").infer<typeof getLicenseRequestSchemas.path>;
export type GetLicenseQuery = import("zod").infer<typeof getLicenseRequestSchemas.query>;
export type GetLicenseBody = import("zod").infer<typeof getLicenseRequestSchemas.body>;
export type GetLicenseesPath = import("zod").infer<typeof getLicenseesRequestSchemas.path>;
export type GetLicenseesQuery = import("zod").infer<typeof getLicenseesRequestSchemas.query>;
export type GetLicenseesBody = import("zod").infer<typeof getLicenseesRequestSchemas.body>;
export type GetLicenseHistoryPath = import("zod").infer<typeof getLicenseHistoryRequestSchemas.path>;
export type GetLicenseHistoryQuery = import("zod").infer<typeof getLicenseHistoryRequestSchemas.query>;
export type GetLicenseHistoryBody = import("zod").infer<typeof getLicenseHistoryRequestSchemas.body>;
export type GetLicenseTermsPath = import("zod").infer<typeof getLicenseTermsRequestSchemas.path>;
export type GetLicenseTermsQuery = import("zod").infer<typeof getLicenseTermsRequestSchemas.query>;
export type GetLicenseTermsBody = import("zod").infer<typeof getLicenseTermsRequestSchemas.body>;
export type GetPendingRevenuePath = import("zod").infer<typeof getPendingRevenueRequestSchemas.path>;
export type GetPendingRevenueQuery = import("zod").infer<typeof getPendingRevenueRequestSchemas.query>;
export type GetPendingRevenueBody = import("zod").infer<typeof getPendingRevenueRequestSchemas.body>;
export type GetRightCategoryPath = import("zod").infer<typeof getRightCategoryRequestSchemas.path>;
export type GetRightCategoryQuery = import("zod").infer<typeof getRightCategoryRequestSchemas.query>;
export type GetRightCategoryBody = import("zod").infer<typeof getRightCategoryRequestSchemas.body>;
export type GetRightContractPath = import("zod").infer<typeof getRightContractRequestSchemas.path>;
export type GetRightContractQuery = import("zod").infer<typeof getRightContractRequestSchemas.query>;
export type GetRightContractBody = import("zod").infer<typeof getRightContractRequestSchemas.body>;
export type GetRightsGroupPath = import("zod").infer<typeof getRightsGroupRequestSchemas.path>;
export type GetRightsGroupQuery = import("zod").infer<typeof getRightsGroupRequestSchemas.query>;
export type GetRightsGroupBody = import("zod").infer<typeof getRightsGroupRequestSchemas.body>;
export type GetTemplatePath = import("zod").infer<typeof getTemplateRequestSchemas.path>;
export type GetTemplateQuery = import("zod").infer<typeof getTemplateRequestSchemas.query>;
export type GetTemplateBody = import("zod").infer<typeof getTemplateRequestSchemas.body>;
export type GetUsageCountPath = import("zod").infer<typeof getUsageCountRequestSchemas.path>;
export type GetUsageCountQuery = import("zod").infer<typeof getUsageCountRequestSchemas.query>;
export type GetUsageCountBody = import("zod").infer<typeof getUsageCountRequestSchemas.body>;
export type GetUserRightsPath = import("zod").infer<typeof getUserRightsRequestSchemas.path>;
export type GetUserRightsQuery = import("zod").infer<typeof getUserRightsRequestSchemas.query>;
export type GetUserRightsBody = import("zod").infer<typeof getUserRightsRequestSchemas.body>;
export type IssueLicensePath = import("zod").infer<typeof issueLicenseRequestSchemas.path>;
export type IssueLicenseQuery = import("zod").infer<typeof issueLicenseRequestSchemas.query>;
export type IssueLicenseBody = import("zod").infer<typeof issueLicenseRequestSchemas.body>;
export type IsTemplateActivePath = import("zod").infer<typeof isTemplateActiveRequestSchemas.path>;
export type IsTemplateActiveQuery = import("zod").infer<typeof isTemplateActiveRequestSchemas.query>;
export type IsTemplateActiveBody = import("zod").infer<typeof isTemplateActiveRequestSchemas.body>;
export type IsUsageRefUsedPath = import("zod").infer<typeof isUsageRefUsedRequestSchemas.path>;
export type IsUsageRefUsedQuery = import("zod").infer<typeof isUsageRefUsedRequestSchemas.query>;
export type IsUsageRefUsedBody = import("zod").infer<typeof isUsageRefUsedRequestSchemas.body>;
export type RecordLicensedUsagePath = import("zod").infer<typeof recordLicensedUsageRequestSchemas.path>;
export type RecordLicensedUsageQuery = import("zod").infer<typeof recordLicensedUsageRequestSchemas.query>;
export type RecordLicensedUsageBody = import("zod").infer<typeof recordLicensedUsageRequestSchemas.body>;
export type RegisterRightContractPath = import("zod").infer<typeof registerRightContractRequestSchemas.path>;
export type RegisterRightContractQuery = import("zod").infer<typeof registerRightContractRequestSchemas.query>;
export type RegisterRightContractBody = import("zod").infer<typeof registerRightContractRequestSchemas.body>;
export type RemoveCollaboratorPath = import("zod").infer<typeof removeCollaboratorRequestSchemas.path>;
export type RemoveCollaboratorQuery = import("zod").infer<typeof removeCollaboratorRequestSchemas.query>;
export type RemoveCollaboratorBody = import("zod").infer<typeof removeCollaboratorRequestSchemas.body>;
export type RevokeLicensePath = import("zod").infer<typeof revokeLicenseRequestSchemas.path>;
export type RevokeLicenseQuery = import("zod").infer<typeof revokeLicenseRequestSchemas.query>;
export type RevokeLicenseBody = import("zod").infer<typeof revokeLicenseRequestSchemas.body>;
export type RevokeRightPath = import("zod").infer<typeof revokeRightRequestSchemas.path>;
export type RevokeRightQuery = import("zod").infer<typeof revokeRightRequestSchemas.query>;
export type RevokeRightBody = import("zod").infer<typeof revokeRightRequestSchemas.body>;
export type RightIdExistsPath = import("zod").infer<typeof rightIdExistsRequestSchemas.path>;
export type RightIdExistsQuery = import("zod").infer<typeof rightIdExistsRequestSchemas.query>;
export type RightIdExistsBody = import("zod").infer<typeof rightIdExistsRequestSchemas.body>;
export type SetTemplateStatusPath = import("zod").infer<typeof setTemplateStatusRequestSchemas.path>;
export type SetTemplateStatusQuery = import("zod").infer<typeof setTemplateStatusRequestSchemas.query>;
export type SetTemplateStatusBody = import("zod").infer<typeof setTemplateStatusRequestSchemas.body>;
export type TransferLicensePath = import("zod").infer<typeof transferLicenseRequestSchemas.path>;
export type TransferLicenseQuery = import("zod").infer<typeof transferLicenseRequestSchemas.query>;
export type TransferLicenseBody = import("zod").infer<typeof transferLicenseRequestSchemas.body>;
export type UpdateCollaboratorSharePath = import("zod").infer<typeof updateCollaboratorShareRequestSchemas.path>;
export type UpdateCollaboratorShareQuery = import("zod").infer<typeof updateCollaboratorShareRequestSchemas.query>;
export type UpdateCollaboratorShareBody = import("zod").infer<typeof updateCollaboratorShareRequestSchemas.body>;
export type UpdateLicenseTermsPath = import("zod").infer<typeof updateLicenseTermsRequestSchemas.path>;
export type UpdateLicenseTermsQuery = import("zod").infer<typeof updateLicenseTermsRequestSchemas.query>;
export type UpdateLicenseTermsBody = import("zod").infer<typeof updateLicenseTermsRequestSchemas.body>;
export type UpdateRightContractPath = import("zod").infer<typeof updateRightContractRequestSchemas.path>;
export type UpdateRightContractQuery = import("zod").infer<typeof updateRightContractRequestSchemas.query>;
export type UpdateRightContractBody = import("zod").infer<typeof updateRightContractRequestSchemas.body>;
export type ValidateLicensePath = import("zod").infer<typeof validateLicenseRequestSchemas.path>;
export type ValidateLicenseQuery = import("zod").infer<typeof validateLicenseRequestSchemas.query>;
export type ValidateLicenseBody = import("zod").infer<typeof validateLicenseRequestSchemas.body>;
export type WithdrawLicenseRevenuePath = import("zod").infer<typeof withdrawLicenseRevenueRequestSchemas.path>;
export type WithdrawLicenseRevenueQuery = import("zod").infer<typeof withdrawLicenseRevenueRequestSchemas.query>;
export type WithdrawLicenseRevenueBody = import("zod").infer<typeof withdrawLicenseRevenueRequestSchemas.body>;
export type CollaboratorUpdatedEventQueryBody = import("zod").infer<typeof collaboratorUpdatedEventQueryRequestSchema.body>;
export type DebugEventQueryBody = import("zod").infer<typeof debugEventQueryRequestSchema.body>;
export type LicenseBatchGrantedEventQueryBody = import("zod").infer<typeof licenseBatchGrantedEventQueryRequestSchema.body>;
export type LicenseCreatedBytes32AddressBytes32Uint256Uint256EventQueryBody = import("zod").infer<typeof licenseCreatedBytes32AddressBytes32Uint256Uint256EventQueryRequestSchema.body>;
export type LicenseCreatedBytes32Bytes32AddressUint256Uint256EventQueryBody = import("zod").infer<typeof licenseCreatedBytes32Bytes32AddressUint256Uint256EventQueryRequestSchema.body>;
export type LicenseCreatedEventQueryBody = import("zod").infer<typeof licenseCreatedEventQueryRequestSchema.body>;
export type LicenseEndedEventQueryBody = import("zod").infer<typeof licenseEndedEventQueryRequestSchema.body>;
export type LicenseRenewedEventQueryBody = import("zod").infer<typeof licenseRenewedEventQueryRequestSchema.body>;
export type LicenseRevokedEventQueryBody = import("zod").infer<typeof licenseRevokedEventQueryRequestSchema.body>;
export type LicenseTermsUpdatedEventQueryBody = import("zod").infer<typeof licenseTermsUpdatedEventQueryRequestSchema.body>;
export type LicenseTransferredEventQueryBody = import("zod").infer<typeof licenseTransferredEventQueryRequestSchema.body>;
export type LicenseUsedEventQueryBody = import("zod").infer<typeof licenseUsedEventQueryRequestSchema.body>;
export type RightContractRegisteredEventQueryBody = import("zod").infer<typeof rightContractRegisteredEventQueryRequestSchema.body>;
export type RightContractUpdatedEventQueryBody = import("zod").infer<typeof rightContractUpdatedEventQueryRequestSchema.body>;
export type RightGrantedEventQueryBody = import("zod").infer<typeof rightGrantedEventQueryRequestSchema.body>;
export type RightRevokedEventQueryBody = import("zod").infer<typeof rightRevokedEventQueryRequestSchema.body>;
export type RightsGroupCreatedEventQueryBody = import("zod").infer<typeof rightsGroupCreatedEventQueryRequestSchema.body>;
export type VoiceAssetUsedEventQueryBody = import("zod").infer<typeof voiceAssetUsedEventQueryRequestSchema.body>;
export type VoiceLicenseTemplateTemplateUpdatedEventQueryBody = import("zod").infer<typeof voiceLicenseTemplateTemplateUpdatedEventQueryRequestSchema.body>;
export type VoiceLicenseTemplateUpdatedEventQueryBody = import("zod").infer<typeof voiceLicenseTemplateUpdatedEventQueryRequestSchema.body>;
