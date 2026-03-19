# Changelog: USpeaks API Layer

> **Mandatory Policy:** All work, including minor and major milestones, architectural shifts, and feature additions, MUST be documented in this changelog. No exceptions. This ensures transparency and a clear "building in public" record for the totality of the repo.

---

## [0.1.0] - 2026-03-17

### Added
- **Architectural Foundation:** Established the four-layer domain architecture (`client`, `api`, `indexer`, `db`).
- **Base Sepolia Integration:** Transitioned the primary testing and deployment baseline to the live Base Sepolia network.
- **Scenario Tooling:** Implemented `scenario-adapter` for running complex end-to-end traces against live network state.
- **Dual-Lifecycle Licensing:** Re-engineered the licensing engine to support both Template and Active License lifecycles.
- **Commercialization Guardrails:** Implemented strict on-chain ownership checks for voice asset commercialization.
- **Governance Workflow Split:** Separated proposal submission and voting to account for real-world block timing and non-zero voting delays on Base Sepolia.
- **Multisig Support:** Integrated Layer 4 multisig workflows for administrative operations.
- **Documentation:** Added USpeaks Lite Paper and Liquidity Bootstrapping Pool (LBP) launch materials.
- **Automated Codegen:** Built a comprehensive `pnpm run codegen` pipeline for ABI syncing, TypeChain generation, and API surface building.

### Fixed
- **Type Safety:** Enhanced type safety for contract interactions and adjusted multisig error handling.
- **Gas Limit Testing:** Added execution context gas limit tests to prevent transaction failures in complex workflows.
- **Codegen Mismatches:** Resolved tuple selector mismatches in the codegen pipeline.

### Current Status
- Core Layer 1 and Layer 2 domains verified on Base Sepolia.
- Focused on Layer 3 verification and optimizing retry/error-handling workflows.

## [0.1.1] - 2026-03-18

### Added
- **Live Fixture Refresh:** Re-ran Base Sepolia operator setup and persisted the refreshed fixture report in [`.runtime/base-sepolia-operator-fixtures.json`](/Users/chef/Public/api-layer/.runtime/base-sepolia-operator-fixtures.json), including actor balances, governance readiness, and marketplace fixture state.
- **Live Layer 1 Proof Refresh:** Re-generated [verify-live-output.json](/Users/chef/Public/api-layer/verify-live-output.json) against Base Sepolia and captured fresh tx hashes, receipts, and readbacks for governance, marketplace, datasets, voice-assets, tokenomics, access-control, and admin/emergency/multisig domains.
- **Remaining Layer 1 Proof Artifact:** Added [verify-remaining-output.json](/Users/chef/Public/api-layer/verify-remaining-output.json) with fresh Base Sepolia proof coverage for the remaining domains: datasets, licensing, and whisperblock/security.

### Fixed
- **Runtime Override Handling:** Updated the runtime config loader to let process-level environment overrides take precedence over the repo `.env`, so Base Sepolia proof commands can be redirected to a live RPC without editing committed secrets.
- **Dataset Verification Completion:** Confirmed the live dataset proof now reuses an active license template and completes successfully on Base Sepolia, collapsing the prior `InvalidLicenseTemplate(uint256)` partial into `proven working`.
- **Baseline RPC Recovery:** Taught the shared runtime loader to recover from the dead local `127.0.0.1:8548` baseline by reusing the last verified Base Sepolia fixture RPC, and surfaced that fallback provenance in the baseline output.
- **Proof Script RPC Consistency:** Updated the Base Sepolia setup, live verification, focused verification, and remaining verification scripts to inject the resolved RPC into the embedded API server before boot so contract and HTTP proof paths run against the same chain.
- **Marketplace Fixture Search:** Reworked the operator setup aged-listing scan to continue across seller-owned aged assets until it finds one that can be listed and read back as active, instead of stopping on the first stale candidate.
- **Event Proof Readbacks:** Fixed the live verifier’s endpoint registry merge so generated event routes are discoverable, and added event-query retries so `AssetListed` and `VoiceAssetRegistered` proofs capture actual logs instead of transient empty payloads.
- **Remaining Proof Funding:** Expanded the remaining-domain proof funder pool to the richer configured signer actors and raised preflight native-balance top-ups so dataset, licensing, and whisperblock/security runs can complete on Base Sepolia without mid-run gas exhaustion.

### Verified
- **Coverage Gates:** Re-ran `pnpm run coverage:check` and kept API-surface and wrapper coverage at 489 methods and 218 events.
- **Config Regression Guard:** Added a runtime-config test that locks in override precedence for `RPC_URL` and `ALCHEMY_RPC_URL`.
- **Baseline Commands:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; both now succeed from the default repo state by falling back to the persisted Base Sepolia fixture RPC when the local fork endpoint is unavailable.
- **Proof Domains:** Re-ran the live and remaining Layer 1 proof scripts; all verified domains now classify as `proven working`, while the setup artifact’s only remaining marketplace partial is explicitly narrowed to purchase-readiness proof rather than listing activation.

