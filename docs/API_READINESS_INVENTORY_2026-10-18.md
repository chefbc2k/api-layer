# API readiness inventory — October 18, 2026

All 33 facets have generated HTTP routes for their ABI functions. This table separates implementation coverage from complete write receipt/indexer evidence. Complete proof is matched by exact HTTP method and path against the durable local-fork indexer artifact dated 2026-10-17T18:34:38.836Z. It is not a mainnet certification.

| Facet | Functions | Reads | Writes | Complete write proof | Missing write proof |
| --- | ---: | ---: | ---: | ---: | ---: |
| AccessControlFacet | 25 | 13 | 12 | 7 | 5 |
| BurnThresholdFacet | 6 | 2 | 4 | 1 | 3 |
| CommunityRewardsFacet | 10 | 5 | 5 | 5 | 0 |
| DelegationFacet | 10 | 6 | 4 | 1 | 3 |
| DiamondCutFacet | 9 | 5 | 4 | 0 | 4 |
| DiamondLoupeFacet | 5 | 5 | 0 | 0 | 0 |
| EchoScoreFacetV3 | 16 | 8 | 8 | 0 | 8 |
| EmergencyFacet | 23 | 6 | 17 | 10 | 7 |
| EmergencyWithdrawalFacet | 7 | 2 | 5 | 0 | 5 |
| EscrowFacet | 7 | 3 | 4 | 0 | 4 |
| GovernorFacet | 8 | 2 | 6 | 0 | 6 |
| LegacyExecutionFacet | 4 | 0 | 4 | 0 | 4 |
| LegacyFacet | 10 | 0 | 10 | 0 | 10 |
| LegacyViewFacet | 4 | 4 | 0 | 0 | 0 |
| MarketplaceFacet | 8 | 2 | 6 | 6 | 0 |
| MultiSigFacet | 17 | 6 | 11 | 0 | 11 |
| OwnershipFacet | 10 | 4 | 6 | 0 | 6 |
| PaymentFacet | 39 | 13 | 26 | 9 | 17 |
| ProposalFacet | 20 | 13 | 7 | 2 | 5 |
| RightsFacet | 15 | 7 | 8 | 0 | 8 |
| StakingFacet | 23 | 11 | 12 | 6 | 6 |
| TimelockFacet | 12 | 8 | 4 | 3 | 1 |
| TimewaveGiftFacet | 17 | 9 | 8 | 2 | 6 |
| TokenSupplyFacet | 21 | 10 | 11 | 5 | 6 |
| UpgradeControllerFacet | 14 | 8 | 6 | 0 | 6 |
| VestingFacet | 30 | 18 | 12 | 0 | 12 |
| VoiceAssetFacet | 42 | 23 | 19 | 15 | 4 |
| VoiceDatasetFacet | 15 | 6 | 9 | 9 | 0 |
| VoiceLicenseFacet | 16 | 8 | 8 | 3 | 5 |
| VoiceLicenseTemplateFacet | 7 | 3 | 4 | 4 | 0 |
| VoiceMetadataFacet | 11 | 6 | 5 | 5 | 0 |
| VotingPowerFacet | 17 | 10 | 7 | 7 | 0 |
| WhisperBlockFacet | 14 | 6 | 8 | 8 | 0 |
| **Total** | **492** | **232** | **260** | **108** | **152** |

## Writes missing complete receipt/indexer proof

These endpoints exist. Each still needs exact-method successful receipt, decoded events or eventless readback, PostgreSQL ingestion and replay evidence before it meets the tracked completion standard. The absence of evidence is not proof of a defect.

### AccessControlFacet

| Signature | Existing HTTP route |
| --- | --- |
| `emergencyForceAdd(bytes32,address)` | `POST /v1/access-control/admin/emergency-force-add` |
| `executeFounderSunset()` | `POST /v1/access-control/admin/execute-founder-sunset` |
| `scheduleFounderSunset(uint256)` | `POST /v1/access-control/admin/schedule-founder-sunset` |
| `setPaused(bool)` | `POST /v1/access-control/admin/set-paused` |
| `setRecoveryActive(bytes32,bool)` | `POST /v1/access-control/admin/set-recovery-active` |

