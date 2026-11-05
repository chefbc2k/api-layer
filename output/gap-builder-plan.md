# Gap Builder Plan

Generated: `2026-11-05T07:35:53.274Z`
Source gap report: `2026-11-05T07:35:51.829Z`

## Summary

- Non-ready items in scope: `15`
- Selected this run: `15`

## PaymentFacet

Reduce PaymentFacet launch blockers across 2 gap items.

- `PaymentFacet.withdrawPayments` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/withdraw-payments`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `PaymentFacet.withdrawPaymentsWithDeadline` (needs fixture)
  - Endpoint: `POST /v1/marketplace/commands/withdraw-payments-with-deadline`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## ProposalFacet

Reduce ProposalFacet launch blockers across 3 gap items.

- `ProposalFacet.queue` (needs fixture)
  - Endpoint: `GET /v1/governance/queries/queue`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `ProposalFacet.state` (needs fixture)
  - Endpoint: `GET /v1/governance/queries/state`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `ProposalFacet.VoteCast` (needs indexer proof)
  - Endpoint: `POST /v1/governance/events/vote-cast/query`
  - Required work: Add event-specific indexer/projection proof and replay/idempotency coverage. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:indexer:assurance`

## RightsFacet

Reduce RightsFacet launch blockers across 1 gap item.

- `RightsFacet.getCollaborator` (needs fixture)
  - Endpoint: `GET /v1/licensing/queries/get-collaborator`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`

## TokenSupplyFacet

Reduce TokenSupplyFacet launch blockers across 1 gap item.

- `TokenSupplyFacet.burn` (needs fixture)
  - Endpoint: `DELETE /v1/tokenomics/commands/burn`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VestingFacet

Reduce VestingFacet launch blockers across 2 gap items.

- `VestingFacet.getStandardVestingSchedule` (needs fixture)
  - Endpoint: `GET /v1/tokenomics/queries/get-standard-vesting-schedule`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `VestingFacet.getVestingTotalAmount` (needs fixture)
  - Endpoint: `GET /v1/tokenomics/queries/get-vesting-total-amount`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`

## VoiceAssetFacet

Reduce VoiceAssetFacet launch blockers across 5 gap items.

- `VoiceAssetFacet.getVoiceAssetsByOwner` (needs fixture)
  - Endpoint: `GET /v1/voice-assets/by-owner/:owner`
  - Required work: Add a direct unit or workflow fixture that exercises the read with realistic state. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.
- `VoiceAssetFacet.authorizeUser` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/:voiceHash/authorization-grants`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.safeTransferFrom(address,address,uint256,bytes)` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/tokens/:tokenId/transfers/safe-with-data`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.safeTransferFrom(address,address,uint256)` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/tokens/:tokenId/transfers/safe`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.transferFromVoiceAsset` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/tokens/:tokenId/transfers`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## WhisperBlockFacet

Reduce WhisperBlockFacet launch blockers across 1 gap item.

- `WhisperBlockFacet.registerVoiceFingerprint` (needs fixture)
  - Endpoint: `POST /v1/whisperblock/whisperblocks`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

