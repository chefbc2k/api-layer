# API Test Gap Report

Generated: `2026-10-09T02:52:28.949Z`

This report is an evidence inventory, not a claim that generated parity alone proves protocol safety. Test attribution is static and conservative; inspect the linked evidence arrays in the JSON artifact before promoting an item.

## Summary

- Facets: `33`
- Functions: `492`
- Events: `218`
- Items: `710`

| Classification | Count |
| --- | ---: |
| ready | 574 |
| needs fixture | 100 |
| unsafe on live network | 36 |
| needs contract change | 0 |
| needs API guard | 0 |
| needs indexer proof | 0 |

| Proof dimension | Items |
| --- | ---: |
| abiManifest | 710 |
| rpcRegistry | 710 |
| httpRegistry | 709 |
| reviewedApiSurface | 709 |
| unit | 660 |
| workflow | 333 |
| localFork | 109 |
| baseSepolia | 60 |
| negativePath | 340 |
| economic | 167 |
| redTeam | 129 |
| indexer | 218 |

## Methodology

- A protocol test is attributed when its source directly mentions the ABI key, identifier-bounded name or wrapper key, signature, identifier-bounded operation id, or HTTP path; identifier fragments inside a kebab-case operation do not count. Negative/economic/red-team depth additionally requires a nearby proof keyword. The gap reporter's own tests are excluded to avoid self-attribution.
- A successful verify domain is attributed only by an exact generated HTTP method/path match. Fork markers classify local-fork proof; other tracked verify artifacts classify Base Sepolia proof.
- Mechanical gaps dominate; intentionally excluded/admin operations without live proof are unsafe on live network; writes require unit, workflow, and negative-path evidence; events require event-specific indexer tests.

## AccessControlFacet

Facet classification: **unsafe on live network**. Proof depth spans `unit` to `indexer` with an average score of `2.7/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `configureRole` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `debugRoleIndexState` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `emergencyForceAdd` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeFounderSunset` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `getOwnerOperationalRoles` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getQuorum` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRequiredSigners` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRoleAdmin` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getRoleConfig` | read | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `getRoleMember` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRoleMembers` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getUserRoles` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `grantRole` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `hasAllParticipantRoles` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `hasRole` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `isFounderSunsetActive` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isRoleActive` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `renounceRole` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `revokeRole` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `scheduleFounderSunset` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setDefaultValidityPeriod` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setMinValidations` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setPaused` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setRecoveryActive` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setRoleAdmin` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `AccessControlFacet.AccessAttempt` | yes | — | — | yes | indexer 3/8 | ready |
| `AccessControlFacet.DAOMemberRoleGranted` | yes | — | — | yes | indexer 3/8 | ready |
| `AccessControlFacet.FounderSunsetExecuted` | yes | — | — | yes | indexer 3/8 | ready |
| `AccessControlFacet.FounderSunsetScheduled` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.GovernanceParticipantRoleGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.MarketplacePurchaserRoleGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.MarketplaceSellerRoleGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.ParticipantRoleRevoked` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.ResearchParticipantRoleGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleAdminChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleConfigUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `AccessControlFacet.RoleGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleRenounced` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleRevoked` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.SecurityAction` | yes | — | — | yes | indexer 2/8 | ready |

## BurnThresholdFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3.78/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `thresholdBurnExcess` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `thresholdBurnTokens` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `thresholdBurnTokensFrom` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `thresholdCalculateExcess` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `thresholdGetBurnLimit` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `thresholdSetBurnLimit` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `BurnThresholdFacet.BurnThresholdUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `BurnThresholdFacet.ThresholdBurn` | yes | — | — | yes | indexer 2/8 | ready |
| `BurnThresholdFacet.Transfer` | yes | — | — | yes | indexer 4/8 | ready |

## CommunityRewardsFacet