### BurnThresholdFacet

| Signature | Existing HTTP route |
| --- | --- |
| `thresholdBurnExcess(address)` | `POST /v1/tokenomics/commands/threshold-burn-excess` |
| `thresholdBurnTokens(uint256)` | `POST /v1/tokenomics/commands/threshold-burn-tokens` |
| `thresholdBurnTokensFrom(address,uint256)` | `POST /v1/tokenomics/commands/threshold-burn-tokens-from` |

### DelegationFacet

| Signature | Existing HTTP route |
| --- | --- |
| `delegateBySig(address,uint256,uint256,uint8,bytes32,bytes32)` | `POST /v1/staking/commands/delegate-by-sig` |
| `updateDelegatedVotingPower(address)` | `PATCH /v1/staking/commands/update-delegated-voting-power` |
| `updateDelegatedVotingPowerBatch(address[])` | `PATCH /v1/staking/commands/update-delegated-voting-power-batch` |

### DiamondCutFacet

| Signature | Existing HTTP route |
| --- | --- |
| `diamondCut((address,uint8,bytes4[])[],address,bytes)` | `POST /v1/diamond-admin/admin/diamond-cut` |
| `setTrustedInitCodehash(address,bytes32)` | `POST /v1/diamond-admin/admin/set-trusted-init-codehash` |
| `setTrustedInitContract(address,bool)` | `POST /v1/diamond-admin/admin/set-trusted-init-contract` |
| `setTrustedInitSelector(address,bytes4,bool)` | `POST /v1/diamond-admin/admin/set-trusted-init-selector` |

### EchoScoreFacetV3

| Signature | Existing HTTP route |
| --- | --- |
| `batchUpdateScores((bytes32,(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256,bool,bool),(uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes)[])` | `POST /v1/staking/commands/batch-update-scores` |
| `pauseEchoScoreV3()` | `POST /v1/staking/commands/pause-echo-score-v3` |
| `setEchoScoreOracleV3(address)` | `PATCH /v1/staking/commands/set-echo-score-oracle-v3` |
| `setOracleFutureDriftConfig(uint256)` | `PATCH /v1/staking/commands/set-oracle-future-drift-config` |
| `setOracleQuorumSigners(address[],uint256)` | `PATCH /v1/staking/commands/set-oracle-quorum-signers` |
| `setOracleStalenessConfig(uint256)` | `PATCH /v1/staking/commands/set-oracle-staleness-config` |
| `unpauseEchoScoreV3()` | `POST /v1/staking/commands/unpause-echo-score-v3` |
| `updateScore((bytes32,(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256,uint256,uint256),(uint256,uint256,uint256),(uint256,uint256,uint256,bool,bool),(uint256,uint256,uint256,uint256,uint256,uint256),uint256,uint256,bytes))` | `PATCH /v1/staking/commands/update-score` |

### EmergencyFacet

| Signature | Existing HTTP route |
| --- | --- |
| `approveRecovery(uint256)` | `POST /v1/emergency/admin/approve-recovery` |
| `completeRecovery(uint256)` | `POST /v1/emergency/admin/complete-recovery` |
| `executeRecoveryAction(bytes,uint256)` | `POST /v1/emergency/admin/execute-recovery-action` |
| `executeRecoveryStep(uint256,uint256)` | `POST /v1/emergency/admin/execute-recovery-step` |
| `setEmergencyTimeout(uint256)` | `POST /v1/emergency/admin/set-emergency-timeout` |
| `setResumeDelay(uint256)` | `POST /v1/emergency/admin/set-resume-delay` |
| `startRecovery(uint256,bytes[])` | `POST /v1/emergency/admin/start-recovery` |

### EmergencyWithdrawalFacet

| Signature | Existing HTTP route |
| --- | --- |
| `approveEmergencyWithdrawal(bytes32)` | `POST /v1/emergency/admin/approve-emergency-withdrawal` |
| `executeWithdrawal(bytes32)` | `POST /v1/emergency/admin/execute-withdrawal` |
| `requestEmergencyWithdrawal(address,uint256,address)` | `POST /v1/emergency/admin/request-emergency-withdrawal` |
| `setRecipientWhitelist(address,bool)` | `POST /v1/emergency/admin/set-recipient-whitelist` |
| `updateWithdrawalConfig(uint256,uint256,uint256,bool,uint256)` | `POST /v1/emergency/admin/update-withdrawal-config` |