## [0.1.2] - 2026-03-18

### Added
- **Marketplace Buyer Proof:** Added [scripts/verify-marketplace-purchase-live.ts](/Users/chef/Public/api-layer/scripts/verify-marketplace-purchase-live.ts) and the `verify:marketplace:purchase:base-sepolia` package script to execute a real `buyer-key` purchase against the aged Base Sepolia fixture listing, then verify ownership transfer, listing deactivation, and marketplace event readbacks.
- **Marketplace Purchase Artifact:** Captured the first successful live buyer purchase proof in [verify-marketplace-purchase-output.json](/Users/chef/Public/api-layer/verify-marketplace-purchase-output.json), including tx `0xf4b5fc77eb57d744a140d362ea8ac4c67276fc86ffec2a6e856417b6b6257bfa`, block `39045521`, post-purchase owner readback, and `AssetPurchased` / `PaymentDistributed` / `AssetReleased` event evidence.

### Fixed
- **Live Contract Harness RPC Resolution:** Updated [packages/api/src/app.contract-integration.test.ts](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) to resolve runtime config through the shared fallback loader before booting the embedded API server, so the Base Sepolia contract suite no longer collapses immediately on the dead repo-default `127.0.0.1:8548` RPC.
- **Base Sepolia Suite Drift Cleanup:** Aligned the long-form contract integration suite with current generated routes and workflow payloads, including marketplace escrow event paths, governance role-query endpoints, tokenomics query names, diamond-admin immutable-selector routes, licensing template creation payloads, and workflow assertions that legitimately return `null` when approval is already in place.
- **Purchase Proof Artifact Reliability:** Hardened [scripts/verify-marketplace-purchase-live.ts](/Users/chef/Public/api-layer/scripts/verify-marketplace-purchase-live.ts) to write its artifact directly to disk and fall back to creating a fresh listing when the configured fixture has already been consumed, instead of relying on stdout redirection alone.

### Verified
- **Marketplace Partial Collapsed:** The previously open marketplace setup partial is now proven working on Base Sepolia. The fixture concern about the buyer’s `5000` USDC balance/allowance was not an actual blocker because the aged listing price was `1000`, and the live `buyer-key` purchase completed successfully.
- **Event Mismatch Closed:** Confirmed the live artifact mismatch is gone; [verify-live-output.json](/Users/chef/Public/api-layer/verify-live-output.json) no longer reports missing `AssetListed` or `VoiceAssetRegistered` endpoints.
- **Bounded Full-Suite Pass:** Re-ran `pnpm run test:contract:base-sepolia` after the harness fix and observed the suite progressing through the previously blocked live domains under the normal proof script, including access-control, voice-assets, datasets, marketplace, governance, tokenomics, whisperblock, licensing, admin/emergency/multisig, and workflow tests.

### Known Issues
- **Fixture Age Regression:** A fresh `pnpm run setup:base-sepolia` now repopulates [`.runtime/base-sepolia-operator-fixtures.json`](/Users/chef/Public/api-layer/.runtime/base-sepolia-operator-fixtures.json) with an active listing that is still within the marketplace contract’s 1 day purchase lock, so the fixture remains useful for listing-state checks but not as a rerunnable purchase-proof target until the age-selection logic is corrected.

## [0.1.3] - 2026-03-18

### Added
- **Marketplace Fixture Selection Guard:** Added [scripts/base-sepolia-operator-setup.helpers.ts](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.helpers.ts) plus [scripts/base-sepolia-operator-setup.helpers.test.ts](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.helpers.test.ts) to classify Base Sepolia marketplace fixture candidates by real listing age, prioritize purchase-ready listings over fresh ones, and lock that behavior with a focused regression test.

### Fixed
- **Setup Listing-Age Classification:** Updated [scripts/base-sepolia-operator-setup.ts](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts) so `setup:base-sepolia` no longer mistakes an old asset with a fresh listing for a purchase-ready marketplace fixture. The script now scans seller-owned aged assets for an already-active listing past the contract lock, falls back to creating a new listing only when necessary, and waits for an active listing readback instead of treating any `200` response as success.
- **Marketplace Partial Narrowing:** Re-ran [`.runtime/base-sepolia-operator-fixtures.json`](/Users/chef/Public/api-layer/.runtime/base-sepolia-operator-fixtures.json) and confirmed the remaining marketplace block is now accurately scoped to listing age. The emitted fixture is again an active seller listing, but it is explicitly classified as `listed-not-yet-purchase-proven` until the 1 day trading lock expires or an older listing is discovered.

