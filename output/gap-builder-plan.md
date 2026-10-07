# Gap Builder Plan

Generated: `2026-10-07T09:38:34.191Z`
Source gap report: `2026-10-07T09:38:25.599Z`

## Summary

- Non-ready items in scope: `146`
- Selected this run: `40`

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

Reduce UpgradeControllerFacet launch blockers across 5 gap items.

- `UpgradeControllerFacet.approveUpgrade` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/approve-upgrade`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.executeUpgrade` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/execute-upgrade`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.freezeUpgradeControl` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/freeze-upgrade-control`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.proposeDiamondCut` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/propose-diamond-cut`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `UpgradeControllerFacet.setUpgradeControlEnforced` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-upgrade-control-enforced`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EscrowFacet

Reduce EscrowFacet launch blockers across 4 gap items.

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

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