### EscrowFacet

| Signature | Existing HTTP route |
| --- | --- |
| `escrowAsset(uint256,address,uint8)` | `POST /v1/marketplace/commands/escrow-asset` |
| `onERC721Received(address,address,uint256,bytes)` | `POST /v1/marketplace/commands/on-erc721-received` |
| `releaseAsset(uint256,address)` | `POST /v1/marketplace/commands/release-asset` |
| `updateAssetState(uint256,uint8)` | `PATCH /v1/marketplace/commands/update-asset-state` |

### GovernorFacet

| Signature | Existing HTTP route |
| --- | --- |
| `setDefaultGasLimit(uint256)` | `PATCH /v1/governance/commands/set-default-gas-limit` |
| `setTrustedTarget(address,bool,uint256)` | `PATCH /v1/governance/commands/set-trusted-target` |
| `updateProposalThreshold(uint256)` | `PATCH /v1/governance/commands/update-proposal-threshold` |
| `updateQuorumNumerator(uint256)` | `PATCH /v1/governance/commands/update-quorum-numerator` |
| `updateVotingDelay(uint256)` | `PATCH /v1/governance/commands/update-voting-delay` |
| `updateVotingPeriod(uint256)` | `PATCH /v1/governance/commands/update-voting-period` |

### LegacyExecutionFacet

| Signature | Existing HTTP route |
| --- | --- |
| `approveInheritance(bytes32)` | `POST /v1/voice-assets/commands/approve-inheritance` |
| `delegateRights(address,uint256)` | `POST /v1/voice-assets/commands/delegate-rights` |
| `executeInheritance(address)` | `POST /v1/voice-assets/commands/execute-inheritance` |
| `initiateInheritance(bytes32,string[])` | `POST /v1/voice-assets/legacy/initiate-inheritance` |

### LegacyFacet

| Signature | Existing HTTP route |
| --- | --- |
| `addBeneficiary(address,uint256,bool)` | `POST /v1/voice-assets/commands/add-beneficiary` |
| `addDatasets(uint256[])` | `POST /v1/voice-assets/commands/add-datasets` |
| `addInheritanceRequirement(string)` | `POST /v1/voice-assets/commands/add-inheritance-requirement` |
| `addVoiceAssets(bytes32[])` | `POST /v1/voice-assets/commands/add-voice-assets` |
| `createLegacyPlan(string)` | `POST /v1/voice-assets/legacy/create-legacy-plan` |
| `setBeneficiaryRelationship(address,string)` | `PATCH /v1/voice-assets/commands/set-beneficiary-relationship` |
| `setInheritanceConditions(uint256,bool,address[],uint256)` | `PATCH /v1/voice-assets/commands/set-inheritance-conditions` |
| `setMaxBeneficiaries(uint256)` | `PATCH /v1/voice-assets/commands/set-max-beneficiaries` |
| `setMinTimelockPeriod(uint256)` | `PATCH /v1/voice-assets/commands/set-min-timelock-period` |
| `updateBeneficiary((uint256,uint256,address,bool,bool,string),uint256)` | `PATCH /v1/voice-assets/commands/update-beneficiary` |

### MultiSigFacet

| Signature | Existing HTTP route |
| --- | --- |
| `addOperationType(bytes32)` | `POST /v1/multisig/admin/add-operation-type` |
| `addOperator(address)` | `POST /v1/multisig/admin/add-operator` |
| `approveOperation(bytes32)` | `POST /v1/multisig/admin/approve-operation` |
| `cancelOperation(bytes32,string)` | `DELETE /v1/multisig/commands/cancel-operation` |
| `execute(address,uint256,bytes)` | `POST /v1/multisig/admin/execute` |
| `executeOperation(bytes32)` | `POST /v1/multisig/admin/execute-operation` |
| `muSetPaused(bool)` | `POST /v1/multisig/admin/mu-set-paused` |
| `proposeOperation(bytes[],uint256)` | `POST /v1/multisig/admin/propose-operation` |
| `removeOperator(address)` | `DELETE /v1/multisig/commands/remove-operator` |
| `setOperationConfig(bytes32,(uint256,uint256,bool))` | `POST /v1/multisig/admin/set-operation-config` |
| `submitTransaction(address,uint256,bytes)` | `POST /v1/multisig/admin/submit-transaction` |

