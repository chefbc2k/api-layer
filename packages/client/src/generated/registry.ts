import AccessControlFacetAbi from "../../../../generated/abis/facets/AccessControlFacet.json";
import BurnThresholdFacetAbi from "../../../../generated/abis/facets/BurnThresholdFacet.json";
import CommunityRewardsFacetAbi from "../../../../generated/abis/facets/CommunityRewardsFacet.json";
import DelegationFacetAbi from "../../../../generated/abis/facets/DelegationFacet.json";
import DiamondCutFacetAbi from "../../../../generated/abis/facets/DiamondCutFacet.json";
import DiamondLoupeFacetAbi from "../../../../generated/abis/facets/DiamondLoupeFacet.json";
import EchoScoreFacetV3Abi from "../../../../generated/abis/facets/EchoScoreFacetV3.json";
import EmergencyFacetAbi from "../../../../generated/abis/facets/EmergencyFacet.json";
import EmergencyWithdrawalFacetAbi from "../../../../generated/abis/facets/EmergencyWithdrawalFacet.json";
import EscrowFacetAbi from "../../../../generated/abis/facets/EscrowFacet.json";
import GovernorFacetAbi from "../../../../generated/abis/facets/GovernorFacet.json";
import LegacyExecutionFacetAbi from "../../../../generated/abis/facets/LegacyExecutionFacet.json";
import LegacyFacetAbi from "../../../../generated/abis/facets/LegacyFacet.json";
import LegacyViewFacetAbi from "../../../../generated/abis/facets/LegacyViewFacet.json";
import MarketplaceFacetAbi from "../../../../generated/abis/facets/MarketplaceFacet.json";
import MultiSigFacetAbi from "../../../../generated/abis/facets/MultiSigFacet.json";
import OwnershipFacetAbi from "../../../../generated/abis/facets/OwnershipFacet.json";
import PaymentFacetAbi from "../../../../generated/abis/facets/PaymentFacet.json";
import ProposalFacetAbi from "../../../../generated/abis/facets/ProposalFacet.json";
import RightsFacetAbi from "../../../../generated/abis/facets/RightsFacet.json";
import StakingFacetAbi from "../../../../generated/abis/facets/StakingFacet.json";
import TimelockFacetAbi from "../../../../generated/abis/facets/TimelockFacet.json";
import TimewaveGiftFacetAbi from "../../../../generated/abis/facets/TimewaveGiftFacet.json";
import TokenSupplyFacetAbi from "../../../../generated/abis/facets/TokenSupplyFacet.json";
import UpgradeControllerFacetAbi from "../../../../generated/abis/facets/UpgradeControllerFacet.json";
import VestingFacetAbi from "../../../../generated/abis/facets/VestingFacet.json";
import VoiceAssetFacetAbi from "../../../../generated/abis/facets/VoiceAssetFacet.json";
import VoiceDatasetFacetAbi from "../../../../generated/abis/facets/VoiceDatasetFacet.json";
import VoiceLicenseFacetAbi from "../../../../generated/abis/facets/VoiceLicenseFacet.json";
import VoiceLicenseTemplateFacetAbi from "../../../../generated/abis/facets/VoiceLicenseTemplateFacet.json";
import VoiceMetadataFacetAbi from "../../../../generated/abis/facets/VoiceMetadataFacet.json";
import VotingPowerFacetAbi from "../../../../generated/abis/facets/VotingPowerFacet.json";
import WhisperBlockFacetAbi from "../../../../generated/abis/facets/WhisperBlockFacet.json";

