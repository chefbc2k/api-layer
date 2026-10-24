# Gap Builder Plan

Generated: `2026-10-24T07:22:08.857Z`
Source gap report: `2026-10-24T07:22:07.438Z`

## Summary

- Non-ready items in scope: `80`
- Selected this run: `40`

## AccessControlFacet

Reduce AccessControlFacet launch blockers across 2 gap items.

- `AccessControlFacet.grantRole` (needs fixture)
  - Endpoint: `POST /v1/access-control/admin/grant-role`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `AccessControlFacet.renounceRole` (needs fixture)
  - Endpoint: `DELETE /v1/access-control/commands/renounce-role`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## CommunityRewardsFacet

Reduce CommunityRewardsFacet launch blockers across 5 gap items.

- `CommunityRewardsFacet.claimableAmount` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/queries/claimable-amount`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `CommunityRewardsFacet.createCampaign` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/community-rewards`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `CommunityRewardsFacet.pauseCampaign` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/pause-campaign`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `CommunityRewardsFacet.setMerkleRoot` (needs fixture)
  - Endpoint: `PATCH /v1/tokenomics/commands/set-merkle-root`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `CommunityRewardsFacet.unpauseCampaign` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/unpause-campaign`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## DelegationFacet

Reduce DelegationFacet launch blockers across 1 gap item.

- `DelegationFacet.delegate` (needs fixture)
  - Endpoint: `POST /v1/staking/commands/delegate`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EmergencyFacet

Reduce EmergencyFacet launch blockers across 10 gap items.

- `EmergencyFacet.emergencyResume` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/emergency-resume`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `EmergencyFacet.emergencyStop` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/emergency-stop`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `EmergencyFacet.executeResponse` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/execute-response`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.executeScheduledResume` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/execute-scheduled-resume`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.extendPausedUntil` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/extend-paused-until`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.freezeAssets` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/freeze-assets`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.reportIncident` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/report-incident`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.scheduleEmergencyResume` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/schedule-emergency-resume`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.triggerEmergency` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/trigger-emergency`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `EmergencyFacet.unfreezeAssets` (needs fixture)
  - Endpoint: `POST /v1/emergency/admin/unfreeze-assets`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## EscrowFacet

Reduce EscrowFacet launch blockers across 2 gap items.

- `EscrowFacet.getOriginalOwner` (needs fixture)
  - Endpoint: `GET /v1/marketplace/queries/get-original-owner`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `EscrowFacet.isInEscrow` (needs fixture)
  - Endpoint: `GET /v1/marketplace/queries/is-in-escrow`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`

## LegacyExecutionFacet

Reduce LegacyExecutionFacet launch blockers across 4 gap items.

- `LegacyExecutionFacet.approveInheritance` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/approve-inheritance`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyExecutionFacet.delegateRights` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/delegate-rights`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyExecutionFacet.executeInheritance` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/execute-inheritance`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyExecutionFacet.initiateInheritance` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/legacy/initiate-inheritance`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## LegacyFacet

Reduce LegacyFacet launch blockers across 7 gap items.

- `LegacyFacet.addBeneficiary` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/add-beneficiary`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.addDatasets` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/add-datasets`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.addInheritanceRequirement` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/add-inheritance-requirement`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.addVoiceAssets` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/add-voice-assets`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.createLegacyPlan` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/legacy/create-legacy-plan`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.setBeneficiaryRelationship` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-beneficiary-relationship`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `LegacyFacet.setInheritanceConditions` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-inheritance-conditions`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## LegacyViewFacet

Reduce LegacyViewFacet launch blockers across 1 gap item.

- `LegacyViewFacet.validateBeneficiary` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/queries/validate-beneficiary`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`

## MarketplaceFacet

Reduce MarketplaceFacet launch blockers across 6 gap items.

- `MarketplaceFacet.cancelListing` (needs fixture)
  - Endpoint: `DELETE /v1/marketplace/commands/cancel-listing`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `MarketplaceFacet.listAsset` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/list-asset`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `MarketplaceFacet.pause` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/pause`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `MarketplaceFacet.purchaseAsset` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/purchase-asset`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `MarketplaceFacet.unpause` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/unpause`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `MarketplaceFacet.updateListingPrice` (needs fixture)
  - Endpoint: `PATCH /v1/marketplace/commands/update-listing-price`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## OwnershipFacet

Reduce OwnershipFacet launch blockers across 2 gap items.

- `OwnershipFacet.isOwnershipPolicyEnforced` (needs fixture)
  - Endpoint: `POST /v1/ownership/queries/is-ownership-policy-enforced`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `OwnershipFacet.pendingOwner` (needs fixture)
  - Endpoint: `POST /v1/ownership/queries/pending-owner`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`