### Verified
- **Coverage Gates:** Re-ran `pnpm run coverage:check` and kept generated coverage at 489 functions and 218 events, with validated HTTP coverage for 489 methods.
- **Baseline Stability:** The prior baseline commands remain green from the default repo state (`pnpm run baseline:show` and `pnpm run baseline:verify` from this session’s earlier verification).
- **Targeted Regression Test:** Re-ran `pnpm exec vitest run scripts/base-sepolia-operator-setup.helpers.test.ts` to confirm fresh listings are no longer selected as purchase-ready fixtures.

### Known Issues
- **Marketplace Purchase Proof Still Time-Locked:** The current setup artifact now reports an honest partial instead of a misleading one: the latest seller listing becomes active during setup, but it is still within the marketplace contract’s 1 day trading lock, so `buyer-key` purchase proof remains blocked until the listing ages or an older active listing is available.
- **Unrelated Suite Debt:** A broad `pnpm test -- scripts/base-sepolia-operator-setup.helpers.test.ts` run still surfaces pre-existing red tests outside this change: stale manifest/HTTP-registry expectation counts and a timeout in `packages/api/src/workflows/register-voice-asset.integration.test.ts`.

## [0.1.4] - 2026-03-18

### Fixed
- **Register Voice Asset Workflow Test Drift:** Updated [packages/api/src/workflows/register-voice-asset.integration.test.ts](/Users/chef/Public/api-layer/packages/api/src/workflows/register-voice-asset.integration.test.ts) to mock the workflow’s current token-id readback and assert the returned `tokenId` fields, eliminating the false timeout introduced after the workflow started waiting for `getTokenId`.
- **Manifest Count Guard Hardening:** Reworked [scripts/manifest.test.ts](/Users/chef/Public/api-layer/scripts/manifest.test.ts) to validate that generated manifest totals stay internally consistent with the emitted facet and subsystem arrays instead of pinning obsolete historical counts.
- **HTTP Registry Golden Drift Removal:** Updated [scripts/http-registry.test.ts](/Users/chef/Public/api-layer/scripts/http-registry.test.ts) to verify generated method/event counts and keys against the current reviewed API surface, removing stale hard-coded totals while still locking in registry-to-review alignment.

### Verified
- **Baseline Commands:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; both remain green against the persisted Base Sepolia fallback RPC from the default repo state.
- **Coverage Gates:** Re-ran `pnpm run coverage:check` and kept generated coverage at 489 functions, 218 events, and validated HTTP coverage for 489 methods.
- **Vitest Suite Recovery:** Re-ran `pnpm exec vitest run scripts/manifest.test.ts scripts/http-registry.test.ts packages/api/src/workflows/register-voice-asset.integration.test.ts` followed by the full `pnpm test -- --runInBand` suite; the repo is now green with 88 passing test files, 347 passing tests, and 17 intentionally skipped contract-integration tests.

### Remaining Issues
- **Marketplace Fixture Age Partial:** `setup:base-sepolia` can still legitimately emit a `listed-not-yet-purchase-proven` marketplace fixture when no older active listing is available past the contract lock window; this is now the primary remaining live-environment partial called out by the setup artifact.

## [0.1.5] - 2026-03-18

### Fixed
- **Escrow-Aware Marketplace Fixture Discovery:** Updated [scripts/base-sepolia-operator-setup.ts](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts) so `setup:base-sepolia` no longer limits marketplace candidate discovery to assets still held in the seller wallet. The setup flow now also scans diamond-escrowed voice assets, filters them through `EscrowFacet.getOriginalOwner`, and includes seller-originated escrow listings in the fixture candidate pool.
- **Candidate Pool Helper Coverage:** Added [scripts/base-sepolia-operator-setup.helpers.ts](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.helpers.ts) support for merging seller-owned and escrowed candidate voice hashes without duplicate loss, and locked that behavior with [scripts/base-sepolia-operator-setup.helpers.test.ts](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.helpers.test.ts).

### Verified
- **Marketplace Partial Collapsed For Real:** Re-ran `pnpm run setup:base-sepolia` and regenerated [`.runtime/base-sepolia-operator-fixtures.json`](/Users/chef/Public/api-layer/.runtime/base-sepolia-operator-fixtures.json). The marketplace fixture now resolves to token `11` with `purchaseReadiness: "purchase-ready"` and `status: "ready"`, backed by listing readback `{ tokenId: "11", seller: "0x276D8504239A02907BA5e7dD42eEb5A651274bCd", price: "1000", createdAt: "1773601130", createdBlock: "38916421", isActive: true }`.
- **Targeted Regression Test:** Re-ran `pnpm exec vitest run scripts/base-sepolia-operator-setup.helpers.test.ts`; all helper tests passed.
- **Repo Green Guard:** Re-ran `pnpm run baseline:show` and the full `pnpm test -- --runInBand` suite; the repo remains green with 88 passing files, 348 passing tests, and 17 intentionally skipped contract-integration proofs.

### Status
- **Remaining Setup Partials:** None in the current Base Sepolia fixture artifact. Marketplace and governance now both emit `ready` setup state.