### OwnershipFacet

| Signature | Existing HTTP route |
| --- | --- |
| `acceptOwnership()` | `POST /v1/ownership/commands/accept-ownership` |
| `cancelOwnershipTransfer()` | `DELETE /v1/ownership/commands/cancel-ownership-transfer` |
| `proposeOwnershipTransfer(address)` | `POST /v1/ownership/commands/propose-ownership-transfer` |
| `setApprovedOwnerTarget(address,bool)` | `PATCH /v1/ownership/commands/set-approved-owner-target` |
| `setOwnershipPolicyEnforced(bool)` | `PATCH /v1/ownership/commands/set-ownership-policy-enforced` |
| `transferOwnership(address)` | `POST /v1/ownership/commands/transfer-ownership` |

### PaymentFacet

| Signature | Existing HTTP route |
| --- | --- |
| `approveMultisigWithdrawal(address,uint256,address)` | `POST /v1/marketplace/commands/approve-multisig-withdrawal` |
| `commitDistribution(bytes32)` | `POST /v1/marketplace/commands/commit-distribution` |
| `commitWithdraw(bytes32)` | `POST /v1/marketplace/commands/commit-withdraw` |
| `distributePayment(uint256,uint256,address,address,bool)` | `POST /v1/marketplace/commands/distribute-payment` |
| `distributePaymentFrom(uint256,uint256,address,address,bool,address)` | `POST /v1/marketplace/commands/distribute-payment-from` |
| `distributePaymentFromWithDeadline(uint256,uint256,address,address,bool,address,uint256)` | `POST /v1/marketplace/commands/distribute-payment-from-with-deadline` |
| `distributePaymentWithDeadline(uint256,uint256,address,address,bool,uint256)` | `POST /v1/marketplace/commands/distribute-payment-with-deadline` |
| `executeMultisigWithdrawal(address,uint256,address,uint256)` | `POST /v1/marketplace/commands/execute-multisig-withdrawal` |
| `executeQuarterlyBuyback(uint256,uint256)` | `POST /v1/marketplace/commands/execute-quarterly-buyback` |
| `revealDistribution(uint256,uint256,address,address,bool,address,uint256,uint256)` | `POST /v1/marketplace/commands/reveal-distribution` |
| `revealDistributionStruct((uint256,uint256,address,address,bool,address,uint256,uint256))` | `POST /v1/marketplace/commands/reveal-distribution-struct` |
| `revealWithdraw(uint256,uint256,uint256)` | `POST /v1/marketplace/commands/reveal-withdraw` |
| `setBuybackConfig(uint256,uint256,uint256,uint256,address,address,address)` | `PATCH /v1/marketplace/commands/set-buyback-config` |
| `setBuybackConfigStruct((uint256,uint256,uint256,uint256,address,address,address))` | `PATCH /v1/marketplace/commands/set-buyback-config-struct` |
| `setMevProtectionConfig(bool,address,uint256,uint256,uint256)` | `PATCH /v1/marketplace/commands/set-mev-protection-config` |
| `setStakingConfig(address,uint256)` | `PATCH /v1/marketplace/commands/set-staking-config` |
| `setUsdcToken(address)` | `PATCH /v1/marketplace/commands/set-usdc-token` |

### ProposalFacet

| Signature | Existing HTTP route |
| --- | --- |
| `cancelProposal(uint256)` | `DELETE /v1/governance/commands/cancel-proposal` |
| `prExecute(uint256)` | `POST /v1/governance/commands/pr-execute` |
| `prQueue(uint256)` | `POST /v1/governance/commands/pr-queue` |
| `propose(string,string,address[],uint256[],bytes[],uint8)` | `POST /v1/governance/admin/legacy-proposals` |
| `setProposalTypeConfig(uint8,uint256,uint256,uint256)` | `PATCH /v1/governance/commands/set-proposal-type-config` |

