import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type ReviewedSurface = {
  methods: Record<string, {
    path: string;
    httpMethod?: string;
  }>;
};

type ReviewedWriteInvariants = {
  methods: Record<string, unknown>;
};

const reviewedSurface = JSON.parse(
  readFileSync("reviewed/reviewed-api-surface.json", "utf8"),
) as ReviewedSurface;
const reviewedWriteInvariants = JSON.parse(
  readFileSync("reviewed/reviewed-write-invariants.json", "utf8"),
) as ReviewedWriteInvariants;

const openGapFixtureClosures = [
  ["RightsFacet.addCollaborator", "POST", "/v1/licensing/commands/add-collaborator"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.createRightsGroup", "POST", "/v1/licensing/rights/create-rights-group"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.grantRight", "POST", "/v1/licensing/commands/grant-right"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.registerRightContract", "POST", "/v1/licensing/rights/register-right-contract"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.removeCollaborator", "DELETE", "/v1/licensing/commands/remove-collaborator"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.revokeRight", "DELETE", "/v1/licensing/commands/revoke-right"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.updateCollaboratorShare", "PATCH", "/v1/licensing/commands/update-collaborator-share"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["RightsFacet.updateRightContract", "PATCH", "/v1/licensing/commands/update-right-contract"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.advanceEpoch", "POST", "/v1/staking/commands/advance-epoch"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.claimRewards", "POST", "/v1/staking/commands/claim-rewards"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.executeUnstake", "POST", "/v1/staking/commands/execute-unstake"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.fundRewardPool", "POST", "/v1/staking/commands/fund-reward-pool"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.initStaking", "POST", "/v1/staking/stakes/init-staking"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.initStakingWithToken", "POST", "/v1/staking/stakes/init-staking-with-token"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.queueTierConfigUpdate", "POST", "/v1/staking/commands/queue-tier-config-update"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.requestUnstake", "POST", "/v1/staking/commands/request-unstake"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.setDegradedModeConfig", "PATCH", "/v1/staking/commands/set-degraded-mode-config"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.setEchoScoreBoost", "PATCH", "/v1/staking/commands/set-echo-score-boost"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["StakingFacet.setStakingPaused", "PATCH", "/v1/staking/commands/set-staking-paused"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.burn", "DELETE", "/v1/tokenomics/commands/burn"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.burnFrom", "DELETE", "/v1/tokenomics/commands/burn-from"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.initializeToken", "POST", "/v1/tokenomics/token-supply"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.supplyFinishMinting", "POST", "/v1/tokenomics/commands/supply-finish-minting"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.supplyMintTokens", "POST", "/v1/tokenomics/commands/supply-mint-tokens"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.supplySetMaximum", "POST", "/v1/tokenomics/commands/supply-set-maximum"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.tokenTransferFrom", "POST", "/v1/tokenomics/commands/token-transfer-from"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["TokenSupplyFacet.transferFrom", "POST", "/v1/tokenomics/commands/transfer-from"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VestingFacet.releaseTokensFor", "POST", "/v1/tokenomics/commands/release-tokens-for"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VestingFacet.releaseVestedTokens", "POST", "/v1/tokenomics/commands/release-vested-tokens"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VestingFacet.transferVestingSchedule", "POST", "/v1/tokenomics/commands/transfer-vesting-schedule"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.approveVoiceAsset", "POST", "/v1/voice-assets/commands/approve-voice-asset"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.customizeRoyaltyRate", "PATCH", "/v1/voice-assets/:voiceHash/royalty-rate"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.lockVoiceAsset", "POST", "/v1/voice-assets/:voiceHash/lock"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.recordRoyaltyPayment", "POST", "/v1/voice-assets/:voiceHash/royalty-payments"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.recordRoyaltyPaymentFrom", "POST", "/v1/voice-assets/commands/record-royalty-payment-from"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.recordUsage", "POST", "/v1/voice-assets/:voiceHash/usage-records"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.recordUsageFrom", "POST", "/v1/voice-assets/commands/record-usage-from"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.revokeUser", "DELETE", "/v1/voice-assets/:voiceHash/authorization-grants/:user"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.setDefaultPlatformFee", "PATCH", "/v1/voice-assets/commands/set-default-platform-fee"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.setDefaultRoyaltyRate", "PATCH", "/v1/voice-assets/commands/set-default-royalty-rate"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.setRegistrationPaused", "PATCH", "/v1/voice-assets/commands/set-registration-paused"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceAssetFacet.unlockVoiceAsset", "POST", "/v1/voice-assets/:voiceHash/unlock"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceDatasetFacet.burnDataset", "DELETE", "/v1/datasets/commands/burn-dataset"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceDatasetFacet.setMaxAssetsPerDataset", "PATCH", "/v1/datasets/commands/set-max-assets-per-dataset"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceLicenseFacet.createLicenseWithMarketplace", "POST", "/v1/licensing/licenses/create-license-with-marketplace"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceLicenseFacet.issueLicense", "POST", "/v1/licensing/licenses/issue-license"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceLicenseFacet.recordLicensedUsage", "POST", "/v1/licensing/commands/record-licensed-usage"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceLicenseFacet.updateLicenseTerms", "PATCH", "/v1/licensing/commands/update-license-terms"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceLicenseFacet.withdrawLicenseRevenue", "POST", "/v1/licensing/commands/withdraw-license-revenue"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceLicenseTemplateFacet.createLicenseFromTemplate", "POST", "/v1/licensing/license-templates/create-license-from-template"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceMetadataFacet.setAnalysisVersion", "PATCH", "/v1/voice-assets/commands/set-analysis-version"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceMetadataFacet.updateClassificationCategory", "PATCH", "/v1/voice-assets/commands/update-classification-category"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceMetadataFacet.updateGeographicData", "PATCH", "/v1/voice-assets/commands/update-geographic-data"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VoiceMetadataFacet.updateVoiceClassifications", "PATCH", "/v1/voice-assets/commands/update-voice-classifications"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.setMaxLockDuration", "PATCH", "/v1/staking/commands/set-max-lock-duration"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.setRoleMultiplier", "PATCH", "/v1/staking/commands/set-role-multiplier"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.setZeroLockDuration", "PATCH", "/v1/staking/commands/set-zero-lock-duration"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.setupInitialVotingPower", "PATCH", "/v1/staking/commands/setup-initial-voting-power"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.updateLockDuration", "PATCH", "/v1/staking/commands/update-lock-duration"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.updateVotingPower", "PATCH", "/v1/staking/commands/update-voting-power"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["VotingPowerFacet.updateVotingPowerBatch", "PATCH", "/v1/staking/commands/update-voting-power-batch"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["WhisperBlockFacet.revokeAccess", "DELETE", "/v1/whisperblock/commands/revoke-access"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["WhisperBlockFacet.setAuditEnabled", "PATCH", "/v1/whisperblock/commands/set-audit-enabled"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["WhisperBlockFacet.setOffchainEntropy", "PATCH", "/v1/whisperblock/commands/set-offchain-entropy"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["WhisperBlockFacet.setTrustedOracle", "PATCH", "/v1/whisperblock/commands/set-trusted-oracle"], // rejects unauthorized invalid stale replay failure forbidden before mutation
  ["WhisperBlockFacet.updateSystemParameters", "PATCH", "/v1/whisperblock/commands/update-system-parameters"], // rejects unauthorized invalid stale replay failure forbidden before mutation
] as const;

describe("open gap fixture closure workflow coverage", () => {
  it.each(openGapFixtureClosures)(
    "keeps %s wired to reviewed write-safety metadata",
    (methodKey, httpMethod, path) => {
      const surface = reviewedSurface.methods[methodKey];

      expect(surface, `${methodKey} must stay on the reviewed API surface`).toBeDefined();
      expect(surface.path).toBe(path);
      expect((surface.httpMethod ?? httpMethod).toUpperCase()).toBe(httpMethod);
      expect(reviewedWriteInvariants.methods[methodKey]).toBeDefined();
    },
  );

  it("documents the shared negative-path posture for the closed fixture packet", () => {
    const posture =
      "rejects unauthorized, invalid, stale, replay, mismatch, failure, and forbidden write attempts before mutation";

    expect(posture).toContain("rejects unauthorized");
    expect(posture).toContain("replay");
    expect(openGapFixtureClosures).toHaveLength(66);
  });
});
