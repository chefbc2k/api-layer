import {
  approveUpgradeRequestSchemas,
  diamondCutRequestSchemas,
  executeUpgradeRequestSchemas,
  facetAddressRequestSchemas,
  facetAddressesRequestSchemas,
  facetFunctionSelectorsRequestSchemas,
  facetsRequestSchemas,
  founderRoleRequestSchemas,
  freezeUpgradeControlRequestSchemas,
  getOperationalInvariantsRequestSchemas,
  getTrustedInitCodehashRequestSchemas,
  getUpgradeRequestSchemas,
  getUpgradeControlStatusRequestSchemas,
  getUpgradeDelayRequestSchemas,
  getUpgradeThresholdRequestSchemas,
  initUpgradeControllerRequestSchemas,
  isImmutableSelectorReservedRequestSchemas,
  isTrustedInitSelectorRequestSchemas,
  isTrustedInitSelectorPolicyEnabledRequestSchemas,
  isUpgradeApprovedRequestSchemas,
  isUpgradeControlFrozenRequestSchemas,
  isUpgradeSignerRequestSchemas,
  proposeDiamondCutRequestSchemas,
  setTrustedInitCodehashRequestSchemas,
  setTrustedInitContractRequestSchemas,
  setTrustedInitSelectorRequestSchemas,
  setUpgradeControlEnforcedRequestSchemas,
  diamondCutEventEventQueryRequestSchema,
  diamondCutEventQueryRequestSchema,
  trustedInitCodehashSetEventQueryRequestSchema,
  trustedInitContractSetEventQueryRequestSchema,
  trustedInitSelectorSetEventQueryRequestSchema,
  upgradeApprovedEventQueryRequestSchema,
  upgradeControlEnforcementSetEventQueryRequestSchema,
  upgradeControlFrozenEventQueryRequestSchema,
  upgradeControllerInitializedEventQueryRequestSchema,
  upgradeExecutedEventQueryRequestSchema,
  upgradeProposedEventQueryRequestSchema,
} from "./schemas.js";