### RightsFacet

| Signature | Existing HTTP route |
| --- | --- |
| `addCollaborator(bytes32,address,uint256)` | `POST /v1/licensing/commands/add-collaborator` |
| `createRightsGroup(bytes32,string,(string,uint256,uint256,bool,string[],bool)[],address[])` | `POST /v1/licensing/rights/create-rights-group` |
| `grantRight(bytes32,address,(string,uint256,uint256,bool,string[],bool))` | `POST /v1/licensing/commands/grant-right` |
| `registerRightContract(string,address)` | `POST /v1/licensing/rights/register-right-contract` |
| `removeCollaborator(bytes32,address)` | `DELETE /v1/licensing/commands/remove-collaborator` |
| `revokeRight(bytes32,address,string)` | `DELETE /v1/licensing/commands/revoke-right` |
| `updateCollaboratorShare(bytes32,address,uint256)` | `PATCH /v1/licensing/commands/update-collaborator-share` |
| `updateRightContract(string,address)` | `PATCH /v1/licensing/commands/update-right-contract` |

### StakingFacet

| Signature | Existing HTTP route |
| --- | --- |
| `initStaking(uint256,uint256,uint256,uint256[],uint256[])` | `POST /v1/staking/stakes/init-staking` |
| `initStakingWithToken(address,uint256,uint256,uint256,uint256[],uint256[])` | `POST /v1/staking/stakes/init-staking-with-token` |
| `queueTierConfigUpdate(uint256[],uint256[])` | `POST /v1/staking/commands/queue-tier-config-update` |
| `setDegradedModeConfig(bool,uint256,uint256)` | `PATCH /v1/staking/commands/set-degraded-mode-config` |
| `setEchoScoreBoost(uint256,uint256)` | `PATCH /v1/staking/commands/set-echo-score-boost` |
| `setStakingPaused(bool)` | `PATCH /v1/staking/commands/set-staking-paused` |

### TimelockFacet

| Signature | Existing HTTP route |
| --- | --- |
| `updateMinDelay(uint256)` | `PATCH /v1/governance/commands/update-min-delay` |

### TimewaveGiftFacet

| Signature | Existing HTTP route |
| --- | --- |
| `batchReleaseTwaveVesting(address[])` | `POST /v1/tokenomics/commands/batch-release-twave-vesting` |
| `createUsdcVestingSchedule(address,uint256,uint256,uint256,uint256,bool,bool)` | `POST /v1/tokenomics/vesting/create-usdc-vesting-schedule` |
| `releaseTwaveVesting()` | `POST /v1/tokenomics/commands/release-twave-vesting` |
| `releaseTwaveVestingFor(address)` | `POST /v1/tokenomics/commands/release-twave-vesting-for` |
| `revokeTwaveVesting(address)` | `DELETE /v1/tokenomics/commands/revoke-twave-vesting` |
| `transferTwaveVesting(address)` | `POST /v1/tokenomics/commands/transfer-twave-vesting` |

### TokenSupplyFacet

| Signature | Existing HTTP route |
| --- | --- |
| `burn(uint256)` | `DELETE /v1/tokenomics/commands/burn` |
| `burnFrom(address,uint256)` | `DELETE /v1/tokenomics/commands/burn-from` |
| `initializeToken()` | `POST /v1/tokenomics/token-supply` |
| `supplyFinishMinting()` | `POST /v1/tokenomics/commands/supply-finish-minting` |
| `supplyMintTokens(address,uint256)` | `POST /v1/tokenomics/commands/supply-mint-tokens` |
| `supplySetMaximum(uint256)` | `POST /v1/tokenomics/commands/supply-set-maximum` |

### UpgradeControllerFacet

