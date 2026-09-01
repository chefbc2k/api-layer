# API Test Gap Report

Generated: `2026-09-01T15:01:55.881Z`

This report is an evidence inventory, not a claim that generated parity alone proves protocol safety. Test attribution is static and conservative; inspect the linked evidence arrays in the JSON artifact before promoting an item.

## Summary

- Facets: `33`
- Functions: `492`
- Events: `218`
- Items: `710`

| Classification | Count |
| --- | ---: |
| ready | 235 |
| needs fixture | 223 |
| unsafe on live network | 51 |
| needs contract change | 0 |
| needs API guard | 0 |
| needs indexer proof | 201 |

| Proof dimension | Items |
| --- | ---: |
| abiManifest | 710 |
| rpcRegistry | 710 |
| httpRegistry | 709 |
| reviewedApiSurface | 709 |
| unit | 398 |
| workflow | 268 |
| localFork | 4 |
| baseSepolia | 60 |
| negativePath | 251 |
| economic | 147 |
| redTeam | 21 |
| indexer | 17 |

## Methodology

- A protocol test is attributed when its source directly mentions the ABI key, identifier-bounded name or wrapper key, signature, identifier-bounded operation id, or HTTP path; negative/economic/red-team depth additionally requires a nearby proof keyword. The gap reporter's own tests are excluded to avoid self-attribution.
- A successful verify domain is attributed only by an exact generated HTTP method/path match. Fork markers classify local-fork proof; other tracked verify artifacts classify Base Sepolia proof.
- Mechanical gaps dominate; intentionally excluded/admin operations without live proof are unsafe on live network; writes require unit, workflow, and negative-path evidence; events require event-specific indexer tests.

## AccessControlFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.9/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `configureRole` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | unsafe on live network |
| `debugRoleIndexState` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `emergencyForceAdd` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `executeFounderSunset` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `getOwnerOperationalRoles` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getQuorum` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRequiredSigners` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRoleAdmin` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRoleConfig` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRoleMember` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRoleMembers` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getUserRoles` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `grantRole` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `hasAllParticipantRoles` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `hasRole` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `isFounderSunsetActive` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isRoleActive` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `renounceRole` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | needs fixture |
| `revokeRole` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `scheduleFounderSunset` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `setDefaultValidityPeriod` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | unsafe on live network |
| `setMinValidations` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | unsafe on live network |
| `setPaused` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `setRecoveryActive` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `setRoleAdmin` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `AccessControlFacet.AccessAttempt` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.DAOMemberRoleGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.FounderSunsetExecuted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.FounderSunsetScheduled` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.GovernanceParticipantRoleGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.MarketplacePurchaserRoleGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.MarketplaceSellerRoleGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.ParticipantRoleRevoked` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.ResearchParticipantRoleGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.RoleAdminChanged` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `AccessControlFacet.RoleConfigUpdated` | yes | — | — | — | adversarial 2/8 | needs indexer proof |
| `AccessControlFacet.RoleGranted` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `AccessControlFacet.RoleRenounced` | yes | — | — | — | adversarial 2/8 | needs indexer proof |
| `AccessControlFacet.RoleRevoked` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `AccessControlFacet.SecurityAction` | — | — | — | — | inventory 0/8 | needs indexer proof |

## BurnThresholdFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `1.22/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `thresholdBurnExcess` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `thresholdBurnTokens` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `thresholdBurnTokensFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `thresholdCalculateExcess` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `thresholdGetBurnLimit` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `thresholdSetBurnLimit` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `BurnThresholdFacet.BurnThresholdUpdated` | yes | — | — | — | adversarial 2/8 | needs indexer proof |
| `BurnThresholdFacet.ThresholdBurn` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `BurnThresholdFacet.Transfer` | yes | — | — | yes | indexer 3/8 | ready |

## CommunityRewardsFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `2.82/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `campaignCount` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `claim` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `claimableAmount` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `claimed` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `createCampaign` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getCampaign` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `pauseCampaign` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setMerkleRoot` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `unpauseCampaign` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `vestedAmount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `CommunityRewardsFacet.CampaignCapConfig` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `CommunityRewardsFacet.CampaignCreated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `CommunityRewardsFacet.CampaignMerkleRootUpdated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `CommunityRewardsFacet.CampaignPaused` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `CommunityRewardsFacet.CampaignUnpaused` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `CommunityRewardsFacet.CampaignVestingConfig` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `CommunityRewardsFacet.Claimed` | yes | — | — | — | adversarial 4/8 | needs indexer proof |

## DelegationFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `1.67/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DELEGATION_TYPEHASH` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `DOMAIN_TYPEHASH` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `delegate` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `delegateBySig` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `delegates` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getCurrentVotes` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getPriorVotes` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTotalVotingPower` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateDelegatedVotingPower` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateDelegatedVotingPowerBatch` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DelegationFacet.DelegateChanged(address,address,address)` | yes | — | — | — | adversarial 4/8 | needs indexer proof |
| `DelegationFacet.DelegateChanged(address,address,address)#2` | yes | — | — | — | adversarial 4/8 | needs indexer proof |
| `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)#2` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `DelegationFacet.VotingPowerUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## DiamondCutFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.86/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FOUNDER_ROLE` | read | yes | — | — | yes | yes | — | — | adversarial 3/8 | ready |
| `diamondCut` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | unsafe on live network |
| `getTrustedInitCodehash` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isImmutableSelectorReserved` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isTrustedInitSelector` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isTrustedInitSelectorPolicyEnabled` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `setTrustedInitCodehash` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `setTrustedInitContract` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `setTrustedInitSelector` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DiamondCutFacet.DiamondCut` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `DiamondCutFacet.DiamondCutEvent` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `DiamondCutFacet.TrustedInitCodehashSet` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `DiamondCutFacet.TrustedInitContractSet` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `DiamondCutFacet.TrustedInitSelectorSet` | — | — | — | — | inventory 0/8 | needs indexer proof |

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

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `inventory` with an average score of `0/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batchUpdateScores` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getEchoScoreOracleV3` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getOracleFutureDriftConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getOracleQuorumSigners` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getOracleStalenessConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getReputation` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getReputationHistory` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isEchoScorePausedV3` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isOracleHealthy` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `pauseEchoScoreV3` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setEchoScoreOracleV3` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setOracleFutureDriftConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setOracleQuorumSigners` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setOracleStalenessConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `unpauseEchoScoreV3` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateScore` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EchoScoreFacetV3.OracleFutureDriftConfigUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.OracleQuorumConfigUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.OracleStalenessConfigUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.OracleUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.Paused` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.ReputationUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.ScoresUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EchoScoreFacetV3.Unpaused` | — | — | — | — | inventory 0/8 | needs indexer proof |

## EmergencyFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `2.7/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveRecovery` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `completeRecovery` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `emergencyResume` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `emergencyStop` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | unsafe on live network |
| `executeRecoveryAction` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `executeRecoveryStep` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeResponse` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeScheduledResume` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `extendPausedUntil` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `freezeAssets` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `getEmergencyState` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getEmergencyTimeout` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getIncident` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getRecoveryPlan` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isAssetFrozen` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `isEmergencyStopped` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `reportIncident` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `scheduleEmergencyResume` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setEmergencyTimeout` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `setResumeDelay` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `startRecovery` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `triggerEmergency` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `unfreezeAssets` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EmergencyFacet.AssetsFrozen` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyFacet.EmergencyResumeExecuted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `EmergencyFacet.EmergencyResumeScheduled` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyFacet.EmergencyStateChanged` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyFacet.IncidentReported` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyFacet.PauseExtended` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyFacet.RecoveryCompleted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `EmergencyFacet.RecoveryStarted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `EmergencyFacet.RecoveryStepExecuted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `EmergencyFacet.ResponseExecuted` | yes | — | — | — | adversarial 3/8 | needs indexer proof |

## EmergencyWithdrawalFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `2/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveEmergencyWithdrawal` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `executeWithdrawal` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `getApprovalCount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isRecipientWhitelisted` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `requestEmergencyWithdrawal` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setRecipientWhitelist` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `updateWithdrawalConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalApproved` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalExecuted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalRequested` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.EmergencyWithdrawal` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalApproved` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalExecuted` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalRequested` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.RecipientWhitelisted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `EmergencyWithdrawalFacet.WithdrawalConfigUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |

## EscrowFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `2.2/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `escrowAsset` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getAssetState` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getOriginalOwner` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isInEscrow` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `onERC721Received` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `releaseAsset` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |
| `updateAssetState` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EscrowFacet.AssetEscrowed` | yes | — | — | yes | indexer 2/8 | ready |
| `EscrowFacet.AssetReleased` | yes | yes | — | — | adversarial 5/8 | needs indexer proof |
| `EscrowFacet.AssetStateUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |

## GovernorFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.7/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getRoleMultiplier` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getVotingConfig` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `setDefaultGasLimit` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setTrustedTarget` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateProposalThreshold` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateQuorumNumerator` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateVotingDelay` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | needs fixture |
| `updateVotingPeriod` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `GovernorFacet.TargetGasLimitUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `GovernorFacet.TrustedTargetUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |

## LegacyExecutionFacet

Facet classification: **needs indexer proof**. Proof depth spans `workflow` to `adversarial` with an average score of `2.57/8`.

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
| `LegacyExecutionFacet.InheritanceActivated` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `LegacyExecutionFacet.InheritanceApproved` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `LegacyExecutionFacet.RightsDelegated` | yes | — | — | — | workflow 2/8 | needs indexer proof |

## LegacyFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `1.92/8`.

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
| `LegacyFacet.BeneficiaryUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `LegacyFacet.InheritanceConditionsUpdated` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `LegacyFacet.LegacyPlanCreated` | yes | — | — | — | workflow 2/8 | needs indexer proof |

## LegacyViewFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `adversarial` with an average score of `2.5/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getLegacyPlan` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `isInheritanceReady` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `validateBeneficiaries` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `validateBeneficiary` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| _none_ | — | — | — | — | — | — |

## MarketplaceFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `3.67/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cancelListing` | write | yes | yes | — | — | — | yes | — | adversarial 3/8 | needs fixture |
| `getListing` | read | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `isPaused` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `listAsset` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `pause` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `purchaseAsset` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `unpause` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |
| `updateListingPrice` | write | yes | yes | — | — | — | yes | — | adversarial 3/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `MarketplaceFacet.AssetEscrowed` | yes | — | — | yes | indexer 5/8 | ready |
| `MarketplaceFacet.AssetListed` | yes | — | yes | yes | indexer 7/8 | ready |
| `MarketplaceFacet.AssetPurchased` | yes | yes | — | — | adversarial 5/8 | needs indexer proof |
| `MarketplaceFacet.ListingCancelled` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `MarketplaceFacet.ListingPriceUpdated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `MarketplaceFacet.MarketplacePaused` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `MarketplaceFacet.MarketplaceUnpaused` | — | — | — | — | inventory 0/8 | needs indexer proof |

## MultiSigFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `1.71/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addOperationType` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `addOperator` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `approveOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `canExecuteOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `cancelOperation` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `execute` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | unsafe on live network |
| `executeOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `getOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getOperationConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOperationStatus` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `hasApprovedOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperator` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `muSetPaused` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `proposeOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `removeOperator` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setOperationConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `submitTransaction` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `MultiSigFacet.ActionExecuted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `MultiSigFacet.BatchCompleted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `MultiSigFacet.MultiSigOperationCancelled` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `MultiSigFacet.OperationApproved` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `MultiSigFacet.OperationExecuted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `MultiSigFacet.OperationProposed` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `MultiSigFacet.OperationStatusChanged` | yes | — | — | — | workflow 2/8 | needs indexer proof |

## OwnershipFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `1.53/8`.

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
| `OwnershipFacet.OwnershipPolicyEnforcementSet` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `OwnershipFacet.OwnershipTargetApprovalSet` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `OwnershipFacet.OwnershipTransferCancelled` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `OwnershipFacet.OwnershipTransferProposed` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `OwnershipFacet.OwnershipTransferred` | yes | — | — | — | workflow 2/8 | needs indexer proof |

## PaymentFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `1.05/8`.

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
| `getFeeConfiguration` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getMevProtectionConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getPendingPayments` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getPendingTimewaveGift` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRevenueMetrics` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getTreasuryAddress` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getTreasuryWithdrawalLimit` | read | yes | yes | — | — | — | yes | — | adversarial 3/8 | ready |
| `getUnionTreasuryAddress` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getUsdcToken` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `pauseBuybacks` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `paymentPaused` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `revealDistribution` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revealDistributionStruct` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revealWithdraw` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setBuybackConfig` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `setBuybackConfigStruct` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `setMevProtectionConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setPaymentPaused` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setStakingConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setTreasuryWithdrawalLimit` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setUsdcToken` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateDevFundAddress` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateFeeConfiguration` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateTreasuryAddress` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateUnionTreasuryAddress` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `withdrawPayments` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `withdrawPaymentsWithDeadline` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `PaymentFacet.BuybackAccumulatorUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.BuybackConfigUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.BuybackExecuted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.BuybackPaused` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.ClaimCommitted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.ClaimRevealed` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.DatasetRoyaltyAccrued` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.DevFundAddressUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.FeeConfigurationUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.FlashbotsSuggested` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.MetadataAccessed` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.PauseStateChanged` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.PaymentDistributed` | yes | yes | — | — | adversarial 5/8 | needs indexer proof |
| `PaymentFacet.TimewaveGiftCreated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.TreasuryAddressUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.USDCPaymentWithdrawn` | yes | — | — | — | adversarial 4/8 | needs indexer proof |
| `PaymentFacet.UnionTreasuryAddressUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.UsdcTokenUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `PaymentFacet.WithdrawalLimitUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |

## ProposalFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `2.35/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GOVERNANCE_PROPOSER_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `TIMELOCK_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `cancelProposal` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getActiveProposals` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getProposalTypeConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getProposerProposals` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getReceipt` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prCastVote` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prExecute` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prQueue` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prState` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `proposalDeadline` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `proposalExists` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `proposalSnapshot` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `proposalVotes` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `propose(string,string,address[],uint256[],bytes[],uint8)` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `propose(address[],uint256[],bytes[],string,uint8)` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `queue` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setProposalTypeConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `state` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `ProposalFacet.ProposalCanceled` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `ProposalFacet.ProposalCreated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `ProposalFacet.ProposalExecuted` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `ProposalFacet.ProposalQueued` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `ProposalFacet.ProposalTypeConfigSet` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `ProposalFacet.VoteCast` | yes | — | — | yes | indexer 4/8 | ready |

## RightsFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.48/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addCollaborator` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |
| `createRightsGroup` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getCategoryContracts` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getCollaborator` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `getRightCategory` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRightContract` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRightsGroup` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUserRights` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `grantRight` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `registerRightContract` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `removeCollaborator` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revokeRight` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `rightIdExists` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `updateCollaboratorShare` | write | yes | yes | — | — | — | — | — | workflow 2/8 | needs fixture |
| `updateRightContract` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `RightsFacet.CollaboratorUpdated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `RightsFacet.RightContractRegistered` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `RightsFacet.RightContractUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `RightsFacet.RightGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `RightsFacet.RightRevoked` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `RightsFacet.RightsGroupCreated` | — | — | — | — | inventory 0/8 | needs indexer proof |

## StakingFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.39/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `advanceEpoch` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `claimRewards` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `executeUnstake` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `fundRewardPool` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getDegradedModeConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getEffectiveApy` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getPendingRewards` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRewardBreakdown` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getStakeAgeMultiplier` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getStakeInfo` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getStakingStats` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTier` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTierConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUnstakeRequest` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `initStaking` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `initStakingWithToken` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isDegradedModeActive` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `queueTierConfigUpdate` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `requestUnstake` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setDegradedModeConfig` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setEchoScoreBoost` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setStakingPaused` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `stake` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `StakingFacet.EpochAdvanced` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.RewardPoolFunded` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.RewardsClaimed` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.RewardsClaimedDetailed` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.Staked` | yes | — | — | — | adversarial 4/8 | needs indexer proof |
| `StakingFacet.StakingInitialized` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.StakingPaused` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.TierConfigUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.UnstakeRequested` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `StakingFacet.Unstaked` | — | — | — | — | inventory 0/8 | needs indexer proof |

## TimelockFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `2.05/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EXECUTOR_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `PROPOSER_ROLE` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `cancel` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `execute` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `getMinDelay` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getOperation` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getTimestamp` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperationExecuted` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperationPending` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOperationReady` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `schedule` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `updateMinDelay` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TimelockFacet.CallExecuted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimelockFacet.MinDelayUpdated(uint256,uint256)` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimelockFacet.MinDelayUpdated(uint256,uint256)#2` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimelockFacet.OperationExecuted(bytes32,uint256,uint256)` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimelockFacet.OperationExecuted(bytes32)` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `TimelockFacet.OperationRemoved` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimelockFacet.OperationScheduled` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `TimelockFacet.OperationStored` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `TimelockFacet.TimelockOperationCanceled` | — | — | — | — | inventory 0/8 | needs indexer proof |

## TimewaveGiftFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.73/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batchReleaseTwaveVesting` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `canTransferVesting` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `createUsdcVestingSchedule` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getMinTwaveVestingDuration` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getNextUnlockTime` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getQuarterlyUnlockRate` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `getReleasableTwaveAmount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVestedTwaveAmount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVestingTwaveSchedule` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isFullyVested` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isVestingActive` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `releaseTwaveVesting` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `releaseTwaveVestingFor` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revokeTwaveVesting` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setMinimumTwaveVestingDuration` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `setQuarterlyUnlockRate` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `transferTwaveVesting` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TimewaveGiftFacet.TokensVested` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimewaveGiftFacet.VestingRevoked` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)#2` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TimewaveGiftFacet.VestingTransferred` | — | — | — | — | inventory 0/8 | needs indexer proof |

## TokenSupplyFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `2.24/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `allowance` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `approve` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
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
| `tokenApprove` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `tokenBalanceOf` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `tokenName` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `tokenSymbol` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `tokenTransferFrom` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `totalSupply` | read | yes | — | — | yes | — | yes | — | adversarial 3/8 | ready |
| `transfer` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `transferFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenSupplyFacet.Approval` | yes | — | — | yes | indexer 3/8 | ready |
| `TokenSupplyFacet.MintingFinished` | yes | — | — | — | adversarial 2/8 | needs indexer proof |
| `TokenSupplyFacet.TokenInitialized` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `TokenSupplyFacet.Transfer` | yes | — | — | yes | indexer 4/8 | ready |

## UpgradeControllerFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `1.5/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveUpgrade` | write | yes | yes | — | — | — | — | — | workflow 2/8 | unsafe on live network |
| `executeUpgrade` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `freezeUpgradeControl` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |
| `getOperationalInvariants` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getUpgrade` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeControlStatus` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeDelay` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeThreshold` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `initUpgradeController` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isUpgradeApproved` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isUpgradeControlFrozen` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isUpgradeSigner` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `proposeDiamondCut` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | unsafe on live network |
| `setUpgradeControlEnforced` | write | — | — | — | — | — | — | — | inventory 0/8 | unsafe on live network |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `UpgradeControllerFacet.UpgradeApproved` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `UpgradeControllerFacet.UpgradeControlEnforcementSet` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `UpgradeControllerFacet.UpgradeControlFrozen` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `UpgradeControllerFacet.UpgradeControllerInitialized` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `UpgradeControllerFacet.UpgradeExecuted` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `UpgradeControllerFacet.UpgradeProposed` | yes | — | — | — | workflow 2/8 | needs indexer proof |

## VestingFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `1.37/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `calculateCexVesting` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `calculateDevFundVesting` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `calculateFounderVesting` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `calculatePublicVesting` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `calculateTeamVesting` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `createCexVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createDevFundVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createFounderVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createPublicVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `createTeamVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getSellableAmount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getStandardVestedAmount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getStandardVestingReleasable` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getStandardVestingSchedule` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingDetails` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingReleasableAmount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingTotalAmount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getVestingType` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `hasVestingSchedule` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `releaseStandardVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `releaseStandardVestingFor` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `releaseTokensFor` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `releaseVestedTokens` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `revokeVestingSchedule` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setMinimumVestingDuration` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `transferVestingSchedule` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `veGetRoleAdmin` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `veGetVestingSchedule` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `veHasRole` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `veSupportsInterface` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VestingFacet.BeneficiaryTransferred` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VestingFacet.SaleRestrictionUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VestingFacet.TokensReleased` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VestingFacet.VestingInitialized` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VestingFacet.VestingPaused` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VestingFacet.VestingScheduleCreated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VestingFacet.VestingScheduleRevoked` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VestingFacet.VestingUnpaused` | — | — | — | — | inventory 0/8 | needs indexer proof |

## VoiceAssetFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `1.87/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveVoiceAsset` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `authorizeUser` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `customizeRoyaltyRate` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `getApproved` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getDefaultPlatformFee` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getDefaultRoyaltyRate` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getMaxRoyaltyRate` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRoyaltyHistory` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTokenId` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getUserVoices` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVoiceAsset` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getVoiceAssetDetails` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getVoiceAssetsByOwner` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVoiceHash` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVoiceHashFromTokenId` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isApprovedForAll` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isAuthorized` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isRegistrationPaused` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `lockVoiceAsset` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `name` | read | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `ownerOf` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `recordRoyaltyPayment` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `recordRoyaltyPaymentFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `recordUsage` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `recordUsageFrom` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `registerVoiceAsset` | write | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `registerVoiceAssetForCaller` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `revokeUser` | write | yes | — | — | — | — | yes | — | adversarial 2/8 | needs fixture |
| `safeTransferFrom(address,address,uint256)` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `safeTransferFrom(address,address,uint256,bytes)` | write | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `setApprovalForAll` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `setDefaultPlatformFee` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `setDefaultRoyaltyRate` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `setRegistrationPaused` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `supportsInterface` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `symbol` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `tokenURI` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `transferFromVoiceAsset` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `unlockVoiceAsset` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `voiceAssetBalanceOf` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `voiceAssetName` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `voiceAssetSymbol` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceAssetFacet.Approval` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.ApprovalForAll` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.DefaultPlatformFeeUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.DefaultRoyaltyRateUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.RegistrationPauseChanged` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.RoyaltyPaid` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.RoyaltyRateChanged` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.RoyaltyRateUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.Transfer` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceAssetFacet.UserAuthorizationChanged` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `VoiceAssetFacet.VoiceAssetLockChanged` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceAssetFacet.VoiceAssetRegistered` | yes | — | yes | — | adversarial 3/8 | needs indexer proof |
| `VoiceAssetFacet.VoiceAssetUsed` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceDatasetFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `3.08/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `appendAssets` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |
| `burnDataset` | write | yes | — | — | yes | — | — | — | live 2/8 | needs fixture |
| `containsAsset` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `createDataset` | write | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getDataset` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getDatasetsByCreator` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getMaxAssetsPerDataset` | read | yes | — | — | — | — | — | yes | adversarial 2/8 | ready |
| `getTotalDatasets` | read | yes | — | — | — | — | yes | yes | adversarial 3/8 | ready |
| `removeAsset` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |
| `royaltyInfo` | read | yes | — | — | yes | — | yes | — | adversarial 3/8 | ready |
| `setDatasetStatus` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |
| `setLicense` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |
| `setMaxAssetsPerDataset` | write | yes | — | — | — | yes | — | — | adversarial 2/8 | needs fixture |
| `setMetadata` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |
| `setRoyalty` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceDatasetFacet.AssetRemoved` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `VoiceDatasetFacet.AssetsAppended` | yes | — | — | — | workflow 2/8 | needs indexer proof |
| `VoiceDatasetFacet.DatasetBurned` | yes | — | — | — | adversarial 2/8 | needs indexer proof |
| `VoiceDatasetFacet.DatasetCreated` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `VoiceDatasetFacet.DatasetRoyaltyPayeeSet` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceDatasetFacet.DatasetStatusChanged` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VoiceDatasetFacet.LicenseChanged` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VoiceDatasetFacet.MetadataChanged` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VoiceDatasetFacet.RoyaltySet` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VoiceDatasetFacet.Transfer` | yes | — | — | yes | indexer 3/8 | ready |

## VoiceLicenseFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `2.46/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createLicense` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `createLicenseWithMarketplace` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLicense` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getLicenseHistory` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getLicenseTerms` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getLicensees` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getPendingRevenue` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getUsageCount` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isUsageRefUsed` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `issueLicense` | write | yes | yes | — | — | — | yes | — | adversarial 3/8 | needs fixture |
| `recordLicensedUsage` | write | yes | yes | — | yes | — | yes | — | adversarial 4/8 | needs fixture |
| `revokeLicense` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `transferLicense` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `updateLicenseTerms` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `validateLicense` | read | yes | yes | — | yes | — | yes | — | adversarial 4/8 | ready |
| `withdrawLicenseRevenue` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceLicenseFacet.Debug` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseBatchGranted` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseCreated(bytes32,bytes32,address,uint256,uint256)` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseFacet.LicenseEnded` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseRenewed` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseRevoked` | yes | — | — | — | adversarial 4/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseTermsUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseTransferred` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VoiceLicenseFacet.LicenseUsed` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `VoiceLicenseFacet.TemplateUpdated` | yes | — | — | — | adversarial 2/8 | needs indexer proof |
| `VoiceLicenseFacet.VoiceAssetUsed` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceLicenseTemplateFacet

Facet classification: **needs indexer proof**. Proof depth spans `adversarial` to `indexer` with an average score of `4.89/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createLicenseFromTemplate` | write | yes | — | — | yes | yes | yes | — | adversarial 4/8 | needs fixture |
| `createTemplate` | write | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getCreatorTemplates` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `getTemplate` | read | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `isTemplateActive` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `setTemplateStatus` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `updateTemplate` | write | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceLicenseTemplateFacet.LicenseCreated` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseTemplateFacet.TemplateUpdated` | yes | — | — | — | adversarial 4/8 | needs indexer proof |

## VoiceMetadataFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `adversarial` with an average score of `0.88/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getBasicAcousticFeatures` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getGeographicData` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVoiceCategories` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVoiceClassifications` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `searchVoicesByClassification` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `searchVoicesByClassificationPaginated` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setAnalysisVersion` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `updateBasicAcousticFeatures` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `updateClassificationCategory` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `updateGeographicData` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |
| `updateVoiceClassifications` | write | yes | — | — | — | — | — | — | unit 1/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceMetadataFacet.AnalysisVersionUpdated` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `VoiceMetadataFacet.BasicAcousticFeaturesUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceMetadataFacet.ClassificationCategoryUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceMetadataFacet.GeographicDataUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VoiceMetadataFacet.VoiceClassificationsUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |

## VotingPowerFacet

Facet classification: **needs indexer proof**. Proof depth spans `inventory` to `indexer` with an average score of `0.19/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MAX_BATCH_SIZE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `calculateBaseRoleMultiplier` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getDelegatedVotingPower` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLatestCheckpoint` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLockDuration` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLockTimestamp` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getPastVotes` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVotes` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVotingPower` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVotingPowerWithDelegations` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setMaxLockDuration` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setRoleMultiplier` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setZeroLockDuration` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setupInitialVotingPower` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateLockDuration` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateVotingPower` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `updateVotingPowerBatch` | write | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VotingPowerFacet.LockDurationUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VotingPowerFacet.MaxLockDurationUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VotingPowerFacet.RoleMultiplierUpdated` | — | — | — | — | inventory 0/8 | needs indexer proof |
| `VotingPowerFacet.VotingPowerUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## WhisperBlockFacet

Facet classification: **needs indexer proof**. Proof depth spans `unit` to `adversarial` with an average score of `2.38/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ENCRYPTOR_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `OWNER_ROLE` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `VOICE_OPERATOR_ROLE` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `generateAndSetEncryptionKey` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `getAuditTrail` | read | yes | — | — | yes | yes | — | — | adversarial 3/8 | ready |
| `getSelectors` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `grantAccess` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `registerVoiceFingerprint` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `revokeAccess` | write | yes | — | — | yes | — | — | — | live 2/8 | needs fixture |
| `setAuditEnabled` | write | yes | — | — | yes | yes | — | — | adversarial 3/8 | needs fixture |
| `setOffchainEntropy` | write | yes | — | — | yes | — | — | — | live 2/8 | needs fixture |
| `setTrustedOracle` | write | yes | — | — | yes | — | — | — | live 2/8 | needs fixture |
| `updateSystemParameters` | write | yes | — | — | yes | — | — | — | live 2/8 | needs fixture |
| `verifyVoiceAuthenticity` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `WhisperBlockFacet.AccessGranted` | yes | — | — | — | adversarial 4/8 | needs indexer proof |
| `WhisperBlockFacet.AccessRevoked` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `WhisperBlockFacet.AuditEvent` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `WhisperBlockFacet.KeyRotated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
| `WhisperBlockFacet.OffchainKeyGenerated` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `WhisperBlockFacet.SecurityParametersUpdated` | yes | — | — | — | unit 1/8 | needs indexer proof |
| `WhisperBlockFacet.VoiceFingerprintUpdated` | yes | — | — | — | adversarial 3/8 | needs indexer proof |