Facet classification: **ready**. Proof depth spans `unit` to `indexer` with an average score of `4.24/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `campaignCount` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `claim` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `claimableAmount` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `claimed` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `createCampaign` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `getCampaign` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `pauseCampaign` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `setMerkleRoot` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `unpauseCampaign` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `vestedAmount` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `CommunityRewardsFacet.CampaignCapConfig` | yes | — | — | yes | indexer 2/8 | ready |
| `CommunityRewardsFacet.CampaignCreated` | yes | — | — | yes | indexer 5/8 | ready |
| `CommunityRewardsFacet.CampaignMerkleRootUpdated` | yes | — | — | yes | indexer 4/8 | ready |
| `CommunityRewardsFacet.CampaignPaused` | yes | — | — | yes | indexer 6/8 | ready |
| `CommunityRewardsFacet.CampaignUnpaused` | yes | — | — | yes | indexer 4/8 | ready |
| `CommunityRewardsFacet.CampaignVestingConfig` | yes | — | — | yes | indexer 2/8 | ready |
| `CommunityRewardsFacet.Claimed` | yes | — | — | yes | indexer 6/8 | ready |

## DelegationFacet

Facet classification: **ready**. Proof depth spans `unit` to `indexer` with an average score of `3.13/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DELEGATION_TYPEHASH` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `DOMAIN_TYPEHASH` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `delegate` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `delegateBySig` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `delegates` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getCurrentVotes` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getPriorVotes` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getTotalVotingPower` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `updateDelegatedVotingPower` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateDelegatedVotingPowerBatch` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DelegationFacet.DelegateChanged(address,address,address)` | yes | — | — | yes | indexer 5/8 | ready |
| `DelegationFacet.DelegateChanged(address,address,address)#2` | yes | — | — | yes | indexer 5/8 | ready |
| `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)` | yes | — | — | yes | indexer 2/8 | ready |
| `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)#2` | yes | — | — | yes | indexer 2/8 | ready |
| `DelegationFacet.VotingPowerUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## DiamondCutFacet

Facet classification: **unsafe on live network**. Proof depth spans `unit` to `indexer` with an average score of `2.29/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FOUNDER_ROLE` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `diamondCut` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | unsafe on live network |
| `getTrustedInitCodehash` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isImmutableSelectorReserved` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isTrustedInitSelector` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isTrustedInitSelectorPolicyEnabled` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `setTrustedInitCodehash` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setTrustedInitContract` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setTrustedInitSelector` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DiamondCutFacet.DiamondCut` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.DiamondCutEvent` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.TrustedInitCodehashSet` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.TrustedInitContractSet` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.TrustedInitSelectorSet` | yes | — | — | yes | indexer 2/8 | ready |

## DiamondLoupeFacet

Facet classification: **ready**. Proof depth spans `unit` to `adversarial` with an average score of `1.8/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `facetAddress` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `facetAddresses` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `facetFunctionSelectors` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `facets` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `supportsInterface` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| _none_ | — | — | — | — | — | — |

## EchoScoreFacetV3