| Signature | Existing HTTP route |
| --- | --- |
| `approveUpgrade(bytes32)` | `POST /v1/diamond-admin/admin/approve-upgrade` |
| `executeUpgrade((address,uint8,bytes4[])[],address,bytes,bytes32)` | `POST /v1/diamond-admin/admin/execute-upgrade` |
| `freezeUpgradeControl()` | `POST /v1/diamond-admin/admin/freeze-upgrade-control` |
| `initUpgradeController(address[],uint256,uint256)` | `POST /v1/diamond-admin/diamond-admin` |
| `proposeDiamondCut((address,uint8,bytes4[])[],address,bytes)` | `POST /v1/diamond-admin/admin/propose-diamond-cut` |
| `setUpgradeControlEnforced(bool)` | `POST /v1/diamond-admin/admin/set-upgrade-control-enforced` |

### VestingFacet

| Signature | Existing HTTP route |
| --- | --- |
| `createCexVesting(address,uint256)` | `POST /v1/tokenomics/vesting/create-cex-vesting` |
| `createDevFundVesting(address,uint256)` | `POST /v1/tokenomics/vesting/create-dev-fund-vesting` |
| `createFounderVesting(address,uint256)` | `POST /v1/tokenomics/vesting/create-founder-vesting` |
| `createPublicVesting(address,uint256)` | `POST /v1/tokenomics/vesting/create-public-vesting` |
| `createTeamVesting(address,uint256,uint8)` | `POST /v1/tokenomics/vesting/create-team-vesting` |
| `releaseStandardVesting()` | `POST /v1/tokenomics/commands/release-standard-vesting` |
| `releaseStandardVestingFor(address)` | `POST /v1/tokenomics/commands/release-standard-vesting-for` |
| `releaseTokensFor(address)` | `POST /v1/tokenomics/commands/release-tokens-for` |
| `releaseVestedTokens()` | `POST /v1/tokenomics/commands/release-vested-tokens` |
| `revokeVestingSchedule(address)` | `DELETE /v1/tokenomics/commands/revoke-vesting-schedule` |
| `setMinimumVestingDuration(uint256)` | `PATCH /v1/tokenomics/commands/set-minimum-vesting-duration` |
| `transferVestingSchedule(address)` | `POST /v1/tokenomics/commands/transfer-vesting-schedule` |

### VoiceAssetFacet

| Signature | Existing HTTP route |
| --- | --- |
| `recordRoyaltyPayment(bytes32,uint256,bytes32)` | `POST /v1/voice-assets/:voiceHash/royalty-payments` |
| `recordRoyaltyPaymentFrom(bytes32,uint256,bytes32,address)` | `POST /v1/voice-assets/commands/record-royalty-payment-from` |
| `recordUsageFrom(bytes32,bytes32,address)` | `POST /v1/voice-assets/commands/record-usage-from` |
| `registerVoiceAssetForCaller(string,uint256,address)` | `POST /v1/voice-assets/registrations/for-caller` |

### VoiceLicenseFacet

| Signature | Existing HTTP route |
| --- | --- |
| `createLicenseWithMarketplace(bytes32,bytes32,uint256,uint256,bool,string)` | `POST /v1/licensing/licenses/create-license-with-marketplace` |
| `issueLicense(bytes32,address,bytes32,uint256)` | `POST /v1/licensing/licenses/issue-license` |
| `transferLicense(bytes32,bytes32,address)` | `POST /v1/licensing/commands/transfer-license` |
| `updateLicenseTerms(bytes32,bytes32,uint256,uint256,string)` | `PATCH /v1/licensing/commands/update-license-terms` |
| `withdrawLicenseRevenue()` | `POST /v1/licensing/commands/withdraw-license-revenue` |

## Evidence and limitations

- Source inventories: `output/api-test-gap-report.json`, `generated/manifests/http-endpoint-registry.json`, generated primitive route files.
- Complete write evidence: `verify-local-fork-indexer-output.json`; all 108 report routes match the current HTTP registry.
- All 492 functions and registration checks are recorded in [the machine-readable inventory](../output/api-readiness-review-2026-10-18.json).
- Existing generic report classifications are static evidence attribution and can include guard-only outcomes.
- No separate quiz/catalog, WGMI namespace or Wagmi frontend implementation was provided or found in this repository.
- No Coinbase transaction or live chain write was made during this review.
