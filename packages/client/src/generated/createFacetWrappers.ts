import { createAccessControlFacetWrapper, createBurnThresholdFacetWrapper, createDelegationFacetWrapper, createDiamondCutFacetWrapper, createDiamondLoupeFacetWrapper, createEchoScoreFacetV3Wrapper, createEmergencyFacetWrapper, createEmergencyWithdrawalFacetWrapper, createGovernorFacetWrapper, createMarketplaceFacetWrapper, createMultiSigFacetWrapper, createOwnershipFacetWrapper, createPaymentFacetWrapper, createProposalFacetWrapper, createStakingFacetWrapper, createTimelockFacetWrapper, createTimewaveGiftFacetWrapper, createTokenSupplyFacetWrapper, createUpgradeControllerFacetWrapper, createVoiceAssetFacetWrapper, createVoiceDatasetFacetWrapper, createVoiceLicenseFacetWrapper, createVoiceLicenseTemplateFacetWrapper, createVoiceMetadataFacetWrapper, createVotingPowerFacetWrapper, createWhisperBlockFacetWrapper } from "./index.js";
import type { FacetWrapperContext } from "../types.js";

export function createFacetWrappers(context: FacetWrapperContext) {
  return {
    accessControl: createAccessControlFacetWrapper(context),
    burnThreshold: createBurnThresholdFacetWrapper(context),
    delegation: createDelegationFacetWrapper(context),
    diamondCut: createDiamondCutFacetWrapper(context),
    diamondLoupe: createDiamondLoupeFacetWrapper(context),
    echoScoreFacetV3: createEchoScoreFacetV3Wrapper(context),
    emergency: createEmergencyFacetWrapper(context),
    emergencyWithdrawal: createEmergencyWithdrawalFacetWrapper(context),
    governor: createGovernorFacetWrapper(context),
    marketplace: createMarketplaceFacetWrapper(context),
    multiSig: createMultiSigFacetWrapper(context),
    ownership: createOwnershipFacetWrapper(context),
    payment: createPaymentFacetWrapper(context),
    proposal: createProposalFacetWrapper(context),
    staking: createStakingFacetWrapper(context),
    timelock: createTimelockFacetWrapper(context),
    timewaveGift: createTimewaveGiftFacetWrapper(context),
    tokenSupply: createTokenSupplyFacetWrapper(context),
    upgradeController: createUpgradeControllerFacetWrapper(context),
    voiceAsset: createVoiceAssetFacetWrapper(context),
    voiceDataset: createVoiceDatasetFacetWrapper(context),
    voiceLicense: createVoiceLicenseFacetWrapper(context),
    voiceLicenseTemplate: createVoiceLicenseTemplateFacetWrapper(context),
    voiceMetadata: createVoiceMetadataFacetWrapper(context),
    votingPower: createVotingPowerFacetWrapper(context),
    whisperBlock: createWhisperBlockFacetWrapper(context),
  };
}
