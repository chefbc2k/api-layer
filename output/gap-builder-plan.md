# Gap Builder Plan

Generated: `2026-10-04T16:01:53.158Z`
Source gap report: `2026-10-04T15:43:53.730Z`

## Summary

- Non-ready items in scope: `332`
- Selected this run: `133`

## AccessControlFacet

Reduce AccessControlFacet launch blockers across 5 gap items.

- `AccessControlFacet.emergencyForceAdd` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/emergency-force-add`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.executeFounderSunset` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/execute-founder-sunset`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.scheduleFounderSunset` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/schedule-founder-sunset`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.setPaused` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/set-paused`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.setRecoveryActive` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/set-recovery-active`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## DiamondCutFacet

Reduce DiamondCutFacet launch blockers across 4 gap items.

- `DiamondCutFacet.diamondCut` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/diamond-cut`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DiamondCutFacet.setTrustedInitCodehash` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-trusted-init-codehash`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DiamondCutFacet.setTrustedInitContract` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-trusted-init-contract`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DiamondCutFacet.setTrustedInitSelector` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-trusted-init-selector`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EmergencyFacet

Reduce EmergencyFacet launch blockers across 7 gap items.

- `EmergencyFacet.approveRecovery` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/approve-recovery`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.completeRecovery` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/complete-recovery`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.executeRecoveryAction` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/execute-recovery-action`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.executeRecoveryStep` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/execute-recovery-step`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.setEmergencyTimeout` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-emergency-timeout`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.setResumeDelay` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-resume-delay`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.startRecovery` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/start-recovery`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EmergencyWithdrawalFacet

Reduce EmergencyWithdrawalFacet launch blockers across 5 gap items.

- `EmergencyWithdrawalFacet.approveEmergencyWithdrawal` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/approve-emergency-withdrawal`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyWithdrawalFacet.executeWithdrawal` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/execute-withdrawal`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyWithdrawalFacet.requestEmergencyWithdrawal` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/request-emergency-withdrawal`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyWithdrawalFacet.setRecipientWhitelist` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-recipient-whitelist`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyWithdrawalFacet.updateWithdrawalConfig` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/update-withdrawal-config`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## MultiSigFacet

Reduce MultiSigFacet launch blockers across 9 gap items.

- `MultiSigFacet.addOperationType` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/add-operation-type`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.addOperator` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/add-operator`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.approveOperation` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/approve-operation`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.execute` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/execute`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.executeOperation` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/execute-operation`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.muSetPaused` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/mu-set-paused`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.proposeOperation` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/propose-operation`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.setOperationConfig` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/set-operation-config`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.submitTransaction` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/submit-transaction`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## ProposalFacet

Reduce ProposalFacet launch blockers across 1 gap item.

- `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` (unsafe on live network)
  - Endpoint: `ABI-only`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## UpgradeControllerFacet

Reduce UpgradeControllerFacet launch blockers across 12 gap items.

- `UpgradeControllerFacet.approveUpgrade` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/approve-upgrade`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `UpgradeControllerFacet.executeUpgrade` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/execute-upgrade`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.freezeUpgradeControl` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/freeze-upgrade-control`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `UpgradeControllerFacet.proposeDiamondCut` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/propose-diamond-cut`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.setUpgradeControlEnforced` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-upgrade-control-enforced`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `UpgradeControllerFacet.initUpgradeController` (needs fixture)
  - Endpoint: `POST /v1/diamond-admin/diamond-admin`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `UpgradeControllerFacet.UpgradeApproved` (needs indexer proof)
  - Endpoint: `POST /v1/diamond-admin/events/upgrade-approved/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.UpgradeControlEnforcementSet` (needs indexer proof)
  - Endpoint: `POST /v1/diamond-admin/events/upgrade-control-enforcement-set/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.UpgradeControlFrozen` (needs indexer proof)
  - Endpoint: `POST /v1/diamond-admin/events/upgrade-control-frozen/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.UpgradeControllerInitialized` (needs indexer proof)
  - Endpoint: `POST /v1/diamond-admin/events/upgrade-controller-initialized/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.UpgradeExecuted` (needs indexer proof)
  - Endpoint: `POST /v1/diamond-admin/events/upgrade-executed/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.UpgradeProposed` (needs indexer proof)
  - Endpoint: `POST /v1/diamond-admin/events/upgrade-proposed/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## BurnThresholdFacet

Reduce BurnThresholdFacet launch blockers across 6 gap items.

- `BurnThresholdFacet.thresholdBurnExcess` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/threshold-burn-excess`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `BurnThresholdFacet.thresholdBurnTokens` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/threshold-burn-tokens`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `BurnThresholdFacet.thresholdBurnTokensFrom` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/threshold-burn-tokens-from`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `BurnThresholdFacet.thresholdSetBurnLimit` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/threshold-set-burn-limit`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `BurnThresholdFacet.BurnThresholdUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/tokenomics/events/burn-threshold-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `BurnThresholdFacet.ThresholdBurn` (needs indexer proof)
  - Endpoint: `POST /v1/tokenomics/events/threshold-burn/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## CommunityRewardsFacet

Reduce CommunityRewardsFacet launch blockers across 1 gap item.

- `CommunityRewardsFacet.vestedAmount` (needs fixture)
  - Endpoint: `GET /v1/tokenomics/queries/vested-amount`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`

