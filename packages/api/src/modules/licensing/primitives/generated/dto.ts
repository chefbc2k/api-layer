import {
  createLicenseRequestSchemas,
  createLicenseFromTemplateRequestSchemas,
  createLicenseWithMarketplaceRequestSchemas,
  createTemplateRequestSchemas,
  facetFunctionSelectorsRequestSchemas,
  getCreatorTemplatesRequestSchemas,
  getLicenseRequestSchemas,
  getLicenseesRequestSchemas,
  getLicenseHistoryRequestSchemas,
  getLicenseTermsRequestSchemas,
  getPendingRevenueRequestSchemas,
  getSelectorsRequestSchemas,
  getTemplateRequestSchemas,
  getUsageCountRequestSchemas,
  issueLicenseRequestSchemas,
  isTemplateActiveRequestSchemas,
  isUsageRefUsedRequestSchemas,
  recordLicensedUsageRequestSchemas,
  recordUsageRequestSchemas,
  revokeLicenseRequestSchemas,
  setTemplateStatusRequestSchemas,
  transferLicenseRequestSchemas,
  updateLicenseTermsRequestSchemas,
  updateTemplateRequestSchemas,
  validateLicenseRequestSchemas,
  withdrawLicenseRevenueRequestSchemas,
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
  voiceAssetUsedEventQueryRequestSchema,
  voiceLicenseTemplateTemplateUpdatedEventQueryRequestSchema,
  voiceLicenseTemplateUpdatedEventQueryRequestSchema,
} from "./schemas.js";

export type CreateLicensePath = import("zod").infer<typeof createLicenseRequestSchemas.path>;
export type CreateLicenseQuery = import("zod").infer<typeof createLicenseRequestSchemas.query>;
export type CreateLicenseBody = import("zod").infer<typeof createLicenseRequestSchemas.body>;
export type CreateLicenseFromTemplatePath = import("zod").infer<typeof createLicenseFromTemplateRequestSchemas.path>;
export type CreateLicenseFromTemplateQuery = import("zod").infer<typeof createLicenseFromTemplateRequestSchemas.query>;
export type CreateLicenseFromTemplateBody = import("zod").infer<typeof createLicenseFromTemplateRequestSchemas.body>;
export type CreateLicenseWithMarketplacePath = import("zod").infer<typeof createLicenseWithMarketplaceRequestSchemas.path>;
export type CreateLicenseWithMarketplaceQuery = import("zod").infer<typeof createLicenseWithMarketplaceRequestSchemas.query>;
export type CreateLicenseWithMarketplaceBody = import("zod").infer<typeof createLicenseWithMarketplaceRequestSchemas.body>;
export type CreateTemplatePath = import("zod").infer<typeof createTemplateRequestSchemas.path>;
export type CreateTemplateQuery = import("zod").infer<typeof createTemplateRequestSchemas.query>;
export type CreateTemplateBody = import("zod").infer<typeof createTemplateRequestSchemas.body>;
export type FacetFunctionSelectorsPath = import("zod").infer<typeof facetFunctionSelectorsRequestSchemas.path>;
export type FacetFunctionSelectorsQuery = import("zod").infer<typeof facetFunctionSelectorsRequestSchemas.query>;
export type FacetFunctionSelectorsBody = import("zod").infer<typeof facetFunctionSelectorsRequestSchemas.body>;
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
export type GetSelectorsPath = import("zod").infer<typeof getSelectorsRequestSchemas.path>;
export type GetSelectorsQuery = import("zod").infer<typeof getSelectorsRequestSchemas.query>;
export type GetSelectorsBody = import("zod").infer<typeof getSelectorsRequestSchemas.body>;
export type GetTemplatePath = import("zod").infer<typeof getTemplateRequestSchemas.path>;
export type GetTemplateQuery = import("zod").infer<typeof getTemplateRequestSchemas.query>;
export type GetTemplateBody = import("zod").infer<typeof getTemplateRequestSchemas.body>;
export type GetUsageCountPath = import("zod").infer<typeof getUsageCountRequestSchemas.path>;
export type GetUsageCountQuery = import("zod").infer<typeof getUsageCountRequestSchemas.query>;
export type GetUsageCountBody = import("zod").infer<typeof getUsageCountRequestSchemas.body>;
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
export type RecordUsagePath = import("zod").infer<typeof recordUsageRequestSchemas.path>;
export type RecordUsageQuery = import("zod").infer<typeof recordUsageRequestSchemas.query>;
export type RecordUsageBody = import("zod").infer<typeof recordUsageRequestSchemas.body>;
export type RevokeLicensePath = import("zod").infer<typeof revokeLicenseRequestSchemas.path>;
export type RevokeLicenseQuery = import("zod").infer<typeof revokeLicenseRequestSchemas.query>;
export type RevokeLicenseBody = import("zod").infer<typeof revokeLicenseRequestSchemas.body>;
export type SetTemplateStatusPath = import("zod").infer<typeof setTemplateStatusRequestSchemas.path>;
export type SetTemplateStatusQuery = import("zod").infer<typeof setTemplateStatusRequestSchemas.query>;
export type SetTemplateStatusBody = import("zod").infer<typeof setTemplateStatusRequestSchemas.body>;
export type TransferLicensePath = import("zod").infer<typeof transferLicenseRequestSchemas.path>;
export type TransferLicenseQuery = import("zod").infer<typeof transferLicenseRequestSchemas.query>;
export type TransferLicenseBody = import("zod").infer<typeof transferLicenseRequestSchemas.body>;
export type UpdateLicenseTermsPath = import("zod").infer<typeof updateLicenseTermsRequestSchemas.path>;
export type UpdateLicenseTermsQuery = import("zod").infer<typeof updateLicenseTermsRequestSchemas.query>;
export type UpdateLicenseTermsBody = import("zod").infer<typeof updateLicenseTermsRequestSchemas.body>;
export type UpdateTemplatePath = import("zod").infer<typeof updateTemplateRequestSchemas.path>;
export type UpdateTemplateQuery = import("zod").infer<typeof updateTemplateRequestSchemas.query>;
export type UpdateTemplateBody = import("zod").infer<typeof updateTemplateRequestSchemas.body>;
export type ValidateLicensePath = import("zod").infer<typeof validateLicenseRequestSchemas.path>;
export type ValidateLicenseQuery = import("zod").infer<typeof validateLicenseRequestSchemas.query>;
export type ValidateLicenseBody = import("zod").infer<typeof validateLicenseRequestSchemas.body>;
export type WithdrawLicenseRevenuePath = import("zod").infer<typeof withdrawLicenseRevenueRequestSchemas.path>;
export type WithdrawLicenseRevenueQuery = import("zod").infer<typeof withdrawLicenseRevenueRequestSchemas.query>;
export type WithdrawLicenseRevenueBody = import("zod").infer<typeof withdrawLicenseRevenueRequestSchemas.body>;
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
export type VoiceAssetUsedEventQueryBody = import("zod").infer<typeof voiceAssetUsedEventQueryRequestSchema.body>;
export type VoiceLicenseTemplateTemplateUpdatedEventQueryBody = import("zod").infer<typeof voiceLicenseTemplateTemplateUpdatedEventQueryRequestSchema.body>;
export type VoiceLicenseTemplateUpdatedEventQueryBody = import("zod").infer<typeof voiceLicenseTemplateUpdatedEventQueryRequestSchema.body>;
