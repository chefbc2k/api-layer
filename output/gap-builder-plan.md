# Gap Builder Plan

Generated: `2026-10-25T08:45:35.866Z`
Source gap report: `2026-10-25T08:45:33.336Z`

## Summary

- Non-ready items in scope: `11`
- Selected this run: `11`

## VoiceAssetFacet

Reduce VoiceAssetFacet launch blockers across 4 gap items.

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

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VoiceLicenseFacet

Reduce VoiceLicenseFacet launch blockers across 3 gap items.

- `VoiceLicenseFacet.createLicense` (needs fixture)
  - Endpoint: `POST /v1/licensing/licenses/create-license`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `VoiceLicenseFacet.revokeLicense` (needs fixture)
  - Endpoint: `DELETE /v1/licensing/commands/revoke-license`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.
- `VoiceLicenseFacet.transferLicense` (needs fixture)
  - Endpoint: `POST /v1/licensing/commands/transfer-license`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VoiceLicenseTemplateFacet

Reduce VoiceLicenseTemplateFacet launch blockers across 2 gap items.

- `VoiceLicenseTemplateFacet.setTemplateStatus` (needs fixture)
  - Endpoint: `PATCH /v1/licensing/commands/set-template-status`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.
- `VoiceLicenseTemplateFacet.updateTemplate` (needs fixture)
  - Endpoint: `PATCH /v1/licensing/commands/update-template`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## VoiceMetadataFacet

Reduce VoiceMetadataFacet launch blockers across 1 gap item.

- `VoiceMetadataFacet.updateBasicAcousticFeatures` (needs fixture)
  - Endpoint: `PATCH /v1/voice-assets/:voiceHash/metadata/acoustic-features`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Add explicit unauthorized, stale-state, or replay rejection coverage.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

## WhisperBlockFacet

Reduce WhisperBlockFacet launch blockers across 1 gap item.

- `WhisperBlockFacet.registerVoiceFingerprint` (needs fixture)
  - Endpoint: `POST /v1/whisperblock/whisperblocks`
  - Required work: Add unit, workflow, and negative-path fixtures that preflight the write before mutation. Route the proof through an executable workflow or route-level integration test.

Verification: `pnpm run test:gap-report`, `pnpm run test:gap-builder`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