## DelegationFacet

Reduce DelegationFacet launch blockers across 9 gap items.

- `DelegationFacet.DELEGATION_TYPEHASH` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/delegation-typehash`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DelegationFacet.DOMAIN_TYPEHASH` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/domain-typehash`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DelegationFacet.getPriorVotes` (needs fixture)
  - Endpoint: `GET /v1/staking/queries/get-prior-votes`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DelegationFacet.getTotalVotingPower` (needs fixture)
  - Endpoint: `GET /v1/staking/queries/get-total-voting-power`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DelegationFacet.delegateBySig` (needs fixture)
  - Endpoint: `POST /v1/staking/commands/delegate-by-sig`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `DelegationFacet.updateDelegatedVotingPower` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/update-delegated-voting-power`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `DelegationFacet.updateDelegatedVotingPowerBatch` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/update-delegated-voting-power-batch`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/delegate-votes-changed/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DelegationFacet.DelegateVotesChanged(address,uint256,uint256)#2` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/delegate-votes-changed/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## EchoScoreFacetV3

Reduce EchoScoreFacetV3 launch blockers across 24 gap items.

- `EchoScoreFacetV3.getEchoScoreOracleV3` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/get-echo-score-oracle-v3`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.getOracleFutureDriftConfig` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/get-oracle-future-drift-config`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.getOracleQuorumSigners` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/get-oracle-quorum-signers`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.getOracleStalenessConfig` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/get-oracle-staleness-config`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.getReputation` (needs fixture)
  - Endpoint: `GET /v1/staking/queries/get-reputation`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.getReputationHistory` (needs fixture)
  - Endpoint: `GET /v1/staking/queries/get-reputation-history`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.isEchoScorePausedV3` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/is-echo-score-paused-v3`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.isOracleHealthy` (needs fixture)
  - Endpoint: `POST /v1/staking/queries/is-oracle-healthy`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.batchUpdateScores` (needs fixture)
  - Endpoint: `POST /v1/staking/commands/batch-update-scores`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.pauseEchoScoreV3` (needs fixture)
  - Endpoint: `POST /v1/staking/commands/pause-echo-score-v3`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.setEchoScoreOracleV3` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-echo-score-oracle-v3`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.setOracleFutureDriftConfig` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-oracle-future-drift-config`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.setOracleQuorumSigners` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-oracle-quorum-signers`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.setOracleStalenessConfig` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-oracle-staleness-config`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.unpauseEchoScoreV3` (needs fixture)
  - Endpoint: `POST /v1/staking/commands/unpause-echo-score-v3`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.updateScore` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/update-score`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EchoScoreFacetV3.OracleFutureDriftConfigUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/oracle-future-drift-config-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.OracleQuorumConfigUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/oracle-quorum-config-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.OracleStalenessConfigUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/oracle-staleness-config-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.OracleUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/oracle-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.Paused` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/paused/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.ReputationUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/reputation-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.ScoresUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/scores-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EchoScoreFacetV3.Unpaused` (needs indexer proof)
  - Endpoint: `POST /v1/staking/events/unpaused/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## EscrowFacet

Reduce EscrowFacet launch blockers across 6 gap items.

- `EscrowFacet.escrowAsset` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/escrow-asset`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EscrowFacet.onERC721Received` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/on-erc721-received`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EscrowFacet.releaseAsset` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/release-asset`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EscrowFacet.updateAssetState` (needs fixture)
  - Endpoint: `PATCH /v1/marketplace/commands/update-asset-state`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EscrowFacet.AssetReleased` (needs indexer proof)
  - Endpoint: `POST /v1/marketplace/events/asset-released/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage.
