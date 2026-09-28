# Gap Builder Plan

Generated: `2026-09-28T02:14:59.584Z`
Source gap report: `2026-09-28T02:14:47.728Z`

## Summary

- Non-ready items in scope: `399`
- Selected this run: `40`

## AccessControlFacet

Reduce AccessControlFacet launch blockers across 9 gap items.

- `AccessControlFacet.emergencyForceAdd` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/emergency-force-add`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `AccessControlFacet.executeFounderSunset` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/execute-founder-sunset`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `AccessControlFacet.scheduleFounderSunset` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/schedule-founder-sunset`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `AccessControlFacet.setPaused` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/set-paused`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `AccessControlFacet.setRecoveryActive` (unsafe on live network)
  - Endpoint: `POST /v1/access-control/admin/set-recovery-active`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `AccessControlFacet.debugRoleIndexState` (needs fixture)
  - Endpoint: `GET /v1/access-control/queries/debug-role-index-state`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.getOwnerOperationalRoles` (needs fixture)
  - Endpoint: `GET /v1/access-control/queries/get-owner-operational-roles`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.getRequiredSigners` (needs fixture)
  - Endpoint: `GET /v1/access-control/queries/get-required-signers`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `AccessControlFacet.isFounderSunsetActive` (needs fixture)
  - Endpoint: `POST /v1/access-control/queries/is-founder-sunset-active`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## DiamondCutFacet

Reduce DiamondCutFacet launch blockers across 4 gap items.

- `DiamondCutFacet.diamondCut` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/diamond-cut`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `DiamondCutFacet.setTrustedInitCodehash` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-trusted-init-codehash`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `DiamondCutFacet.setTrustedInitContract` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-trusted-init-contract`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `DiamondCutFacet.setTrustedInitSelector` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-trusted-init-selector`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

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
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.executeRecoveryStep` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/execute-recovery-step`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.setEmergencyTimeout` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-emergency-timeout`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.setResumeDelay` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-resume-delay`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
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
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## MultiSigFacet

Reduce MultiSigFacet launch blockers across 9 gap items.

- `MultiSigFacet.addOperationType` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/add-operation-type`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `MultiSigFacet.addOperator` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/add-operator`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
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
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `MultiSigFacet.proposeOperation` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/propose-operation`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `MultiSigFacet.setOperationConfig` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/set-operation-config`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `MultiSigFacet.submitTransaction` (unsafe on live network)
  - Endpoint: `POST /v1/multisig/admin/submit-transaction`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

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

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

