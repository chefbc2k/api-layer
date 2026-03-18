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

### Fixed
- **Runtime Override Handling:** Updated the runtime config loader to let process-level environment overrides take precedence over the repo `.env`, so Base Sepolia proof commands can be redirected to a live RPC without editing committed secrets.
- **Dataset Verification Completion:** Confirmed the live dataset proof now reuses an active license template and completes successfully on Base Sepolia, collapsing the prior `InvalidLicenseTemplate(uint256)` partial into `proven working`.

### Verified
- **Coverage Gates:** Re-ran `pnpm run coverage:check` and kept API-surface and wrapper coverage at 489 methods and 218 events.
- **Config Regression Guard:** Added a runtime-config test that locks in override precedence for `RPC_URL` and `ALCHEMY_RPC_URL`.