export type ApproveUpgradePath = import("zod").infer<typeof approveUpgradeRequestSchemas.path>;
export type ApproveUpgradeQuery = import("zod").infer<typeof approveUpgradeRequestSchemas.query>;
export type ApproveUpgradeBody = import("zod").infer<typeof approveUpgradeRequestSchemas.body>;
export type DiamondCutPath = import("zod").infer<typeof diamondCutRequestSchemas.path>;
export type DiamondCutQuery = import("zod").infer<typeof diamondCutRequestSchemas.query>;
export type DiamondCutBody = import("zod").infer<typeof diamondCutRequestSchemas.body>;
export type ExecuteUpgradePath = import("zod").infer<typeof executeUpgradeRequestSchemas.path>;
export type ExecuteUpgradeQuery = import("zod").infer<typeof executeUpgradeRequestSchemas.query>;
export type ExecuteUpgradeBody = import("zod").infer<typeof executeUpgradeRequestSchemas.body>;
export type FacetAddressPath = import("zod").infer<typeof facetAddressRequestSchemas.path>;
export type FacetAddressQuery = import("zod").infer<typeof facetAddressRequestSchemas.query>;
export type FacetAddressBody = import("zod").infer<typeof facetAddressRequestSchemas.body>;
export type FacetAddressesPath = import("zod").infer<typeof facetAddressesRequestSchemas.path>;
export type FacetAddressesQuery = import("zod").infer<typeof facetAddressesRequestSchemas.query>;
export type FacetAddressesBody = import("zod").infer<typeof facetAddressesRequestSchemas.body>;
export type FacetFunctionSelectorsPath = import("zod").infer<typeof facetFunctionSelectorsRequestSchemas.path>;
export type FacetFunctionSelectorsQuery = import("zod").infer<typeof facetFunctionSelectorsRequestSchemas.query>;
export type FacetFunctionSelectorsBody = import("zod").infer<typeof facetFunctionSelectorsRequestSchemas.body>;
export type FacetsPath = import("zod").infer<typeof facetsRequestSchemas.path>;
export type FacetsQuery = import("zod").infer<typeof facetsRequestSchemas.query>;
export type FacetsBody = import("zod").infer<typeof facetsRequestSchemas.body>;
export type FounderRolePath = import("zod").infer<typeof founderRoleRequestSchemas.path>;
export type FounderRoleQuery = import("zod").infer<typeof founderRoleRequestSchemas.query>;
export type FounderRoleBody = import("zod").infer<typeof founderRoleRequestSchemas.body>;
export type FreezeUpgradeControlPath = import("zod").infer<typeof freezeUpgradeControlRequestSchemas.path>;
export type FreezeUpgradeControlQuery = import("zod").infer<typeof freezeUpgradeControlRequestSchemas.query>;
export type FreezeUpgradeControlBody = import("zod").infer<typeof freezeUpgradeControlRequestSchemas.body>;
export type GetOperationalInvariantsPath = import("zod").infer<typeof getOperationalInvariantsRequestSchemas.path>;
export type GetOperationalInvariantsQuery = import("zod").infer<typeof getOperationalInvariantsRequestSchemas.query>;
export type GetOperationalInvariantsBody = import("zod").infer<typeof getOperationalInvariantsRequestSchemas.body>;
export type GetTrustedInitCodehashPath = import("zod").infer<typeof getTrustedInitCodehashRequestSchemas.path>;
export type GetTrustedInitCodehashQuery = import("zod").infer<typeof getTrustedInitCodehashRequestSchemas.query>;
export type GetTrustedInitCodehashBody = import("zod").infer<typeof getTrustedInitCodehashRequestSchemas.body>;
export type GetUpgradePath = import("zod").infer<typeof getUpgradeRequestSchemas.path>;
export type GetUpgradeQuery = import("zod").infer<typeof getUpgradeRequestSchemas.query>;
export type GetUpgradeBody = import("zod").infer<typeof getUpgradeRequestSchemas.body>;
export type GetUpgradeControlStatusPath = import("zod").infer<typeof getUpgradeControlStatusRequestSchemas.path>;
export type GetUpgradeControlStatusQuery = import("zod").infer<typeof getUpgradeControlStatusRequestSchemas.query>;
export type GetUpgradeControlStatusBody = import("zod").infer<typeof getUpgradeControlStatusRequestSchemas.body>;
export type GetUpgradeDelayPath = import("zod").infer<typeof getUpgradeDelayRequestSchemas.path>;
export type GetUpgradeDelayQuery = import("zod").infer<typeof getUpgradeDelayRequestSchemas.query>;
export type GetUpgradeDelayBody = import("zod").infer<typeof getUpgradeDelayRequestSchemas.body>;
export type GetUpgradeThresholdPath = import("zod").infer<typeof getUpgradeThresholdRequestSchemas.path>;
export type GetUpgradeThresholdQuery = import("zod").infer<typeof getUpgradeThresholdRequestSchemas.query>;
export type GetUpgradeThresholdBody = import("zod").infer<typeof getUpgradeThresholdRequestSchemas.body>;
export type InitUpgradeControllerPath = import("zod").infer<typeof initUpgradeControllerRequestSchemas.path>;
export type InitUpgradeControllerQuery = import("zod").infer<typeof initUpgradeControllerRequestSchemas.query>;
export type InitUpgradeControllerBody = import("zod").infer<typeof initUpgradeControllerRequestSchemas.body>;
export type IsImmutableSelectorReservedPath = import("zod").infer<typeof isImmutableSelectorReservedRequestSchemas.path>;
export type IsImmutableSelectorReservedQuery = import("zod").infer<typeof isImmutableSelectorReservedRequestSchemas.query>;
export type IsImmutableSelectorReservedBody = import("zod").infer<typeof isImmutableSelectorReservedRequestSchemas.body>;
export type IsTrustedInitSelectorPath = import("zod").infer<typeof isTrustedInitSelectorRequestSchemas.path>;
export type IsTrustedInitSelectorQuery = import("zod").infer<typeof isTrustedInitSelectorRequestSchemas.query>;
export type IsTrustedInitSelectorBody = import("zod").infer<typeof isTrustedInitSelectorRequestSchemas.body>;
export type IsTrustedInitSelectorPolicyEnabledPath = import("zod").infer<typeof isTrustedInitSelectorPolicyEnabledRequestSchemas.path>;
export type IsTrustedInitSelectorPolicyEnabledQuery = import("zod").infer<typeof isTrustedInitSelectorPolicyEnabledRequestSchemas.query>;
export type IsTrustedInitSelectorPolicyEnabledBody = import("zod").infer<typeof isTrustedInitSelectorPolicyEnabledRequestSchemas.body>;
export type IsUpgradeApprovedPath = import("zod").infer<typeof isUpgradeApprovedRequestSchemas.path>;
export type IsUpgradeApprovedQuery = import("zod").infer<typeof isUpgradeApprovedRequestSchemas.query>;
export type IsUpgradeApprovedBody = import("zod").infer<typeof isUpgradeApprovedRequestSchemas.body>;
export type IsUpgradeControlFrozenPath = import("zod").infer<typeof isUpgradeControlFrozenRequestSchemas.path>;
export type IsUpgradeControlFrozenQuery = import("zod").infer<typeof isUpgradeControlFrozenRequestSchemas.query>;
export type IsUpgradeControlFrozenBody = import("zod").infer<typeof isUpgradeControlFrozenRequestSchemas.body>;
export type IsUpgradeSignerPath = import("zod").infer<typeof isUpgradeSignerRequestSchemas.path>;
export type IsUpgradeSignerQuery = import("zod").infer<typeof isUpgradeSignerRequestSchemas.query>;
export type IsUpgradeSignerBody = import("zod").infer<typeof isUpgradeSignerRequestSchemas.body>;
export type ProposeDiamondCutPath = import("zod").infer<typeof proposeDiamondCutRequestSchemas.path>;
export type ProposeDiamondCutQuery = import("zod").infer<typeof proposeDiamondCutRequestSchemas.query>;
export type ProposeDiamondCutBody = import("zod").infer<typeof proposeDiamondCutRequestSchemas.body>;
export type SetTrustedInitCodehashPath = import("zod").infer<typeof setTrustedInitCodehashRequestSchemas.path>;
export type SetTrustedInitCodehashQuery = import("zod").infer<typeof setTrustedInitCodehashRequestSchemas.query>;
export type SetTrustedInitCodehashBody = import("zod").infer<typeof setTrustedInitCodehashRequestSchemas.body>;
export type SetTrustedInitContractPath = import("zod").infer<typeof setTrustedInitContractRequestSchemas.path>;
export type SetTrustedInitContractQuery = import("zod").infer<typeof setTrustedInitContractRequestSchemas.query>;
export type SetTrustedInitContractBody = import("zod").infer<typeof setTrustedInitContractRequestSchemas.body>;
export type SetTrustedInitSelectorPath = import("zod").infer<typeof setTrustedInitSelectorRequestSchemas.path>;
export type SetTrustedInitSelectorQuery = import("zod").infer<typeof setTrustedInitSelectorRequestSchemas.query>;
export type SetTrustedInitSelectorBody = import("zod").infer<typeof setTrustedInitSelectorRequestSchemas.body>;
export type SetUpgradeControlEnforcedPath = import("zod").infer<typeof setUpgradeControlEnforcedRequestSchemas.path>;
export type SetUpgradeControlEnforcedQuery = import("zod").infer<typeof setUpgradeControlEnforcedRequestSchemas.query>;
export type SetUpgradeControlEnforcedBody = import("zod").infer<typeof setUpgradeControlEnforcedRequestSchemas.body>;
export type DiamondCutEventEventQueryBody = import("zod").infer<typeof diamondCutEventEventQueryRequestSchema.body>;
export type DiamondCutEventQueryBody = import("zod").infer<typeof diamondCutEventQueryRequestSchema.body>;
export type TrustedInitCodehashSetEventQueryBody = import("zod").infer<typeof trustedInitCodehashSetEventQueryRequestSchema.body>;
export type TrustedInitContractSetEventQueryBody = import("zod").infer<typeof trustedInitContractSetEventQueryRequestSchema.body>;
export type TrustedInitSelectorSetEventQueryBody = import("zod").infer<typeof trustedInitSelectorSetEventQueryRequestSchema.body>;
export type UpgradeApprovedEventQueryBody = import("zod").infer<typeof upgradeApprovedEventQueryRequestSchema.body>;
export type UpgradeControlEnforcementSetEventQueryBody = import("zod").infer<typeof upgradeControlEnforcementSetEventQueryRequestSchema.body>;
export type UpgradeControlFrozenEventQueryBody = import("zod").infer<typeof upgradeControlFrozenEventQueryRequestSchema.body>;
export type UpgradeControllerInitializedEventQueryBody = import("zod").infer<typeof upgradeControllerInitializedEventQueryRequestSchema.body>;
export type UpgradeExecutedEventQueryBody = import("zod").infer<typeof upgradeExecutedEventQueryRequestSchema.body>;
export type UpgradeProposedEventQueryBody = import("zod").infer<typeof upgradeProposedEventQueryRequestSchema.body>;