Facet classification: **ready**. Proof depth spans `unit` to `indexer` with an average score of `2.33/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batchUpdateScores` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `getEchoScoreOracleV3` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOracleFutureDriftConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOracleQuorumSigners` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOracleStalenessConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getReputation` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getReputationHistory` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isEchoScorePausedV3` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isOracleHealthy` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `pauseEchoScoreV3` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `setEchoScoreOracleV3` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `setOracleFutureDriftConfig` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `setOracleQuorumSigners` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `setOracleStalenessConfig` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `unpauseEchoScoreV3` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateScore` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EchoScoreFacetV3.OracleFutureDriftConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.OracleQuorumConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.OracleStalenessConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.OracleUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.Paused` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.ReputationUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.ScoresUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `EchoScoreFacetV3.Unpaused` | yes | — | — | yes | indexer 2/8 | ready |

## EmergencyFacet

Facet classification: **unsafe on live network**. Proof depth spans `workflow` to `indexer` with an average score of `3.7/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveRecovery` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `completeRecovery` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `emergencyResume` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `emergencyStop` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `executeRecoveryAction` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeRecoveryStep` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeResponse` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `executeScheduledResume` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `extendPausedUntil` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `freezeAssets` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `getEmergencyState` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getEmergencyTimeout` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getIncident` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getRecoveryPlan` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isAssetFrozen` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `isEmergencyStopped` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `reportIncident` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `scheduleEmergencyResume` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `setEmergencyTimeout` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setResumeDelay` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `startRecovery` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `triggerEmergency` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `unfreezeAssets` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EmergencyFacet.AssetsFrozen` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyFacet.EmergencyResumeExecuted` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyFacet.EmergencyResumeScheduled` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyFacet.EmergencyStateChanged` | yes | — | — | yes | indexer 5/8 | ready |
| `EmergencyFacet.IncidentReported` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyFacet.PauseExtended` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyFacet.RecoveryCompleted` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyFacet.RecoveryStarted` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyFacet.RecoveryStepExecuted` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyFacet.ResponseExecuted` | yes | — | — | yes | indexer 4/8 | ready |

## EmergencyWithdrawalFacet

Facet classification: **unsafe on live network**. Proof depth spans `adversarial` to `indexer` with an average score of `3/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveEmergencyWithdrawal` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeWithdrawal` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `getApprovalCount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isRecipientWhitelisted` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `requestEmergencyWithdrawal` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setRecipientWhitelist` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `updateWithdrawalConfig` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalApproved` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalRequested` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawal` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalApproved` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalExecuted` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalRequested` | yes | — | — | yes | indexer 4/8 | ready |
| `EmergencyWithdrawalFacet.RecipientWhitelisted` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyWithdrawalFacet.WithdrawalConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## EscrowFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3.9/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `escrowAsset` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `getAssetState` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getOriginalOwner` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isInEscrow` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `onERC721Received` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `releaseAsset` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateAssetState` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EscrowFacet.AssetEscrowed` | yes | — | — | yes | indexer 2/8 | ready |
| `EscrowFacet.AssetReleased` | yes | yes | — | yes | indexer 6/8 | ready |
| `EscrowFacet.AssetStateUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## GovernorFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3.3/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getRoleMultiplier` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getVotingConfig` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `setDefaultGasLimit` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `setTrustedTarget` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateProposalThreshold` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateQuorumNumerator` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateVotingDelay` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateVotingPeriod` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `GovernorFacet.TargetGasLimitUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `GovernorFacet.TrustedTargetUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## LegacyExecutionFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveInheritance` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `delegateRights` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `executeInheritance` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `initiateInheritance` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `LegacyExecutionFacet.InheritanceActivated` | yes | — | — | yes | indexer 3/8 | ready |
| `LegacyExecutionFacet.InheritanceApproved` | yes | — | — | yes | indexer 3/8 | ready |
| `LegacyExecutionFacet.RightsDelegated` | yes | — | — | yes | indexer 3/8 | ready |

## LegacyFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.23/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addBeneficiary` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `addDatasets` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `addInheritanceRequirement` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `addVoiceAssets` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createLegacyPlan` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setBeneficiaryRelationship` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setInheritanceConditions` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setMaxBeneficiaries` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setMinTimelockPeriod` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateBeneficiary` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `LegacyFacet.BeneficiaryUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `LegacyFacet.InheritanceConditionsUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `LegacyFacet.LegacyPlanCreated` | yes | — | — | yes | indexer 3/8 | ready |

## LegacyViewFacet

Facet classification: **ready**. Proof depth spans `unit` to `adversarial` with an average score of `2.75/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getLegacyPlan` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `isInheritanceReady` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `validateBeneficiaries` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `validateBeneficiary` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| _none_ | — | — | — | — | — | — |

## MarketplaceFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `4.47/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cancelListing` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `getListing` | read | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `isPaused` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `listAsset` | write | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `pause` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `purchaseAsset` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `unpause` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateListingPrice` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `MarketplaceFacet.AssetEscrowed` | yes | — | — | yes | indexer 4/8 | ready |
| `MarketplaceFacet.AssetListed` | yes | — | yes | yes | indexer 6/8 | ready |
| `MarketplaceFacet.AssetPurchased` | yes | yes | — | yes | indexer 6/8 | ready |
| `MarketplaceFacet.ListingCancelled` | yes | — | — | yes | indexer 4/8 | ready |
| `MarketplaceFacet.ListingPriceUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `MarketplaceFacet.MarketplacePaused` | yes | — | — | yes | indexer 2/8 | ready |
| `MarketplaceFacet.MarketplaceUnpaused` | yes | — | — | yes | indexer 2/8 | ready |

## MultiSigFacet

Facet classification: **unsafe on live network**. Proof depth spans `unit` to `indexer` with an average score of `3.08/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addOperationType` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `addOperator` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `approveOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `canExecuteOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `cancelOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `execute` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | unsafe on live network |
| `executeOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `getOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getOperationConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOperationStatus` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `hasApprovedOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperator` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `muSetPaused` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `proposeOperation` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `removeOperator` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setOperationConfig` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `submitTransaction` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `MultiSigFacet.ActionExecuted` | yes | — | — | yes | indexer 3/8 | ready |
| `MultiSigFacet.BatchCompleted` | yes | — | — | yes | indexer 3/8 | ready |
| `MultiSigFacet.MultiSigOperationCancelled` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.OperationApproved` | yes | — | — | yes | indexer 3/8 | ready |
| `MultiSigFacet.OperationExecuted` | yes | — | — | yes | indexer 4/8 | ready |
| `MultiSigFacet.OperationProposed` | yes | — | — | yes | indexer 3/8 | ready |
| `MultiSigFacet.OperationStatusChanged` | yes | — | — | yes | indexer 3/8 | ready |

## OwnershipFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `1.93/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `acceptOwnership` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `cancelOwnershipTransfer` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isOwnerTargetApproved` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOwnershipPolicyEnforced` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `owner` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `pendingOwner` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `proposeOwnershipTransfer` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setApprovedOwnerTarget` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setOwnershipPolicyEnforced` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `transferOwnership` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `OwnershipFacet.OwnershipPolicyEnforcementSet` | yes | — | — | yes | indexer 2/8 | ready |
| `OwnershipFacet.OwnershipTargetApprovalSet` | yes | — | — | yes | indexer 3/8 | ready |
| `OwnershipFacet.OwnershipTransferCancelled` | yes | — | — | yes | indexer 3/8 | ready |
| `OwnershipFacet.OwnershipTransferProposed` | yes | — | — | yes | indexer 3/8 | ready |
| `OwnershipFacet.OwnershipTransferred` | yes | — | — | yes | indexer 3/8 | ready |

## PaymentFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.02/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveMultisigWithdrawal` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `commitDistribution` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `commitWithdraw` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `distributePayment` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `distributePaymentFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `distributePaymentFromWithDeadline` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `distributePaymentWithDeadline` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `executeMultisigWithdrawal` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `executeQuarterlyBuyback` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getAssetRevenue` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getBuybackStatus` | read | yes | yes | — | — | — | yes | — | adversarial 3/8 | ready |
| `getDevFundAddress` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getFeeConfiguration` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getMevProtectionConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getPendingPayments` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getPendingTimewaveGift` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRevenueMetrics` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getTreasuryAddress` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getTreasuryWithdrawalLimit` | read | yes | yes | — | — | — | yes | — | adversarial 3/8 | ready |
| `getUnionTreasuryAddress` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getUsdcToken` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `pauseBuybacks` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `paymentPaused` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `revealDistribution` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revealDistributionStruct` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revealWithdraw` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setBuybackConfig` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `setBuybackConfigStruct` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `setMevProtectionConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setPaymentPaused` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `setStakingConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setTreasuryWithdrawalLimit` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `setUsdcToken` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateDevFundAddress` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `updateFeeConfiguration` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `updateTreasuryAddress` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `updateUnionTreasuryAddress` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `withdrawPayments` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `withdrawPaymentsWithDeadline` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `PaymentFacet.BuybackAccumulatorUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.BuybackConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.BuybackExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.BuybackPaused` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.ClaimCommitted` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.ClaimRevealed` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.DatasetRoyaltyAccrued` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.DevFundAddressUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.FeeConfigurationUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.FlashbotsSuggested` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.MetadataAccessed` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.PauseStateChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.PaymentDistributed` | yes | yes | — | yes | indexer 6/8 | ready |
| `PaymentFacet.TimewaveGiftCreated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.TreasuryAddressUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.USDCPaymentWithdrawn` | yes | — | — | yes | indexer 5/8 | ready |
| `PaymentFacet.UnionTreasuryAddressUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.UsdcTokenUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.WithdrawalLimitUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## ProposalFacet

