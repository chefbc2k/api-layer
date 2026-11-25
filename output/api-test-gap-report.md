# API Test Gap Report

Generated: `2026-11-25T22:54:24.814Z`

This report is an evidence inventory, not a claim that generated parity alone proves protocol safety. Test attribution is static and conservative; inspect the linked evidence arrays in the JSON artifact before promoting an item.

## Summary

- Facets: `33`
- Functions: `491`
- Events: `218`
- Items: `709`

| Classification | Count |
| --- | ---: |
| ready | 609 |
| needs fixture | 100 |
| unsafe on live network | 0 |
| needs contract change | 0 |
| needs API guard | 0 |
| needs indexer proof | 0 |

| Proof dimension | Items |
| --- | ---: |
| abiManifest | 709 |
| rpcRegistry | 709 |
| httpRegistry | 708 |
| reviewedApiSurface | 708 |
| unit | 609 |
| workflow | 334 |
| localFork | 203 |
| baseSepolia | 84 |
| negativePath | 321 |
| economic | 137 |
| redTeam | 250 |
| indexer | 218 |

## Methodology

- A protocol test is attributed by a bounded facet-qualified ABI key, an exact generated HTTP path (optionally followed by a query or fragment), or a unique signature/name/wrapper/operation id used as an invoked function, invoked member, mock-invocation assertion target, invoked computed member, or non-assertion call argument. Ambiguous cross-facet names and overloaded signatures require qualified evidence. Passive result and DTO member reads, assertion values, incidental variable names, object fields, prose, and metadata literals do not count. Tests that declare known ABI keys in key, methodKey, or eventKey properties are scoped to those keys. Negative/economic/red-team depth additionally requires a nearby proof keyword. Inventory-only reporter, registry, API-surface, verification-report, and fixture-planner tests are excluded to avoid self-attribution.
- A proven verify domain is attributed only by an exact generated HTTP method/path match. Evidence may be successful route execution or an explicit fail-closed-before-provider live-network guard outcome. Guard outcomes count only for admin endpoints with route-scoped 403 evidence naming the exact ABI key and Base Sepolia guard context. Fork markers and nested loopback RPC URLs classify local-fork proof; other tracked verify artifacts classify Base Sepolia proof.
- Mechanical gaps dominate: RPC and HTTP entries must match the manifest ABI signature; HTTP routes require method, path, operation id, uniqueness, and classifications for functions; reviewed API entries must match the generated HTTP method, path, operation id, and classification. Intentional HTTP exclusions are ready only when generated and reviewed surfaces both omit them and a registered executable guard proves deny-by-absence behavior. Admin operations without live proof are unsafe on live networks; writes require unit, workflow, and negative-path evidence; events require event-specific indexer tests.

## AccessControlFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.65/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `configureRole` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `debugRoleIndexState` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `emergencyForceAdd` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `executeFounderSunset` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `getOwnerOperationalRoles` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getQuorum` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getRequiredSigners` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRoleAdmin` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getRoleConfig` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getRoleMember` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRoleMembers` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUserRoles` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `grantRole` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `hasAllParticipantRoles` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `hasRole` | read | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `isFounderSunsetActive` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isRoleActive` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `renounceRole` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `revokeRole` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `scheduleFounderSunset` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `setDefaultValidityPeriod` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setMinValidations` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `setPaused` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setRecoveryActive` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setRoleAdmin` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |

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
| `AccessControlFacet.RoleConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleRenounced` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.RoleRevoked` | yes | — | — | yes | indexer 2/8 | ready |
| `AccessControlFacet.SecurityAction` | yes | — | — | yes | indexer 2/8 | ready |

## BurnThresholdFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.33/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `thresholdBurnExcess` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `thresholdBurnTokens` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `thresholdBurnTokensFrom` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `thresholdCalculateExcess` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `thresholdGetBurnLimit` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `thresholdSetBurnLimit` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `BurnThresholdFacet.BurnThresholdUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `BurnThresholdFacet.ThresholdBurn` | yes | — | — | yes | indexer 2/8 | ready |
| `BurnThresholdFacet.Transfer` | yes | — | — | yes | indexer 2/8 | ready |

## CommunityRewardsFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.35/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `campaignCount` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `claim` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `claimableAmount` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `claimed` | read | yes | — | — | — | yes | yes | yes | adversarial 4/8 | ready |
| `createCampaign` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `getCampaign` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `pauseCampaign` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setMerkleRoot` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `unpauseCampaign` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `vestedAmount` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `CommunityRewardsFacet.CampaignCapConfig` | yes | — | — | yes | indexer 2/8 | ready |
| `CommunityRewardsFacet.CampaignCreated` | yes | — | — | yes | indexer 3/8 | ready |
| `CommunityRewardsFacet.CampaignMerkleRootUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `CommunityRewardsFacet.CampaignPaused` | yes | — | — | yes | indexer 4/8 | ready |
| `CommunityRewardsFacet.CampaignUnpaused` | yes | — | — | yes | indexer 2/8 | ready |
| `CommunityRewardsFacet.CampaignVestingConfig` | yes | — | — | yes | indexer 2/8 | ready |
| `CommunityRewardsFacet.Claimed` | yes | — | — | yes | indexer 4/8 | ready |

## DelegationFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.33/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DELEGATION_TYPEHASH` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `DOMAIN_TYPEHASH` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `delegate` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `delegateBySig` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `delegates` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getCurrentVotes` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getPriorVotes` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getTotalVotingPower` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `updateDelegatedVotingPower` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateDelegatedVotingPowerBatch` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DelegationFacet.DelegateChanged(address,address,address)` | yes | — | — | yes | indexer 2/8 | ready |
| `DelegationFacet.DelegateChanged(address,address,address)#2` | yes | — | — | yes | indexer 2/8 | ready |
| `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)` | yes | — | — | yes | indexer 2/8 | ready |
| `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)#2` | yes | — | — | yes | indexer 2/8 | ready |
| `DelegationFacet.VotingPowerUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## DiamondCutFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.29/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FOUNDER_ROLE` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `diamondCut` | write | yes | yes | — | yes | yes | yes | yes | adversarial 6/8 | ready |
| `getTrustedInitCodehash` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isImmutableSelectorReserved` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isTrustedInitSelector` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isTrustedInitSelectorPolicyEnabled` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setTrustedInitCodehash` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setTrustedInitContract` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setTrustedInitSelector` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `DiamondCutFacet.DiamondCut` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.DiamondCutEvent` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.TrustedInitCodehashSet` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.TrustedInitContractSet` | yes | — | — | yes | indexer 2/8 | ready |
| `DiamondCutFacet.TrustedInitSelectorSet` | yes | — | — | yes | indexer 2/8 | ready |

## DiamondLoupeFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `inventory` with an average score of `0/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `facetAddress` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `facetAddresses` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `facetFunctionSelectors` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `facets` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `supportsInterface` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| _none_ | — | — | — | — | — | — |

## EchoScoreFacetV3

Facet classification: **ready**. Proof depth spans `unit` to `indexer` with an average score of `2.67/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batchUpdateScores` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getEchoScoreOracleV3` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOracleFutureDriftConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOracleQuorumSigners` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getOracleStalenessConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getReputation` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getReputationHistory` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isEchoScorePausedV3` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `isOracleHealthy` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `pauseEchoScoreV3` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setEchoScoreOracleV3` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setOracleFutureDriftConfig` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setOracleQuorumSigners` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setOracleStalenessConfig` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `unpauseEchoScoreV3` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateScore` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

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

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.36/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveRecovery` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `completeRecovery` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `emergencyResume` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `emergencyStop` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `executeRecoveryAction` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `executeRecoveryStep` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `executeResponse` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `executeScheduledResume` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `extendPausedUntil` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `freezeAssets` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getEmergencyState` | read | yes | — | — | yes | yes | yes | yes | adversarial 5/8 | ready |
| `getEmergencyTimeout` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getIncident` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRecoveryPlan` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isAssetFrozen` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isEmergencyStopped` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `reportIncident` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `scheduleEmergencyResume` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setEmergencyTimeout` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setResumeDelay` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `startRecovery` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `triggerEmergency` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `unfreezeAssets` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EmergencyFacet.AssetsFrozen` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.EmergencyResumeExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.EmergencyResumeScheduled` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.EmergencyStateChanged` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyFacet.IncidentReported` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.PauseExtended` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.RecoveryCompleted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.RecoveryStarted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.RecoveryStepExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyFacet.ResponseExecuted` | yes | — | — | yes | indexer 3/8 | ready |

## EmergencyWithdrawalFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.75/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveEmergencyWithdrawal` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `executeWithdrawal` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `getApprovalCount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isRecipientWhitelisted` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `requestEmergencyWithdrawal` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setRecipientWhitelist` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `updateWithdrawalConfig` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalApproved` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyEthWithdrawalRequested` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawal` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalApproved` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.EmergencyWithdrawalRequested` | yes | — | — | yes | indexer 3/8 | ready |
| `EmergencyWithdrawalFacet.RecipientWhitelisted` | yes | — | — | yes | indexer 2/8 | ready |
| `EmergencyWithdrawalFacet.WithdrawalConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## EscrowFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3.9/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `escrowAsset` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `getAssetState` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getOriginalOwner` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `isInEscrow` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `onERC721Received` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `releaseAsset` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateAssetState` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `EscrowFacet.AssetEscrowed` | yes | — | — | yes | indexer 2/8 | ready |
| `EscrowFacet.AssetReleased` | yes | yes | — | yes | indexer 6/8 | ready |
| `EscrowFacet.AssetStateUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## GovernorFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.9/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getRoleMultiplier` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVotingConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setDefaultGasLimit` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `setTrustedTarget` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateProposalThreshold` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateQuorumNumerator` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateVotingDelay` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `updateVotingPeriod` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `GovernorFacet.TargetGasLimitUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `GovernorFacet.TrustedTargetUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## LegacyExecutionFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `3.14/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveInheritance` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `delegateRights` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `executeInheritance` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `initiateInheritance` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `LegacyExecutionFacet.InheritanceActivated` | yes | — | — | yes | indexer 2/8 | ready |
| `LegacyExecutionFacet.InheritanceApproved` | yes | — | — | yes | indexer 2/8 | ready |
| `LegacyExecutionFacet.RightsDelegated` | yes | — | — | yes | indexer 2/8 | ready |

## LegacyFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `4.31/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addBeneficiary` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `addDatasets` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `addInheritanceRequirement` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `addVoiceAssets` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `createLegacyPlan` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setBeneficiaryRelationship` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setInheritanceConditions` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setMaxBeneficiaries` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setMinTimelockPeriod` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateBeneficiary` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `LegacyFacet.BeneficiaryUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `LegacyFacet.InheritanceConditionsUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `LegacyFacet.LegacyPlanCreated` | yes | — | — | yes | indexer 2/8 | ready |

## LegacyViewFacet

Facet classification: **ready**. Proof depth spans `unit` to `live` with an average score of `2/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getLegacyPlan` | read | yes | yes | — | yes | — | — | — | live 3/8 | ready |
| `isInheritanceReady` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `validateBeneficiaries` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `validateBeneficiary` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| _none_ | — | — | — | — | — | — |

## MarketplaceFacet

