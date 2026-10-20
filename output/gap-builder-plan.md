# Gap Builder Plan

Generated: `2026-10-20T09:57:41.874Z`
Source gap report: `2026-10-20T09:57:39.738Z`

## Summary

- Non-ready items in scope: `8`
- Selected this run: `8`

## DiamondCutFacet

Reduce DiamondCutFacet launch blockers across 3 gap items.

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

Reduce EmergencyFacet launch blockers across 2 gap items.

- `EmergencyFacet.setEmergencyTimeout` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-emergency-timeout`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyFacet.setResumeDelay` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-resume-delay`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EmergencyWithdrawalFacet

Reduce EmergencyWithdrawalFacet launch blockers across 2 gap items.

- `EmergencyWithdrawalFacet.setRecipientWhitelist` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/set-recipient-whitelist`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EmergencyWithdrawalFacet.updateWithdrawalConfig` (unsafe on live network)
  - Endpoint: `POST /v1/emergency/admin/update-withdrawal-config`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## UpgradeControllerFacet

Reduce UpgradeControllerFacet launch blockers across 1 gap item.

- `UpgradeControllerFacet.setUpgradeControlEnforced` (unsafe on live network)
  - Endpoint: `POST /v1/diamond-admin/admin/set-upgrade-control-enforced`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