Facet classification: **unsafe on live network**. Proof depth spans `unit` to `indexer` with an average score of `2.96/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GOVERNANCE_PROPOSER_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `TIMELOCK_ROLE` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `cancelProposal` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `getActiveProposals` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getProposalTypeConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getProposerProposals` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getReceipt` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prCastVote` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `prExecute` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prQueue` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prState` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `proposalDeadline` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `proposalExists` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `proposalSnapshot` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `proposalVotes` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `propose(string,string,address[],uint256[],bytes[],uint8)` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `propose(address[],uint256[],bytes[],string,uint8)` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `queue` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setProposalTypeConfig` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `state` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `ProposalFacet.ProposalCanceled` | yes | — | — | yes | indexer 2/8 | ready |
| `ProposalFacet.ProposalCreated` | yes | — | — | yes | indexer 4/8 | ready |
| `ProposalFacet.ProposalExecuted` | yes | — | — | yes | indexer 4/8 | ready |
| `ProposalFacet.ProposalQueued` | yes | — | — | yes | indexer 4/8 | ready |
| `ProposalFacet.ProposalTypeConfigSet` | yes | — | — | yes | indexer 2/8 | ready |
| `ProposalFacet.VoteCast` | yes | — | — | yes | indexer 4/8 | ready |

## RightsFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `1.29/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addCollaborator` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |
| `createRightsGroup` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getCategoryContracts` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getCollaborator` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `getRightCategory` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRightContract` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRightsGroup` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getUserRights` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `grantRight` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `registerRightContract` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `removeCollaborator` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revokeRight` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `rightIdExists` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `updateCollaboratorShare` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |
| `updateRightContract` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `RightsFacet.CollaboratorUpdated` | yes | — | — | yes | indexer 4/8 | ready |
| `RightsFacet.RightContractRegistered` | yes | — | — | yes | indexer 2/8 | ready |
| `RightsFacet.RightContractUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `RightsFacet.RightGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `RightsFacet.RightRevoked` | yes | — | — | yes | indexer 2/8 | ready |
| `RightsFacet.RightsGroupCreated` | yes | — | — | yes | indexer 2/8 | ready |

## StakingFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.18/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `advanceEpoch` | write | yes | — | yes | — | — | yes | — | adversarial 3/8 | needs fixture |
| `claimRewards` | write | yes | — | yes | — | — | yes | — | adversarial 3/8 | needs fixture |
| `executeUnstake` | write | yes | — | yes | — | yes | yes | — | adversarial 4/8 | needs fixture |
| `fundRewardPool` | write | yes | — | yes | — | — | yes | — | adversarial 3/8 | needs fixture |
| `getDegradedModeConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getEffectiveApy` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getPendingRewards` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getRewardBreakdown` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getStakeAgeMultiplier` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getStakeInfo` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getStakingStats` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getTier` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getTierConfig` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getUnstakeRequest` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `initStaking` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `initStakingWithToken` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isDegradedModeActive` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `queueTierConfigUpdate` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `requestUnstake` | write | yes | — | yes | — | — | yes | — | adversarial 3/8 | needs fixture |
| `setDegradedModeConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setEchoScoreBoost` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setStakingPaused` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `stake` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `StakingFacet.EpochAdvanced` | yes | — | — | yes | indexer 3/8 | ready |
| `StakingFacet.RewardPoolFunded` | yes | — | — | yes | indexer 3/8 | ready |
| `StakingFacet.RewardsClaimed` | yes | — | — | yes | indexer 3/8 | ready |
| `StakingFacet.RewardsClaimedDetailed` | yes | — | — | yes | indexer 3/8 | ready |
| `StakingFacet.Staked` | yes | — | — | yes | indexer 5/8 | ready |
| `StakingFacet.StakingInitialized` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.StakingPaused` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.TierConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.UnstakeRequested` | yes | — | — | yes | indexer 3/8 | ready |
| `StakingFacet.Unstaked` | yes | — | — | yes | indexer 4/8 | ready |

## TimelockFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.1/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EXECUTOR_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `PROPOSER_ROLE` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `cancel` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `execute` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `getMinDelay` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getTimestamp` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperationExecuted` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isOperationPending` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperationReady` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `schedule` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `updateMinDelay` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TimelockFacet.CallExecuted` | yes | — | — | yes | indexer 3/8 | ready |
| `TimelockFacet.MinDelayUpdated(uint256,uint256)` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.MinDelayUpdated(uint256,uint256)#2` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.OperationExecuted(bytes32,uint256,uint256)` | yes | — | — | yes | indexer 3/8 | ready |
| `TimelockFacet.OperationExecuted(bytes32)` | yes | — | — | yes | indexer 5/8 | ready |
| `TimelockFacet.OperationRemoved` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.OperationScheduled` | yes | — | — | yes | indexer 4/8 | ready |
| `TimelockFacet.OperationStored` | yes | — | — | yes | indexer 4/8 | ready |
| `TimelockFacet.TimelockOperationCanceled` | yes | — | — | yes | indexer 2/8 | ready |

## TimewaveGiftFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batchReleaseTwaveVesting` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `canTransferVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `createUsdcVestingSchedule` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `getMinTwaveVestingDuration` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getNextUnlockTime` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getQuarterlyUnlockRate` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getReleasableTwaveAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVestedTwaveAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVestingTwaveSchedule` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `isFullyVested` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `isVestingActive` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `releaseTwaveVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `releaseTwaveVestingFor` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `revokeTwaveVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setMinimumTwaveVestingDuration` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `setQuarterlyUnlockRate` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `transferTwaveVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TimewaveGiftFacet.TokensVested` | yes | — | — | yes | indexer 2/8 | ready |
| `TimewaveGiftFacet.VestingRevoked` | yes | — | — | yes | indexer 2/8 | ready |
| `TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)` | yes | — | — | yes | indexer 3/8 | ready |
| `TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)#2` | yes | — | — | yes | indexer 3/8 | ready |
| `TimewaveGiftFacet.VestingTransferred` | yes | — | — | yes | indexer 2/8 | ready |

## TokenSupplyFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.76/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `allowance` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `approve` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `balanceOf` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `burn` | write | yes | — | — | — | yes | yes | yes | adversarial 4/8 | needs fixture |
| `burnFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `decimals` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `initializeToken` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `supplyFinishMinting` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `supplyGetMaximum` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `supplyIsMintingFinished` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `supplyMintTokens` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `supplySetMaximum` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `tokenAllowance` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `tokenApprove` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `tokenBalanceOf` | read | yes | — | — | — | yes | yes | yes | adversarial 4/8 | ready |
| `tokenName` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `tokenSymbol` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `tokenTransferFrom` | write | yes | — | yes | — | — | yes | — | adversarial 3/8 | needs fixture |
| `totalSupply` | read | yes | — | — | yes | — | yes | — | adversarial 3/8 | ready |
| `transfer` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `transferFrom` | write | yes | — | yes | — | — | yes | — | adversarial 3/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenSupplyFacet.Approval` | yes | — | — | yes | indexer 3/8 | ready |
| `TokenSupplyFacet.MintingFinished` | yes | — | — | yes | indexer 3/8 | ready |
| `TokenSupplyFacet.TokenInitialized` | yes | — | — | yes | indexer 2/8 | ready |
| `TokenSupplyFacet.Transfer` | yes | — | — | yes | indexer 5/8 | ready |

## UpgradeControllerFacet

