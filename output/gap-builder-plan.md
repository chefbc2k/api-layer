# Gap Builder Plan

Generated: `2026-10-27T11:40:19.837Z`
Source gap report: `2026-10-27T11:40:17.723Z`

## Summary

- Non-ready items in scope: `40`
- Selected this run: `16`

## ProposalFacet

Reduce ProposalFacet launch blockers across 1 gap item.

- `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` (unsafe on live network)
  - Endpoint: `ABI-only`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VestingFacet

Reduce VestingFacet launch blockers across 3 gap items.

- `VestingFacet.releaseTokensFor` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/release-tokens-for`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VestingFacet.releaseVestedTokens` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/release-vested-tokens`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VestingFacet.transferVestingSchedule` (needs fixture)
  - Endpoint: `POST /v1/tokenomics/commands/transfer-vesting-schedule`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VoiceAssetFacet

Reduce VoiceAssetFacet launch blockers across 12 gap items.

- `VoiceAssetFacet.approveVoiceAsset` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/approve-voice-asset`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.customizeRoyaltyRate` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/:voiceHash/royalty-rate`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.lockVoiceAsset` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/:voiceHash/lock`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.recordRoyaltyPayment` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/:voiceHash/royalty-payments`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.recordRoyaltyPaymentFrom` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/record-royalty-payment-from`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.recordUsage` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/:voiceHash/usage-records`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.recordUsageFrom` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/commands/record-usage-from`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.revokeUser` (needs fixture)
  - Endpoint: `DELETE /v1/voice-assets/:voiceHash/authorization-grants/:user`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.setDefaultPlatformFee` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-default-platform-fee`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.setDefaultRoyaltyRate` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-default-royalty-rate`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.setRegistrationPaused` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-registration-paused`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceAssetFacet.unlockVoiceAsset` (needs fixture)
  - Endpoint: `POST /v1/voice-assets/:voiceHash/unlock`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