export const facetRegistry = {
  AccessControlFacet: {
    facetName: "AccessControlFacet",
    facetKey: "accessControl",
    abi: AccessControlFacetAbi,
  },
  BurnThresholdFacet: {
    facetName: "BurnThresholdFacet",
    facetKey: "burnThreshold",
    abi: BurnThresholdFacetAbi,
  },
  CommunityRewardsFacet: {
    facetName: "CommunityRewardsFacet",
    facetKey: "communityRewards",
    abi: CommunityRewardsFacetAbi,
  },
  DelegationFacet: {
    facetName: "DelegationFacet",
    facetKey: "delegation",
    abi: DelegationFacetAbi,
  },
  DiamondCutFacet: {
    facetName: "DiamondCutFacet",
    facetKey: "diamondCut",
    abi: DiamondCutFacetAbi,
  },
  DiamondLoupeFacet: {
    facetName: "DiamondLoupeFacet",
    facetKey: "diamondLoupe",
    abi: DiamondLoupeFacetAbi,
  },
  EchoScoreFacetV3: {
    facetName: "EchoScoreFacetV3",
    facetKey: "echoScoreFacetV3",
    abi: EchoScoreFacetV3Abi,
  },
  EmergencyFacet: {
    facetName: "EmergencyFacet",
    facetKey: "emergency",
    abi: EmergencyFacetAbi,
  },
  EmergencyWithdrawalFacet: {
    facetName: "EmergencyWithdrawalFacet",
    facetKey: "emergencyWithdrawal",
    abi: EmergencyWithdrawalFacetAbi,
  },
  EscrowFacet: {
    facetName: "EscrowFacet",
    facetKey: "escrow",
    abi: EscrowFacetAbi,
  },
  GovernorFacet: {
    facetName: "GovernorFacet",
    facetKey: "governor",
    abi: GovernorFacetAbi,
  },
  LegacyExecutionFacet: {
    facetName: "LegacyExecutionFacet",
    facetKey: "legacyExecution",
    abi: LegacyExecutionFacetAbi,
  },
  LegacyFacet: {
    facetName: "LegacyFacet",
    facetKey: "legacy",
    abi: LegacyFacetAbi,
  },
  LegacyViewFacet: {
    facetName: "LegacyViewFacet",
    facetKey: "legacyView",
    abi: LegacyViewFacetAbi,
  },
  MarketplaceFacet: {
    facetName: "MarketplaceFacet",
    facetKey: "marketplace",
    abi: MarketplaceFacetAbi,
  },
  MultiSigFacet: {
    facetName: "MultiSigFacet",
    facetKey: "multiSig",
    abi: MultiSigFacetAbi,
  },
  OwnershipFacet: {
    facetName: "OwnershipFacet",
    facetKey: "ownership",
    abi: OwnershipFacetAbi,
  },
  PaymentFacet: {
    facetName: "PaymentFacet",
    facetKey: "payment",
    abi: PaymentFacetAbi,
  },
  ProposalFacet: {
    facetName: "ProposalFacet",
    facetKey: "proposal",
    abi: ProposalFacetAbi,
  },
  RightsFacet: {
    facetName: "RightsFacet",
    facetKey: "rights",
    abi: RightsFacetAbi,
  },
  StakingFacet: {
    facetName: "StakingFacet",
    facetKey: "staking",
    abi: StakingFacetAbi,
  },
  TimelockFacet: {
    facetName: "TimelockFacet",
    facetKey: "timelock",
    abi: TimelockFacetAbi,
  },
  TimewaveGiftFacet: {
    facetName: "TimewaveGiftFacet",
    facetKey: "timewaveGift",
    abi: TimewaveGiftFacetAbi,
  },
  TokenSupplyFacet: {
    facetName: "TokenSupplyFacet",
    facetKey: "tokenSupply",
    abi: TokenSupplyFacetAbi,
  },
  UpgradeControllerFacet: {
    facetName: "UpgradeControllerFacet",
    facetKey: "upgradeController",
    abi: UpgradeControllerFacetAbi,
  },
  VestingFacet: {
    facetName: "VestingFacet",
    facetKey: "vesting",
    abi: VestingFacetAbi,
  },
  VoiceAssetFacet: {
    facetName: "VoiceAssetFacet",
    facetKey: "voiceAsset",
    abi: VoiceAssetFacetAbi,
  },
  VoiceDatasetFacet: {
    facetName: "VoiceDatasetFacet",
    facetKey: "voiceDataset",
    abi: VoiceDatasetFacetAbi,
  },
  VoiceLicenseFacet: {
    facetName: "VoiceLicenseFacet",
    facetKey: "voiceLicense",
    abi: VoiceLicenseFacetAbi,
  },
  VoiceLicenseTemplateFacet: {
    facetName: "VoiceLicenseTemplateFacet",
    facetKey: "voiceLicenseTemplate",
    abi: VoiceLicenseTemplateFacetAbi,
  },
  VoiceMetadataFacet: {
    facetName: "VoiceMetadataFacet",
    facetKey: "voiceMetadata",
    abi: VoiceMetadataFacetAbi,
  },
  VotingPowerFacet: {
    facetName: "VotingPowerFacet",
    facetKey: "votingPower",
    abi: VotingPowerFacetAbi,
  },
  WhisperBlockFacet: {
    facetName: "WhisperBlockFacet",
    facetKey: "whisperBlock",
    abi: WhisperBlockFacetAbi,
  },
} as const;

export type FacetName = keyof typeof facetRegistry;