Facet classification: **unsafe on live network**. Proof depth spans `unit` to `indexer` with an average score of `2.75/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveUpgrade` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `executeUpgrade` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `freezeUpgradeControl` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `getOperationalInvariants` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getUpgrade` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeControlStatus` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeDelay` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeThreshold` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `initUpgradeController` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `isUpgradeApproved` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isUpgradeControlFrozen` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isUpgradeSigner` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `proposeDiamondCut` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `setUpgradeControlEnforced` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `UpgradeControllerFacet.UpgradeApproved` | yes | — | — | yes | indexer 3/8 | ready |
| `UpgradeControllerFacet.UpgradeControlEnforcementSet` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeControlFrozen` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeControllerInitialized` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeExecuted` | yes | — | — | yes | indexer 3/8 | ready |
| `UpgradeControllerFacet.UpgradeProposed` | yes | — | — | yes | indexer 3/8 | ready |

## VestingFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.58/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `calculateCexVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateDevFundVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateFounderVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculatePublicVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateTeamVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `createCexVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createDevFundVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createFounderVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createPublicVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createTeamVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getSellableAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getStandardVestedAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getStandardVestingReleasable` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getStandardVestingSchedule` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingDetails` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingReleasableAmount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingTotalAmount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingType` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `hasVestingSchedule` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `releaseStandardVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `releaseStandardVestingFor` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `releaseTokensFor` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `releaseVestedTokens` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revokeVestingSchedule` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setMinimumVestingDuration` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `transferVestingSchedule` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `veGetRoleAdmin` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `veGetVestingSchedule` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `veHasRole` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `veSupportsInterface` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VestingFacet.BeneficiaryTransferred` | yes | — | — | yes | indexer 2/8 | ready |
| `VestingFacet.SaleRestrictionUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.TokensReleased` | yes | — | — | yes | indexer 5/8 | ready |
| `VestingFacet.VestingInitialized` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingPaused` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingScheduleCreated` | yes | — | — | yes | indexer 5/8 | ready |
| `VestingFacet.VestingScheduleRevoked` | yes | — | — | yes | indexer 5/8 | ready |
| `VestingFacet.VestingUnpaused` | yes | — | — | yes | indexer 3/8 | ready |

## VoiceAssetFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.49/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveVoiceAsset` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `authorizeUser` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `customizeRoyaltyRate` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `getApproved` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getDefaultPlatformFee` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getDefaultRoyaltyRate` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getMaxRoyaltyRate` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRoyaltyHistory` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getTokenId` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getUserVoices` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVoiceAsset` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getVoiceAssetDetails` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getVoiceAssetsByOwner` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVoiceHash` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVoiceHashFromTokenId` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isApprovedForAll` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isAuthorized` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isRegistrationPaused` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `lockVoiceAsset` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `name` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `ownerOf` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `recordRoyaltyPayment` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `recordRoyaltyPaymentFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `recordUsage` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `recordUsageFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `registerVoiceAsset` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `registerVoiceAssetForCaller` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `revokeUser` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `safeTransferFrom(address,address,uint256)` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `safeTransferFrom(address,address,uint256,bytes)` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `setApprovalForAll` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setDefaultPlatformFee` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `setDefaultRoyaltyRate` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `setRegistrationPaused` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `supportsInterface` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `symbol` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `tokenURI` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `transferFromVoiceAsset` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `unlockVoiceAsset` | write | — | — | yes | — | — | — | — | live 1/8 | needs fixture |
| `voiceAssetBalanceOf` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `voiceAssetName` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `voiceAssetSymbol` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceAssetFacet.Approval` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.ApprovalForAll` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.DefaultPlatformFeeUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.DefaultRoyaltyRateUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.RegistrationPauseChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.RoyaltyPaid` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.RoyaltyRateChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.RoyaltyRateUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.Transfer` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceAssetFacet.UserAuthorizationChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.VoiceAssetLockChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.VoiceAssetRegistered` | yes | — | yes | yes | indexer 3/8 | ready |
| `VoiceAssetFacet.VoiceAssetUsed` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceDatasetFacet

Facet classification: **needs fixture**. Proof depth spans `live` to `indexer` with an average score of `4.16/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `appendAssets` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `burnDataset` | write | yes | — | yes | yes | yes | — | — | adversarial 4/8 | needs fixture |
| `containsAsset` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `createDataset` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `getDataset` | read | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `getDatasetsByCreator` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `getMaxAssetsPerDataset` | read | yes | — | — | — | — | — | yes | adversarial 2/8 | ready |
| `getTotalDatasets` | read | yes | — | — | — | — | — | yes | adversarial 2/8 | ready |
| `removeAsset` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `royaltyInfo` | read | yes | — | — | yes | yes | — | yes | adversarial 4/8 | ready |
| `setDatasetStatus` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `setLicense` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `setMaxAssetsPerDataset` | write | yes | — | yes | — | yes | — | — | adversarial 3/8 | needs fixture |
| `setMetadata` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `setRoyalty` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceDatasetFacet.AssetRemoved` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.AssetsAppended` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.DatasetBurned` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.DatasetCreated` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.DatasetRoyaltyPayeeSet` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.DatasetStatusChanged` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceDatasetFacet.LicenseChanged` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceDatasetFacet.MetadataChanged` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceDatasetFacet.RoyaltySet` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceDatasetFacet.Transfer` | yes | — | — | yes | indexer 4/8 | ready |

## VoiceLicenseFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.18/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createLicense` | write | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `createLicenseWithMarketplace` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLicense` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getLicenseHistory` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getLicenseTerms` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getLicensees` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getPendingRevenue` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getUsageCount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isUsageRefUsed` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `issueLicense` | write | yes | yes | — | — | — | yes | — | adversarial 3/8 | needs fixture |
| `recordLicensedUsage` | write | yes | yes | yes | yes | — | yes | — | adversarial 5/8 | needs fixture |
| `revokeLicense` | write | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `transferLicense` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `updateLicenseTerms` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `validateLicense` | read | yes | yes | — | yes | — | yes | — | adversarial 4/8 | ready |
| `withdrawLicenseRevenue` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceLicenseFacet.Debug` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceLicenseFacet.LicenseBatchGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceLicenseFacet.LicenseCreated(bytes32,bytes32,address,uint256,uint256)` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseFacet.LicenseEnded` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceLicenseFacet.LicenseRenewed` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceLicenseFacet.LicenseRevoked` | yes | — | — | yes | indexer 6/8 | ready |
| `VoiceLicenseFacet.LicenseTermsUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceLicenseFacet.LicenseTransferred` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseFacet.LicenseUsed` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseFacet.TemplateUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceLicenseFacet.VoiceAssetUsed` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceLicenseTemplateFacet

Facet classification: **needs fixture**. Proof depth spans `adversarial` to `indexer` with an average score of `5.22/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createLicenseFromTemplate` | write | yes | — | yes | yes | yes | yes | — | adversarial 5/8 | needs fixture |
| `createTemplate` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `getCreatorTemplates` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getTemplate` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `isTemplateActive` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setTemplateStatus` | write | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `updateTemplate` | write | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceLicenseTemplateFacet.LicenseCreated` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseTemplateFacet.TemplateUpdated` | yes | — | — | yes | indexer 5/8 | ready |

## VoiceMetadataFacet

Facet classification: **needs fixture**. Proof depth spans `unit` to `indexer` with an average score of `2.38/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getBasicAcousticFeatures` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getGeographicData` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVoiceCategories` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVoiceClassifications` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `searchVoicesByClassification` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `searchVoicesByClassificationPaginated` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `setAnalysisVersion` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `updateBasicAcousticFeatures` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `updateClassificationCategory` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `updateGeographicData` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `updateVoiceClassifications` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceMetadataFacet.AnalysisVersionUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.BasicAcousticFeaturesUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.ClassificationCategoryUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.GeographicDataUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.VoiceClassificationsUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## VotingPowerFacet