Facet classification: **ready**. Proof depth spans `adversarial` to `indexer` with an average score of `4.27/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cancelListing` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getListing` | read | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `isPaused` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `listAsset` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `pause` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `purchaseAsset` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `unpause` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateListingPrice` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `MarketplaceFacet.AssetEscrowed` | yes | — | — | yes | indexer 3/8 | ready |
| `MarketplaceFacet.AssetListed` | yes | — | yes | yes | indexer 6/8 | ready |
| `MarketplaceFacet.AssetPurchased` | yes | yes | — | yes | indexer 6/8 | ready |
| `MarketplaceFacet.ListingCancelled` | yes | — | — | yes | indexer 2/8 | ready |
| `MarketplaceFacet.ListingPriceUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `MarketplaceFacet.MarketplacePaused` | yes | — | — | yes | indexer 2/8 | ready |
| `MarketplaceFacet.MarketplaceUnpaused` | yes | — | — | yes | indexer 2/8 | ready |

## MultiSigFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.7/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addOperationType` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `addOperator` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `approveOperation` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `canExecuteOperation` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `cancelOperation` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `execute` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `executeOperation` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `getOperationConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getOperationStatus` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `hasApprovedOperation` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `isOperator` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `muSetPaused` | write | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `proposeOperation` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `removeOperator` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setOperationConfig` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `submitTransaction` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `MultiSigFacet.ActionExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.BatchCompleted` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.MultiSigOperationCancelled` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.OperationApproved` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.OperationExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.OperationProposed` | yes | — | — | yes | indexer 2/8 | ready |
| `MultiSigFacet.OperationStatusChanged` | yes | — | — | yes | indexer 2/8 | ready |

## OwnershipFacet

Facet classification: **ready**. Proof depth spans `workflow` to `indexer` with an average score of `3.33/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `acceptOwnership` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `cancelOwnershipTransfer` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `isOwnerTargetApproved` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isOwnershipPolicyEnforced` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `owner` | read | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `pendingOwner` | read | yes | yes | — | — | — | — | — | workflow 2/8 | ready |
| `proposeOwnershipTransfer` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setApprovedOwnerTarget` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setOwnershipPolicyEnforced` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `transferOwnership` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `OwnershipFacet.OwnershipPolicyEnforcementSet` | yes | — | — | yes | indexer 2/8 | ready |
| `OwnershipFacet.OwnershipTargetApprovalSet` | yes | — | — | yes | indexer 2/8 | ready |
| `OwnershipFacet.OwnershipTransferCancelled` | yes | — | — | yes | indexer 2/8 | ready |
| `OwnershipFacet.OwnershipTransferProposed` | yes | — | — | yes | indexer 2/8 | ready |
| `OwnershipFacet.OwnershipTransferred` | yes | — | — | yes | indexer 2/8 | ready |

## PaymentFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.38/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveMultisigWithdrawal` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `commitDistribution` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `commitWithdraw` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `distributePayment` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `distributePaymentFrom` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `distributePaymentFromWithDeadline` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `distributePaymentWithDeadline` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `executeMultisigWithdrawal` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `executeQuarterlyBuyback` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `getAssetRevenue` | read | yes | yes | — | — | — | yes | — | adversarial 3/8 | ready |
| `getBuybackStatus` | read | yes | yes | — | — | — | yes | — | adversarial 3/8 | ready |
| `getDevFundAddress` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getFeeConfiguration` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getMevProtectionConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getPendingPayments` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getPendingTimewaveGift` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRevenueMetrics` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTreasuryAddress` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTreasuryWithdrawalLimit` | read | yes | yes | — | — | — | yes | — | adversarial 3/8 | ready |
| `getUnionTreasuryAddress` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUsdcToken` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `pauseBuybacks` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `paymentPaused` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `revealDistribution` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `revealDistributionStruct` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `revealWithdraw` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setBuybackConfig` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setBuybackConfigStruct` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setMevProtectionConfig` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setPaymentPaused` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setStakingConfig` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setTreasuryWithdrawalLimit` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setUsdcToken` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateDevFundAddress` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateFeeConfiguration` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateTreasuryAddress` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateUnionTreasuryAddress` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `withdrawPayments` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `withdrawPaymentsWithDeadline` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

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
| `PaymentFacet.USDCPaymentWithdrawn` | yes | yes | — | yes | indexer 5/8 | ready |
| `PaymentFacet.UnionTreasuryAddressUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.UsdcTokenUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `PaymentFacet.WithdrawalLimitUpdated` | yes | — | — | yes | indexer 2/8 | ready |

## ProposalFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.69/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GOVERNANCE_PROPOSER_ROLE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `TIMELOCK_ROLE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `cancelProposal` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getActiveProposals` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getProposalTypeConfig` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getProposerProposals` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getReceipt` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `prCastVote` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `prExecute` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `prQueue` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `prState` | read | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `proposalDeadline` | read | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `proposalExists` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `proposalSnapshot` | read | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `proposalVotes` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `propose(string,string,address[],uint256[],bytes[],uint8)` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `propose(address[],uint256[],bytes[],string,uint8)` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `queue` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `setProposalTypeConfig` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `state` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `ProposalFacet.ProposalCanceled` | yes | — | — | yes | indexer 2/8 | ready |
| `ProposalFacet.ProposalCreated` | yes | — | — | yes | indexer 4/8 | ready |
| `ProposalFacet.ProposalExecuted` | yes | — | — | yes | indexer 4/8 | ready |
| `ProposalFacet.ProposalQueued` | yes | — | — | yes | indexer 3/8 | ready |
| `ProposalFacet.ProposalTypeConfigSet` | yes | — | — | yes | indexer 2/8 | ready |
| `ProposalFacet.VoteCast` | yes | — | — | yes | indexer 4/8 | ready |