- `EscrowFacet.AssetStateUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/marketplace/events/asset-state-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## GovernorFacet

Reduce GovernorFacet launch blockers across 8 gap items.

- `GovernorFacet.setDefaultGasLimit` (needs fixture)
  - Endpoint: `PATCH /v1/governance/commands/set-default-gas-limit`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `GovernorFacet.setTrustedTarget` (needs fixture)
  - Endpoint: `PATCH /v1/governance/commands/set-trusted-target`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `GovernorFacet.updateProposalThreshold` (needs fixture)
  - Endpoint: `PATCH /v1/governance/commands/update-proposal-threshold`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `GovernorFacet.updateQuorumNumerator` (needs fixture)
  - Endpoint: `PATCH /v1/governance/commands/update-quorum-numerator`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `GovernorFacet.updateVotingDelay` (needs fixture)
  - Endpoint: `PATCH /v1/governance/commands/update-voting-delay`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test.
- `GovernorFacet.updateVotingPeriod` (needs fixture)
  - Endpoint: `PATCH /v1/governance/commands/update-voting-period`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `GovernorFacet.TargetGasLimitUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/governance/events/target-gas-limit-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `GovernorFacet.TrustedTargetUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/governance/events/trusted-target-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## LegacyFacet

Reduce LegacyFacet launch blockers across 6 gap items.

- `LegacyFacet.setMaxBeneficiaries` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-max-beneficiaries`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.setMinTimelockPeriod` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-min-timelock-period`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.updateBeneficiary` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/update-beneficiary`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.BeneficiaryUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/voice-assets/events/beneficiary-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `LegacyFacet.InheritanceConditionsUpdated` (needs indexer proof)
  - Endpoint: `POST /v1/voice-assets/events/inheritance-conditions-updated/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `LegacyFacet.LegacyPlanCreated` (needs indexer proof)
  - Endpoint: `POST /v1/voice-assets/events/legacy-plan-created/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## LegacyViewFacet

Reduce LegacyViewFacet launch blockers across 1 gap item.

- `LegacyViewFacet.validateBeneficiaries` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/queries/validate-beneficiaries`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`

## OwnershipFacet

Reduce OwnershipFacet launch blockers across 11 gap items.

- `OwnershipFacet.acceptOwnership` (needs fixture)
  - Endpoint: `POST /v1/ownership/commands/accept-ownership`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `OwnershipFacet.cancelOwnershipTransfer` (needs fixture)
  - Endpoint: `DELETE /v1/ownership/commands/cancel-ownership-transfer`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `OwnershipFacet.proposeOwnershipTransfer` (needs fixture)
  - Endpoint: `POST /v1/ownership/commands/propose-ownership-transfer`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `OwnershipFacet.setApprovedOwnerTarget` (needs fixture)
  - Endpoint: `PATCH /v1/ownership/commands/set-approved-owner-target`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `OwnershipFacet.setOwnershipPolicyEnforced` (needs fixture)
  - Endpoint: `PATCH /v1/ownership/commands/set-ownership-policy-enforced`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `OwnershipFacet.transferOwnership` (needs fixture)
  - Endpoint: `POST /v1/ownership/commands/transfer-ownership`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `OwnershipFacet.OwnershipPolicyEnforcementSet` (needs indexer proof)
  - Endpoint: `POST /v1/ownership/events/ownership-policy-enforcement-set/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `OwnershipFacet.OwnershipTargetApprovalSet` (needs indexer proof)
  - Endpoint: `POST /v1/ownership/events/ownership-target-approval-set/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `OwnershipFacet.OwnershipTransferCancelled` (needs indexer proof)
  - Endpoint: `POST /v1/ownership/events/ownership-transfer-cancelled/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `OwnershipFacet.OwnershipTransferProposed` (needs indexer proof)
  - Endpoint: `POST /v1/ownership/events/ownership-transfer-proposed/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `OwnershipFacet.OwnershipTransferred` (needs indexer proof)
  - Endpoint: `POST /v1/ownership/events/ownership-transferred/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`, `pnpm run test:actor-negative-paths`

## PaymentFacet

Reduce PaymentFacet launch blockers across 18 gap items.

- `PaymentFacet.getMevProtectionConfig` (needs fixture)
  - Endpoint: `POST /v1/marketplace/queries/get-mev-protection-config`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `PaymentFacet.getPendingTimewaveGift` (needs fixture)
  - Endpoint: `GET /v1/marketplace/queries/get-pending-timewave-gift`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `PaymentFacet.approveMultisigWithdrawal` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/approve-multisig-withdrawal`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.commitDistribution` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/commit-distribution`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.commitWithdraw` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/commit-withdraw`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.distributePayment` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/distribute-payment`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.distributePaymentFrom` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/distribute-payment-from`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.distributePaymentFromWithDeadline` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/distribute-payment-from-with-deadline`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.distributePaymentWithDeadline` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/distribute-payment-with-deadline`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.executeMultisigWithdrawal` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/execute-multisig-withdrawal`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.executeQuarterlyBuyback` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/execute-quarterly-buyback`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.pauseBuybacks` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/pause-buybacks`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `PaymentFacet.revealDistribution` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/reveal-distribution`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.revealDistributionStruct` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/reveal-distribution-struct`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.revealWithdraw` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/reveal-withdraw`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.setBuybackConfig` (needs fixture)
  - Endpoint: `PATCH /v1/marketplace/commands/set-buyback-config`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.setBuybackConfigStruct` (needs fixture)
  - Endpoint: `PATCH /v1/marketplace/commands/set-buyback-config-struct`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.setMevProtectionConfig` (needs fixture)
  - Endpoint: `PATCH /v1/marketplace/commands/set-mev-protection-config`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

