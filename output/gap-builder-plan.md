# Gap Builder Plan

Generated: `2026-11-04T08:01:51.215Z`
Source gap report: `2026-11-04T08:01:48.975Z`

## Summary

- Non-ready items in scope: `17`
- Selected this run: `17`

## ProposalFacet

Reduce ProposalFacet launch blockers across 1 gap item.

- `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` (unsafe on live network)
  - Endpoint: `ABI-only`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VoiceMetadataFacet

Reduce VoiceMetadataFacet launch blockers across 4 gap items.

- `VoiceMetadataFacet.setAnalysisVersion` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/set-analysis-version`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceMetadataFacet.updateClassificationCategory` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/update-classification-category`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceMetadataFacet.updateGeographicData` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/update-geographic-data`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceMetadataFacet.updateVoiceClassifications` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/commands/update-voice-classifications`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VotingPowerFacet

Reduce VotingPowerFacet launch blockers across 7 gap items.

- `VotingPowerFacet.setMaxLockDuration` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-max-lock-duration`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VotingPowerFacet.setRoleMultiplier` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-role-multiplier`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VotingPowerFacet.setupInitialVotingPower` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/setup-initial-voting-power`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VotingPowerFacet.setZeroLockDuration` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/set-zero-lock-duration`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VotingPowerFacet.updateLockDuration` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/update-lock-duration`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VotingPowerFacet.updateVotingPower` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/update-voting-power`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VotingPowerFacet.updateVotingPowerBatch` (needs fixture)
  - Endpoint: `PATCH /v1/staking/commands/update-voting-power-batch`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## WhisperBlockFacet

Reduce WhisperBlockFacet launch blockers across 5 gap items.

- `WhisperBlockFacet.revokeAccess` (needs fixture)
  - Endpoint: `DELETE /v1/whisperblock/commands/revoke-access`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `WhisperBlockFacet.setAuditEnabled` (needs fixture)
  - Endpoint: `PATCH /v1/whisperblock/commands/set-audit-enabled`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `WhisperBlockFacet.setOffchainEntropy` (needs fixture)
  - Endpoint: `PATCH /v1/whisperblock/commands/set-offchain-entropy`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `WhisperBlockFacet.setTrustedOracle` (needs fixture)
  - Endpoint: `PATCH /v1/whisperblock/commands/set-trusted-oracle`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `WhisperBlockFacet.updateSystemParameters` (needs fixture)
  - Endpoint: `PATCH /v1/whisperblock/commands/update-system-parameters`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