## RightsFacet

Facet classification: **ready**. Proof depth spans `unit` to `indexer` with an average score of `3/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addCollaborator` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `createRightsGroup` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getCategoryContracts` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getCollaborator` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRightCategory` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRightContract` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getRightsGroup` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getUserRights` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `grantRight` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `registerRightContract` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `removeCollaborator` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `revokeRight` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `rightIdExists` | read | yes | — | — | yes | — | — | — | live 2/8 | ready |
| `updateCollaboratorShare` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateRightContract` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |

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

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.73/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `advanceEpoch` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `claimRewards` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `executeUnstake` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `fundRewardPool` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getDegradedModeConfig` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getEffectiveApy` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getPendingRewards` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRewardBreakdown` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getStakeAgeMultiplier` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getStakeInfo` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getStakingStats` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTier` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getTierConfig` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getUnstakeRequest` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `initStaking` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `initStakingWithToken` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `isDegradedModeActive` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `queueTierConfigUpdate` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `requestUnstake` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setDegradedModeConfig` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setEchoScoreBoost` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `setStakingPaused` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `stake` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `StakingFacet.EpochAdvanced` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.RewardPoolFunded` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.RewardsClaimed` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.RewardsClaimedDetailed` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.Staked` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.StakingInitialized` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.StakingPaused` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.TierConfigUpdated` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.UnstakeRequested` | yes | — | — | yes | indexer 2/8 | ready |
| `StakingFacet.Unstaked` | yes | — | — | yes | indexer 2/8 | ready |

## TimelockFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.05/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EXECUTOR_ROLE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `PROPOSER_ROLE` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `cancel` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `execute` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getMinDelay` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getOperation` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTimestamp` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isOperationExecuted` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isOperationPending` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isOperationReady` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `schedule` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateMinDelay` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TimelockFacet.CallExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.MinDelayUpdated(uint256,uint256)` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.MinDelayUpdated(uint256,uint256)#2` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.OperationExecuted(bytes32,uint256,uint256)` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.OperationExecuted(bytes32)` | yes | — | — | yes | indexer 4/8 | ready |
| `TimelockFacet.OperationRemoved` | yes | — | — | yes | indexer 2/8 | ready |
| `TimelockFacet.OperationScheduled` | yes | — | — | yes | indexer 3/8 | ready |
| `TimelockFacet.OperationStored` | yes | — | — | yes | indexer 3/8 | ready |
| `TimelockFacet.TimelockOperationCanceled` | yes | — | — | yes | indexer 2/8 | ready |

## TimewaveGiftFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.64/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batchReleaseTwaveVesting` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `canTransferVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `createUsdcVestingSchedule` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `getMinTwaveVestingDuration` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getNextUnlockTime` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getQuarterlyUnlockRate` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getReleasableTwaveAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVestedTwaveAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVestingTwaveSchedule` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `isFullyVested` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `isVestingActive` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `releaseTwaveVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `releaseTwaveVestingFor` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `revokeTwaveVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `setMinimumTwaveVestingDuration` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setQuarterlyUnlockRate` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `transferTwaveVesting` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TimewaveGiftFacet.TokensVested` | yes | — | — | yes | indexer 2/8 | ready |
| `TimewaveGiftFacet.VestingRevoked` | yes | — | — | yes | indexer 2/8 | ready |
| `TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)` | yes | — | — | yes | indexer 2/8 | ready |
| `TimewaveGiftFacet.VestingScheduleCreated(address,uint256,uint256,uint256,uint256,bool)#2` | yes | — | — | yes | indexer 2/8 | ready |
| `TimewaveGiftFacet.VestingTransferred` | yes | — | — | yes | indexer 2/8 | ready |

## TokenSupplyFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.28/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `allowance` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `approve` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `balanceOf` | read | yes | yes | — | — | yes | yes | — | adversarial 4/8 | ready |
| `burn` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `burnFrom` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `decimals` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `initializeToken` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `supplyFinishMinting` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `supplyGetMaximum` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `supplyIsMintingFinished` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `supplyMintTokens` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `supplySetMaximum` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `tokenAllowance` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `tokenApprove` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `tokenBalanceOf` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `tokenName` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `tokenSymbol` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `tokenTransferFrom` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `totalSupply` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `transfer` | write | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `transferFrom` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenSupplyFacet.Approval` | yes | — | — | yes | indexer 2/8 | ready |
| `TokenSupplyFacet.MintingFinished` | yes | — | — | yes | indexer 2/8 | ready |
| `TokenSupplyFacet.TokenInitialized` | yes | — | — | yes | indexer 2/8 | ready |
| `TokenSupplyFacet.Transfer` | yes | — | — | yes | indexer 3/8 | ready |

## UpgradeControllerFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.35/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveUpgrade` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `executeUpgrade` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `freezeUpgradeControl` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `getOperationalInvariants` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUpgrade` | read | yes | — | — | — | yes | — | — | adversarial 2/8 | ready |
| `getUpgradeControlStatus` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getUpgradeDelay` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUpgradeThreshold` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `initUpgradeController` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `isUpgradeApproved` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isUpgradeControlFrozen` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isUpgradeSigner` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `proposeDiamondCut` | write | yes | yes | — | yes | yes | — | yes | adversarial 5/8 | ready |
| `setUpgradeControlEnforced` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `UpgradeControllerFacet.UpgradeApproved` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeControlEnforcementSet` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeControlFrozen` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeControllerInitialized` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeExecuted` | yes | — | — | yes | indexer 2/8 | ready |
| `UpgradeControllerFacet.UpgradeProposed` | yes | — | — | yes | indexer 2/8 | ready |

## VestingFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.08/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `calculateCexVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateDevFundVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateFounderVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculatePublicVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateTeamVesting` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `createCexVesting` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `createDevFundVesting` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `createFounderVesting` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `createPublicVesting` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `createTeamVesting` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `getSellableAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getStandardVestedAmount` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getStandardVestingReleasable` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getStandardVestingSchedule` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVestingDetails` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVestingReleasableAmount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVestingTotalAmount` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVestingType` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `hasVestingSchedule` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `releaseStandardVesting` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `releaseStandardVestingFor` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `releaseTokensFor` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `releaseVestedTokens` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `revokeVestingSchedule` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `setMinimumVestingDuration` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `transferVestingSchedule` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `veGetRoleAdmin` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `veGetVestingSchedule` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `veHasRole` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `veSupportsInterface` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VestingFacet.BeneficiaryTransferred` | yes | — | — | yes | indexer 2/8 | ready |
| `VestingFacet.SaleRestrictionUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.TokensReleased` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingInitialized` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingPaused` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingScheduleCreated` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingScheduleRevoked` | yes | — | — | yes | indexer 3/8 | ready |
| `VestingFacet.VestingUnpaused` | yes | — | — | yes | indexer 3/8 | ready |

## VoiceAssetFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `2.85/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approveVoiceAsset` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `authorizeUser` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `customizeRoyaltyRate` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `getApproved` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getDefaultPlatformFee` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getDefaultRoyaltyRate` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getMaxRoyaltyRate` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getRoyaltyHistory` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getTokenId` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `getUserVoices` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVoiceAsset` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |
| `getVoiceAssetDetails` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVoiceAssetsByOwner` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `getVoiceHash` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVoiceHashFromTokenId` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isApprovedForAll` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isAuthorized` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `isRegistrationPaused` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `lockVoiceAsset` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `name` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `ownerOf` | read | yes | yes | — | yes | yes | yes | — | adversarial 5/8 | ready |
| `recordRoyaltyPayment` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `recordRoyaltyPaymentFrom` | write | yes | yes | — | — | yes | — | yes | adversarial 4/8 | ready |
| `recordUsage` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `recordUsageFrom` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `registerVoiceAsset` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `registerVoiceAssetForCaller` | write | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `revokeUser` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |
| `safeTransferFrom(address,address,uint256)` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `safeTransferFrom(address,address,uint256,bytes)` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setApprovalForAll` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `setDefaultPlatformFee` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setDefaultRoyaltyRate` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setRegistrationPaused` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `supportsInterface` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `symbol` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `tokenURI` | read | yes | — | — | — | — | — | — | unit 1/8 | ready |
| `transferFromVoiceAsset` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `unlockVoiceAsset` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
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
| `VoiceAssetFacet.Transfer` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceAssetFacet.UserAuthorizationChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.VoiceAssetLockChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceAssetFacet.VoiceAssetRegistered` | yes | — | yes | yes | indexer 3/8 | ready |
| `VoiceAssetFacet.VoiceAssetUsed` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceDatasetFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.64/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `appendAssets` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `burnDataset` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `containsAsset` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `createDataset` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `getDataset` | read | yes | yes | — | yes | — | — | — | live 3/8 | ready |
| `getDatasetsByCreator` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `getMaxAssetsPerDataset` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getTotalDatasets` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `removeAsset` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `royaltyInfo` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `setDatasetStatus` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `setLicense` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `setMaxAssetsPerDataset` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `setMetadata` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |
| `setRoyalty` | write | yes | yes | yes | yes | yes | yes | yes | adversarial 7/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceDatasetFacet.AssetRemoved` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.AssetsAppended` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.DatasetBurned` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.DatasetCreated` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.DatasetRoyaltyPayeeSet` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.DatasetStatusChanged` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.LicenseChanged` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.MetadataChanged` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceDatasetFacet.RoyaltySet` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceDatasetFacet.Transfer` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceLicenseFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.39/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createLicense` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `createLicenseWithMarketplace` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `getLicense` | read | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `getLicenseHistory` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLicenseTerms` | read | yes | yes | yes | — | yes | yes | — | adversarial 5/8 | ready |
| `getLicensees` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getPendingRevenue` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getUsageCount` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `isUsageRefUsed` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `issueLicense` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `recordLicensedUsage` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `revokeLicense` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `transferLicense` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateLicenseTerms` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |
| `validateLicense` | read | — | — | yes | — | — | yes | — | adversarial 2/8 | needs fixture |
| `withdrawLicenseRevenue` | write | yes | yes | — | — | yes | yes | yes | adversarial 5/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceLicenseFacet.Debug` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceLicenseFacet.LicenseBatchGranted` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceLicenseFacet.LicenseCreated(bytes32,bytes32,address,uint256,uint256)` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseFacet.LicenseCreated(bytes32,address,bytes32,uint256,uint256)` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseFacet.LicenseEnded` | yes | — | — | yes | indexer 2/8 | ready |
| `VoiceLicenseFacet.LicenseRenewed` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceLicenseFacet.LicenseRevoked` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseFacet.LicenseTermsUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceLicenseFacet.LicenseTransferred` | yes | — | — | yes | indexer 5/8 | ready |
| `VoiceLicenseFacet.LicenseUsed` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseFacet.TemplateUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceLicenseFacet.VoiceAssetUsed` | yes | — | — | yes | indexer 2/8 | ready |

## VoiceLicenseTemplateFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `4.78/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createLicenseFromTemplate` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `createTemplate` | write | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `getCreatorTemplates` | read | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `getTemplate` | read | yes | yes | yes | yes | yes | yes | — | adversarial 6/8 | ready |
| `isTemplateActive` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `setTemplateStatus` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateTemplate` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceLicenseTemplateFacet.LicenseCreated` | yes | — | — | yes | indexer 4/8 | ready |
| `VoiceLicenseTemplateFacet.TemplateUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## VoiceMetadataFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.25/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `getBasicAcousticFeatures` | read | yes | yes | — | — | yes | — | — | adversarial 3/8 | ready |
| `getGeographicData` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVoiceCategories` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `getVoiceClassifications` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `searchVoicesByClassification` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `searchVoicesByClassificationPaginated` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `setAnalysisVersion` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateBasicAcousticFeatures` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateClassificationCategory` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateGeographicData` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |
| `updateVoiceClassifications` | write | yes | yes | yes | — | yes | yes | yes | adversarial 6/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VoiceMetadataFacet.AnalysisVersionUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.BasicAcousticFeaturesUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.ClassificationCategoryUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.GeographicDataUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VoiceMetadataFacet.VoiceClassificationsUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## VotingPowerFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.14/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MAX_BATCH_SIZE` | read | yes | — | — | — | — | yes | — | adversarial 2/8 | ready |
| `calculateBaseRoleMultiplier` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getDelegatedVotingPower` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getLatestCheckpoint` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getLockDuration` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getLockTimestamp` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getPastVotes` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVotes` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `getVotingPower` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `getVotingPowerWithDelegations` | read | yes | — | — | — | yes | yes | — | adversarial 3/8 | ready |
| `setMaxLockDuration` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setRoleMultiplier` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setZeroLockDuration` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `setupInitialVotingPower` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateLockDuration` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateVotingPower` | write | yes | yes | yes | — | yes | — | yes | adversarial 5/8 | ready |
| `updateVotingPowerBatch` | write | yes | yes | yes | — | yes | — | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `VotingPowerFacet.LockDurationUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VotingPowerFacet.MaxLockDurationUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VotingPowerFacet.RoleMultiplierUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `VotingPowerFacet.VotingPowerUpdated` | yes | — | — | yes | indexer 3/8 | ready |

## WhisperBlockFacet

Facet classification: **needs fixture**. Proof depth spans `inventory` to `indexer` with an average score of `3.67/8`.

### Functions

| Function | Kind | Unit | Workflow | Fork | Sepolia | Negative | Economic | Red-team | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ENCRYPTOR_ROLE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `OWNER_ROLE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `VOICE_OPERATOR_ROLE` | read | — | — | — | — | — | — | — | inventory 0/8 | needs fixture |
| `generateAndSetEncryptionKey` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `getAuditTrail` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `getSelectors` | read | — | — | — | yes | — | — | — | live 1/8 | needs fixture |
| `grantAccess` | write | yes | yes | yes | yes | yes | — | — | adversarial 5/8 | ready |
| `registerVoiceFingerprint` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `revokeAccess` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `setAuditEnabled` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `setOffchainEntropy` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `setTrustedOracle` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `updateSystemParameters` | write | yes | yes | yes | yes | yes | — | yes | adversarial 6/8 | ready |
| `verifyVoiceAuthenticity` | read | yes | yes | — | yes | yes | — | — | adversarial 4/8 | ready |

### Events

| Event | Unit | Fork | Sepolia | Indexer | Depth | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `WhisperBlockFacet.AccessGranted` | yes | — | — | yes | indexer 4/8 | ready |
| `WhisperBlockFacet.AccessRevoked` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.AuditEvent` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.KeyRotated` | yes | — | — | yes | indexer 4/8 | ready |
| `WhisperBlockFacet.OffchainKeyGenerated` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.SecurityParametersUpdated` | yes | — | — | yes | indexer 3/8 | ready |
| `WhisperBlockFacet.VoiceFingerprintUpdated` | yes | — | — | yes | indexer 5/8 | ready |