Facet classification: **needs fixture**. Proof depth spans `unit` to `indexer` with an average score of `2.38/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MAX_BATCH_SIZE` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateBaseRoleMultiplier` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getDelegatedVotingPower` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getLatestCheckpoint` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getLockDuration` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getLockTimestamp` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getPastVotes` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVotes` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVotingPower` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVotingPowerWithDelegations` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `setMaxLockDuration` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `setRoleMultiplier` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `setZeroLockDuration` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `setupInitialVotingPower` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `updateLockDuration` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `updateVotingPower` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |
| `updateVotingPowerBatch` | write | yes | — | yes | — | — | — | — | live 2/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VotingPowerFacet.LockDurationUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VotingPowerFacet.MaxLockDurationUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VotingPowerFacet.RoleMultiplierUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VotingPowerFacet.VotingPowerUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## WhisperBlockFacet

Facet classification: **needs fixture**. Proof depth spans `unit` to `indexer` with an average score of `3.52/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ENCRYPTOR_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `OWNER_ROLE` | read | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `VOICE_OPERATOR_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `generateAndSetEncryptionKey` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `getAuditTrail` | read | yes | — | — | yes | yes | — | — | adversarial 3/8 | ready |
| `getSelectors` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `grantAccess` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `registerVoiceFingerprint` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `revokeAccess` | write | yes | — | yes | yes | — | — | — | live 3/8 | needs fixture |
| `setAuditEnabled` | write | yes | — | yes | yes | yes | — | — | adversarial 4/8 | needs fixture |
| `setOffchainEntropy` | write | yes | — | yes | yes | — | — | — | live 3/8 | needs fixture |
| `setTrustedOracle` | write | yes | — | yes | yes | — | — | — | live 3/8 | needs fixture |
| `updateSystemParameters` | write | yes | — | yes | yes | — | — | — | live 3/8 | needs fixture |
| `verifyVoiceAuthenticity` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `WhisperBlockFacet.AccessGranted` | yes | — | — | yes | indexer 6/8 | ready |
| `WhisperBlockFacet.AccessRevoked` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.AuditEvent` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.KeyRotated` | yes | — | — | yes | indexer 5/8 | ready |
| `WhisperBlockFacet.OffchainKeyGenerated` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.SecurityParametersUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.VoiceFingerprintUpdated` | yes | — | — | yes | indexer 5/8 | ready |
