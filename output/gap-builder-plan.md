# Gap Builder Plan

Generated: `2026-10-18T10:01:52.824Z`
Source gap report: `2026-10-18T10:01:50.601Z`

## Summary

- Non-ready items in scope: `28`
- Selected this run: `13`

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

Reduce DiamondCutFacet launch blockers across 1 gap item.

- `DiamondCutFacet.diamondCut` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/diamond-cut`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EmergencyFacet

Reduce EmergencyFacet launch blockers across 5 gap items.

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
- `EmergencyFacet.startRecovery` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/start-recovery`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EmergencyWithdrawalFacet

Reduce EmergencyWithdrawalFacet launch blockers across 2 gap items.

- `EmergencyWithdrawalFacet.approveEmergencyWithdrawal` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/approve-emergency-withdrawal`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyWithdrawalFacet.executeWithdrawal` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/execute-withdrawal`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

