# API Testing And Red-Team Roadmap

This document is the master tracking file for the API assurance automation. Daily automation runs must update this file with status, evidence, remaining gaps, and merge readiness for each section.

## Current State

This repo has strong mechanical and behavioral coverage for the API layer that sits on top of the USpeaks smart contracts.

- ABI/client wrapper coverage is complete for `33` facets, `492` functions, and `218` events.
- HTTP surface generation is complete for `491` generated endpoints across access control, tokenomics, staking, diamond admin, emergency, marketplace, governance, voice assets, multisig, ownership, licensing, datasets, and WhisperBlock.
- Standard TypeScript coverage currently reports `99.98%` lines, `99.98%` statements, `99.95%` branches, and `100%` functions across the measured API/client/indexer/script surface; the residual merged-Istanbul mappings are confined to already-exercised execution-context and Alchemy diagnostic lines.
- Existing Base Sepolia/local-fork proof artifacts classify the tracked live proof domains as `proven working`, with no current `blocked by setup/state`, `semantically clarified but not fully proven`, or `deeper issue remains` statuses.
- Existing live proof scripts cover governance submission/voting, marketplace purchase settlement, remaining mounted workflow routes, and focused/completion proof slices.

The important caveat: complete generated API coverage is not the same as complete protocol assurance. The next phase should treat the ABI buildout as the inventory engine, then require each contract capability to carry proof across correctness, authorization, economic safety, state transitions, event/indexer projection, and adversarial behavior.

## What Has Been Tested Well

The current suite is strongest in these areas:

- API route generation and ABI parity: every reviewed contract method is represented in the generated HTTP surface, except the intentionally excluded legacy/overloaded proposal variant in the HTTP coverage gate.
- TypeChain-first wrapper parity: generated wrappers and RPC registries are checked against the ABI manifest.
- API runtime behavior: auth, validation, rate limiting, route factory behavior, transaction storage, execution context, provider routing, ABI encoding/decoding, and diagnostics all have direct unit coverage.
- Workflow correctness through mocked or local execution contexts: voice asset registration, transfers, marketplace listing/purchase/cancel/update/withdrawal, licensing templates, collaborator licensing, datasets, reward campaigns, vesting, staking/delegation, governance, multisig protocol changes, emergency response, legacy migration, and WhisperBlock workflows are covered.
- Live/local-fork proof paths: tracked verification artifacts show green proof runs for governance, marketplace purchase settlement, remaining route groups, and full HTTP contract integration.
- Economic settlement checks in the marketplace purchase proof: buyer balance/allowance decreases and seller/treasury/dev-fund/union-treasury deltas are asserted in the artifact.

## What Still Needs Deeper Testing

These are not necessarily failing areas. They are the gaps between "covered" and "ready to trust under pressure."

1. Per-ABI invariant matrix
   - Generate a machine-readable inventory from the ABI manifest where every write method is assigned expected invariants, required actor roles, affected balances, emitted events, and state readbacks.
   - Track proof status per function as `unit`, `workflow`, `local-fork`, `Base Sepolia`, `negative-path`, `economic`, `red-team`, and `indexer`.

2. Actor and permission abuse
   - For every write endpoint, test founder/admin/operator/buyer/seller/licensee/collaborator/read-only/unknown-key behavior.
   - Prove unauthorized users cannot commercialize, list, transfer, mint, vote, upgrade, pause, recover, withdraw, or mutate ownership-controlled state.
   - Add tests for stale role membership, revoked roles, expired validity windows, default admin edge cases, and actor/API-key signer mismatches.

3. Economic invariants
   - Expand beyond the current purchase proof into every value-moving path: escrow release, marketplace withdrawal, reward claiming, vesting release/revoke, burn/mint/supply changes, staking/delegation, payment splits, treasury revenue movement, and emergency withdrawal.
   - Assert conservation of balances before/after each workflow, including fees, rounding, repeat calls, partial state, and failed transaction side effects.
   - Add "double spend" and replay attempts for purchases, claims, withdrawals, signatures, governance execution, and recovery actions.

4. Live-network completeness
   - The tracked artifacts prove selected domains, not every generated endpoint on Base Sepolia.
   - Add a live proof runner that consumes the ABI/API inventory and executes all safe reads plus all fixture-backed writes on a local fork first, then Base Sepolia where state and funds are available.
   - Separate destructive/admin live tests behind explicit flags so they can run safely against a fork by default.

5. Event and indexer proof depth
   - For each write workflow, prove the expected event is emitted, decoded by the client registry, ingested by the indexer, projected into Postgres/Supabase, and idempotent across replays.
   - Add reorg simulations, duplicate log ingestion, partial block failure, delayed RPC responses, and projection rollback checks.

6. End-to-end user journeys
   - Build scenario packs for realistic user stories: create voice clip, license it, commercialize it, package dataset, list for sale, buy from another user, settle proceeds, transfer ownership, revoke/expire permissions, and inspect all state after each step.
   - Each scenario should include at least one happy path, one unauthorized path, one replay path, and one state-corruption/partial-failure path.

7. Red-team and adversarial testing
   - Add a red-team suite that mutates request payloads, signer mappings, API keys, deadlines, prices, token IDs, calldata, signatures, role IDs, nonces, timestamps, and RPC responses.
   - Probe for confused-deputy bugs where the API signs with one wallet while the user identity implies another.
   - Probe for stale reads, event spoof assumptions, missing receipt checks, simulator/pass mismatch, and transaction replacement/reorg behavior.
   - Probe admin endpoints for unsafe diamond cuts, selector collisions, malicious init contracts, emergency pause bypasses, timelock bypasses, and multisig threshold mistakes.

8. Automation and reporting
   - Create a single command that regenerates ABI artifacts, validates wrapper/API parity, provisions funded actors and fixtures, runs local fork proofs, runs gated Base Sepolia proofs, runs red-team probes, and emits a persistent gap report.
   - The report should list every facet/function/event with proof depth and classify each remaining item as `ready`, `needs fixture`, `unsafe on live network`, `needs contract change`, `needs API guard`, or `needs indexer proof`.

## Proposed Automation Phases

### Phase 1: Inventory And Gap Report

Build `scripts/generate-test-roadmap.ts`.

Status: **Complete and verified for merge on 2026-08-09.** The generator attributes evidence conservatively from the generated contract/RPC/HTTP inventories, reviewed API surface, protocol tests, and persisted verify outputs without calling the chain. It preserves duplicate ABI event declarations as distinct occurrences, records evidence paths for every proof flag, and emits both machine-readable and human-readable reports.

Inputs:
- `generated/manifests/contract-manifest.json`
- `generated/manifests/http-endpoint-registry.json`
- `generated/manifests/rpc-method-registry.json`
- `reviewed/reviewed-api-surface.json`
- existing `*.test.ts` files
- existing `verify-*-output.json` artifacts

Output:
- `output/api-test-gap-report.json`
- `output/api-test-gap-report.md`

This phase should not call the chain. It should answer exactly what is covered, what is only mechanically generated, and where deeper proof is missing.

### Phase 2: Local-Fork Proof Orchestrator

Build a deterministic local-fork runner that:
- starts or validates the configured loopback fork
- provisions users, funds, approvals, roles, fixtures, and aged listings
- runs every safe read
- runs every write with pre-state, tx, receipt, event, and post-state assertions
- records failures as structured gaps rather than ad hoc logs

This should be the default destructive test environment.

### Phase 3: Base Sepolia Proof Runner

Promote the local-fork scenarios that are safe and funded into Base Sepolia proof runs.

The Base Sepolia runner should:
- refuse to run without explicit `.env` readiness
- avoid destructive protocol-admin writes unless flagged
- consume existing setup helpers for new users, test funds, allowances, listings, and governance readiness
- persist evidence with tx hashes, block numbers, actors, state deltas, decoded events, and final classifications

### Phase 4: Red-Team Harness

Add adversarial test generators around:
- authorization and signer confusion
- replay/double spend
- value conservation
- state-machine ordering
- malformed calldata and ABI edge cases
- RPC/provider lies and stale state
- event/indexer inconsistencies
- diamond upgrade and admin controls

The red-team suite should run heavily on local fork and selectively on Base Sepolia only for non-destructive probes.

### Phase 5: CI Gate

Add a CI-safe command such as `pnpm run verify:assurance`.

Suggested command composition:
- `pnpm run codegen`
- `pnpm run coverage:check`
- `pnpm run test:coverage`
- `pnpm run test:contract:api:base-sepolia` when enabled
- `pnpm run verify:marketplace:purchase:base-sepolia` when enabled
- `pnpm run verify:governance:base-sepolia` when enabled
- `pnpm run redteam:local-fork`
- `pnpm run report:test-gaps`

## Priority Order

1. Build the ABI/API test gap report generator.
2. Add per-write method invariant metadata.
3. Expand actor/permission negative-path tests for all write endpoints.
4. Expand economic balance-delta assertions beyond marketplace purchase.
5. Add event-to-indexer projection proofs for each write workflow.
6. Build the local-fork full scenario orchestrator.
7. Promote safe and funded scenarios to Base Sepolia.
8. Add red-team mutation/fuzz suites.
9. Add CI gates and persistent reports.

## Automation Tracking

Daily automations should treat these sections as independently mergeable workstreams. A workstream can be merged into `master` only after implementation is complete, relevant tests/proof commands pass, generated artifacts are updated, and this master file records the evidence.

### Actor Negative-Path Automation Run — 2026-08-11

- **Current-master audit found no actor or signer coverage drift:** the regenerated report still covers all `259` mounted HTTP writes across `13` domains, with `1,813` founder/admin/operator/buyer/seller/licensee/collaborator cases, `777` unknown-key/read-only/signer-mismatch boundary cases, and `3,171` missing/stale/revoked/expired/ownership/self/protocol-role mismatch cases.
- **Focused authorization evidence remains complete:** `pnpm run test:actor-negative-paths` passed `100/100`, including exhaustive write-endpoint preflight coverage and fail-closed unknown-key, read-only-key, API-key/signer, direct-request wallet, stale-role, revoked-role, and expired-validity behavior.
- **Workflow and repository gates passed:** `pnpm test` passed all `1,300` active tests across `132` files, with only `23` explicitly gated contract/local-fork tests skipped. With `pnpm` selected from `pnpm-lock.yaml`, the ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed.
- **Surface and measured coverage stayed green:** the build-embedded and explicit `pnpm run coverage:check` runs reported `492` wrapper functions, `218` events, `492` HTTP methods, and `260/260` write invariants. `pnpm run test:coverage` passed at `99.96%` statements, `99.93%` branches, `99.92%` functions, and `99.98%` lines.
- **Merge decision:** complete and verified for merge; regeneration changed only the persisted actor-report timestamps, and no actor/signer blocker or implementation change is required on the current mounted write inventory.

### Write-Invariant Metadata Automation Run — 2026-08-11

- **Current-master audit found no ABI or metadata drift:** the reviewed catalog still covers all `260` mounted ABI write methods across `31` facets, with structured actor/role, precondition, post-state readback, event, balance, replay, live-network safety, and indexer expectations for every write.
- **Fail-closed validation remains complete:** `pnpm run test:write-invariants` passed `5/5`, including missing and stale method detection, signature drift, incomplete sections, invalid modes, stale read/event references, inconsistent indexer expectations, and the repository-level `260/260` assertion.
- **Generator and quality gates passed:** with `pnpm` selected from `pnpm-lock.yaml`, the ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed. Build-time codegen and the explicit `pnpm run coverage:check` both reported `492` wrapper functions, `218` events, `492` HTTP methods, and `260/260` write invariants.
- **Measured coverage and regeneration stayed clean:** `pnpm run test:coverage` passed at `99.98%` statements, `99.95%` branches, `100%` functions, and `99.98%` lines. Neither `reviewed/reviewed-write-invariants.json` nor `generated/manifests/write-invariant-registry.json` changed; the reviewed API surface's transient timestamp was restored rather than committed as non-semantic churn.
- **Merge decision:** complete and verified for merge; no blocker or follow-up metadata addition is required on the current ABI inventory.

### ABI Gap Report Automation Run — 2026-08-11

- **Current-master audit found no ABI, API, or proof-classification drift:** `pnpm run report:test-gaps` regenerated the persistent JSON and Markdown reports from the canonical manifests, reviewed surface, protocol tests, and verify artifacts. The inventory remains `33` facets, `492` functions, and `218` event occurrences (`710` items), with `709` reviewed HTTP entries and red-team evidence attributed to `29` items.
- **Proof depth and gap classifications remain stable:** the report still classifies `223` items as `ready`, `223` as `needs fixture`, `51` as `unsafe on live network`, and `213` as `needs indexer proof`, with zero `needs contract change` or `needs API guard` findings.
- **Focused, repository, and coverage tests passed:** `pnpm run test:gap-report` passed `4/4`; `pnpm test` passed `1,300/1,300` active tests across `132` files with `23` explicitly gated tests skipped; and `pnpm run test:coverage` passed at `99.96%` statements, `99.93%` branches, `99.92%` functions, and `99.98%` lines.
- **Quality and surface gates passed:** with `pnpm` selected from `pnpm-lock.yaml`, the ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed. The build-embedded and explicit `pnpm run coverage:check` runs reported `492` wrapper functions, `218` events, `492` HTTP methods, and `260/260` write invariants.
- **Merge decision:** the section remains complete and verified for merge; regeneration changed only persisted generation timestamps and documentation, and no implementation blocker or follow-up generator change is required on the current inventory.

### Red-Team Harness Automation Run — 2026-08-10

- **Current-master audit found no mutation or oracle drift:** `pnpm run test:redteam` passed `103/103`, preserving deterministic valid-value generation and `1,914` invalid mutations across all `521` inputs on the `259` mounted HTTP writes, plus replay, value-conservation, state-ordering, signer-confusion, stale-RPC, diamond-admin, timelock, multisig, and emergency-control detectors.
- **Guarded local-fork probes remain complete:** `pnpm run redteam:local-fork` passed `135/135` across `9` files. The `5/5` real loopback probes rejected malformed/unknown calldata, prevented a signed-transaction replay from transferring value twice, rejected an unprivileged selector-collision cut with a malicious initializer, preserved emergency state against unauthorized stop/resume and early timelock attempts, and detected stale fork responses.
- **Relevant workflow and indexer coverage passed in the same gate:** emergency, governance/timelock, multisig, duplicate-log, event-decode, and reorg suites all remained green. The suite started or reused only a loopback fork, snapshot/revert cleanup completed, and no live-network destructive path was enabled.
- **Quality, surface, and measured coverage gates passed:** with `pnpm` selected from `pnpm-lock.yaml`, the ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed. The explicit `pnpm run coverage:check` reported `492` wrapper functions, `218` events, `492` HTTP methods, and `260/260` write invariants; `pnpm run test:coverage` passed at `99.96%` statements, `99.93%` branches, `99.92%` functions, and `99.98%` lines.
- **Reporting and merge decision:** `pnpm run report:test-gaps` refreshed the persistent reports without proof-depth or classification drift; red-team evidence remains attributed to `29` ABI items. The workstream is complete and verified for merge, with no implementation blocker on current master.

### Local-Fork Automation Run — 2026-08-10

- **Current-master audit found no orchestrator or safety drift:** `pnpm run test:local-fork-runner` passed `9/9`, preserving deterministic stage order, structured gap collection, loopback-default execution, and the two explicit acknowledgements required for destructive/admin live runs.
- **A fresh cold proof passed every stage on its first attempt:** `pnpm run verify:local-fork -- --continue-on-gap` started its own pruned loopback fork and passed all `9/9` stages. Fixture setup funded founder/seller/buyer/licensee/transferee actors, provisioned buyer USDC balance and allowance, validated governance readiness, and produced a purchase-ready listing aged by `86,401` fork seconds.
- **Write and lifecycle artifacts remain proven:** the HTTP contract proof passed `18/18`; core, completion, remaining-lifecycle, marketplace-purchase, and governance artifacts all report `proven working`. The marketplace proof records the `4000 -> 3000` buyer balance and allowance deltas with successful receipt and purchase/payment/release events, while governance reached active state and persisted successful proposal and vote transactions.
- **Exhaustive state gaps remain correctly structured:** the final sweep attempted all `232` reviewed reads and `214` event routes, passed `430/446`, and emitted the same `16` `needs fixture` records with zero runner failures or generic proof gaps. The aggregate report records local-fork mode, a runner-started fork, and both live-network acknowledgement flags as `false`.
- **Quality and coverage gates passed:** with `pnpm` selected from `pnpm-lock.yaml`, the ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed. The build-embedded and explicit `pnpm run coverage:check` runs reported `492` wrapper functions, `218` events, `492` HTTP methods, and `260/260` write invariants; regeneration produced no semantic artifact changes.
- **Merge decision:** complete and verified for merge; no implementation change or blocker was found on current master.

### Write-Invariant Metadata Automation Run — 2026-08-10

- **Current-master audit found no ABI or metadata drift:** the reviewed catalog still covers all `260` mounted ABI write methods across `31` facets, with structured actor/role, precondition, post-state readback, event, balance, replay, live-network safety, and indexer expectations for every write.
- **Fail-closed validation remains complete:** `pnpm run test:write-invariants` passed `5/5`, including missing and stale method detection, signature drift, incomplete sections, invalid modes, stale read/event references, inconsistent indexer expectations, and the repository-level `260/260` assertion.
- **Generator and quality gates passed:** the ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed. Build-time codegen and the explicit `pnpm run coverage:check` both reported `492` wrapper functions, `218` events, `492` HTTP methods, and `260/260` write invariants.
- **Regeneration was semantically clean:** neither `reviewed/reviewed-write-invariants.json` nor `generated/manifests/write-invariant-registry.json` changed. The reviewed API surface's transient generation timestamp was restored rather than committed as non-semantic churn.
- **Merge decision:** complete and verified for merge; no blocker or follow-up metadata addition is required on the current ABI inventory.

### Actor Negative-Path Automation Run — 2026-08-10

- **Current-master audit found no actor or signer coverage drift:** the regenerated report still covers all `259` mounted HTTP writes across `13` domains, with `1,813` founder/admin/operator/buyer/seller/licensee/collaborator cases, `777` unknown-key/read-only/signer-mismatch boundary cases, and `3,171` missing/stale/revoked/expired/ownership/self/protocol-role mismatch cases.
- **Focused authorization evidence remains complete:** `pnpm run test:actor-negative-paths` passed `100/100`, including exhaustive write-endpoint preflight coverage and fail-closed unknown-key, read-only-key, API-key/signer, direct-request wallet, stale-role, revoked-role, and expired-validity behavior.
- **Workflow and repository gates passed:** `pnpm test` passed all `1,300` active tests across `132` files, with only `23` explicitly gated contract/local-fork tests skipped. The ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` sequence passed, followed by a green explicit `pnpm run coverage:check` at `492` functions, `218` events, `492` HTTP methods, and `260/260` write invariants.
- **Merged coverage stayed green:** `pnpm run test:coverage` passed at `99.96%` statements, `99.93%` branches, `99.92%` functions, and `99.98%` lines; shared API authorization remains fully covered.
- **Merge decision:** complete and verified for merge; regeneration changed only the persisted actor-report timestamp, and no actor/signer blocker or implementation change is required on the current mounted write inventory.

### Local-Fork Automation Run — 2026-08-09

- **Deterministic cold runner completed:** `pnpm run verify:local-fork -- --continue-on-gap` completed from fork startup through the final exhaustive sweep with all `9/9` stages passing on their first attempt. Fixture setup funded founder/seller/buyer/licensee/transferee actors, provisioned buyer USDC balance and allowance, validated governance roles/votes, and produced a purchase-ready listing aged by `86,401` fork seconds.
- **State, transaction, receipt, event, and settlement evidence persisted:** the HTTP contract proof passed `18/18`; core (`8` domains / `30` routes / `36` evidence records), completion (`1` / `5` / `7`), remaining lifecycle (`3` / `36` / `36`), marketplace purchase (`1` / `5` / `5`), and governance (`1` / `6` / `3`) artifacts all report `proven working`. The purchase proof records the `4000 -> 3000` buyer balance and allowance deltas, successful receipt, ownership/escrow transition, and decoded purchase/payment/release events.
- **Exhaustive reads use lifecycle fixtures:** the safe-read sweep now runs after lifecycle proofs and reuses campaign, proposal, dataset, template, license, and fingerprint identifiers. The final cold artifact attempted all `232` reviewed reads and `214` event routes, passed `430/446`, and emitted `16` structured `needs fixture` records with zero generic proof gaps; the residual records require an active queue item, rights group, upgrade operation, or vesting schedule and are preserved as machine-readable state gaps rather than runner failures.
- **Disk exhaustion and stale assertions resolved:** auto-started Anvil now uses bounded `--prune-history 512`, preventing the multi-gigabyte historical-state spill during governance block advancement. Current HTTP behavior is locked at `400` for invalid royalty input and `403` for read-only write attempts.
- **Safety and verification:** loopback remains the default. Any live run requires `--allow-live`; destructive/admin live stages additionally require `--allow-live-destructive`. `pnpm run test:local-fork-runner` passes `9/9`; the startup/API regression slice passes `60/60`; and the complete runner regenerated coverage at `492` functions, `218` events, `492` HTTP methods, and `260/260` write invariants. The ordered `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build` gates pass, followed by a green explicit `pnpm run coverage:check`.
- **Merge decision:** complete and merge-ready. The `needs fixture` records are the orchestrator's required structured gap output and do not represent incomplete runner stages.

### Local-Fork Automation Run — 2026-08-04

- **Branch alignment and hardening:** merged local `master` into `codex/local-fork-automation`, preserved all upstream actor/write-invariant gates, switched exhaustive probe keys to `read-only`, added valid beneficiary-share inputs, and made known missing-record responses classify as structured `needs fixture` gaps.
- **Governance blocker resolved:** local-fork activation now mines two blocks past the initial snapshot boundary and continues advancing if the proposal is still pending. A bounded fresh-fork proof submitted proposal `40` in tx `0x8902d995109a44aa58802b067a1ff50818782bbf9e175b99bb7d6a026911b1e1`, reached active state `1` at block `45052563` after snapshot `45052561`, and voted in tx `0xaddb425f50c4a4dfa0834c7fe3eb39e1fa65e997fef5428fdc9d3621adef2143`; the refreshed governance artifact is `proven working` with `3` evidence records.
- **Focused verification:** `pnpm run test:local-fork-runner` passes `8/8`; `pnpm vitest run scripts/verify-governance-workflows.test.ts --maxWorkers 1` passes `4/4`; `pnpm exec tsc -p tsconfig.json --noEmit` passes; and `pnpm run coverage:check` passes at `492` functions, `218` events, `492` HTTP methods, and `260/260` write invariants.
- **Remaining blockers:** the bounded fork proof reduced free disk to about `169 MiB`, so the full `pnpm run verify:local-fork` sequence and aggregate report were not safely rerun. The prior exhaustive artifact still contains missing campaign/proposal/upgrade/vesting/dataset/license/template/rights/fingerprint fixtures and must be regenerated after those fixtures are provisioned. The repo also has no `eslint.config.*`; `pnpm exec eslint .` exits `2`, and the ordered build gate was not run after lint failed.
- **Merge decision:** do not merge. Recover disk, provision the remaining protocol fixtures, rerun the complete orchestrator and exhaustive probe, then complete lint/build and confirm the worktree contains only intended changes.

### Local-Fork Automation Run — 2026-08-03

- **Implementation:** `codex/local-fork-automation` now contains a deterministic `pnpm run verify:local-fork` orchestrator with loopback fork startup/validation, fixture provisioning, an exhaustive ABI-driven read/event probe, fixture-backed HTTP writes, persistent domain proof artifacts, structured gaps, and a two-flag live-network guard (`--allow-live` plus `--allow-live-destructive`) for destructive/admin stages.
- **Runner tests:** `pnpm run test:local-fork-runner` passes `7/7`, including loopback/live safety behavior, proof-plan ordering, artifact-directory creation, sequential failure handling, inventory totals, and ABI-shaped fixture inputs.
- **Surface and write evidence:** code generation plus `pnpm run coverage:check` remain green at `492` wrapper functions, `218` wrapper events, and `492` validated HTTP methods. The local-fork HTTP contract suite passes `18/18` in isolation and also passed `18/18` inside the final orchestrated run before later proof stages.
- **Structured proof artifacts:** the final diagnostic run persisted `proven working` reports for `layer1-core` (`8` domains / `30` routes / `36` evidence records), `layer1-completion` (`1` / `5` / `7`), `layer1-remaining` (`3` / `36` / `36`), and marketplace purchase settlement (`1` / `5` / `5`). The safe-read probe attempted all `232` reviewed reads plus `214` reviewed event routes: `416/446` returned successful proof responses, `25` are classified `needs fixture`, and `5` remain proof gaps.
- **Blocking evidence:** governance submission succeeded with proposal `43`, tx `0xb0212dc3ceabdf50a6b47cfc28eb1b148d61f71a3831ca9077b3f29dc8fcfb54`, and snapshot block `45010226`, but the proposal remained state `0` at block `45010227`; the persisted governance artifact is therefore `blocked by setup/state`. Mining the voting delay also exhausted the automation host's available disk before the aggregate report could be rewritten.
- **Next steps:** make governance activation deterministic without disk-heavy per-block mining (prefer a fork-native block-number jump or compact mining strategy), provision valid campaign/proposal/license/dataset/rights-group fixtures for the remaining reads, correct the five non-fixture probe inputs, rerun `pnpm run verify:local-fork`, then run the full quality gate and coverage checks. Do not merge this branch until the aggregate report persists successfully with every stage green.

| Section | Status | Required Evidence Before Merge |
| --- | --- | --- |
| ABI-driven gap report | Complete and verified (2026-08-11) | `output/api-test-gap-report.json`, `output/api-test-gap-report.md`, `scripts/generate-test-roadmap.test.ts` (`4/4` passing), and green `pnpm run coverage:check` (`492` functions / `218` events / `492` HTTP methods) |
| Write-method invariant metadata | Complete and verified (2026-08-11) | `260/260` ABI writes in `reviewed/reviewed-write-invariants.json`, stale/missing/signature/reference gates, `scripts/write-invariants-lib.test.ts` (`5/5` passing), green TypeScript/lint/build gates, and green `pnpm run coverage:check` |
| Actor and signer negative paths | Complete and verified (2026-08-10) | `259/259` mounted HTTP writes across `13` domains, `1,813` actor/method cases, `777` API-boundary cases, `3,171` role-lifecycle cases, `100/100` focused tests, and green full/coverage gates |
| Economic invariant expansion | Pending | balance/state delta assertions for escrow, rewards, vesting, staking, burns, withdrawals, and treasury flows |
| Event and indexer projection proof | Blocked — `28/260` real writes proven on 2026-08-10 | generated-registry decode, PostgreSQL projection, replay/reorg/rollback resilience, and deterministic receipts for the remaining `232` writes; production call tracing was proven on 2026-08-11 |
| Local-fork destructive automation | Complete and verified (2026-08-10) | deterministic `10/10`-stage cold run on this branch, funded/approved/aged fixtures, `18/18` HTTP contract proof, `38` real receipts indexed into PostgreSQL, `446/446` reviewed read/event attempts with structured state gaps, bounded Anvil history, strict live flags, `9/9` focused tests, and green TypeScript/lint/build/coverage gates |
| Base Sepolia promotion | Pending | gated live runner using funded fixtures, non-destructive default behavior, tx/block/evidence artifacts |
| Red-team mutation and fuzzing | Complete and verified (2026-08-10) | `1,914` invalid wire mutations across `259` mounted writes, deterministic replay/value/state/RPC/signer/admin oracles, `5/5` loopback-fork probes, `135/135` fork/workflow tests, and green TypeScript/lint/build/coverage gates |

Automation merge rule: do not merge a section into `master` unless all section-specific evidence is present and the repo is clean after verification. If a section is blocked by contract state, funding, live-network safety, or upstream behavior, record the blocker here instead of merging partial work.

### Event And Indexer Projection Run — 2026-08-11

Status: **blocked; do not merge this section yet**.

Evidence on `codex/event-indexer-proof`:

- The local-fork runner has a tenth `event-indexer-proof` stage. It discovers real transaction hashes from prior workflow artifacts, keeps only successful writes to the configured diamond, attributes each selector through the generated write registry, and ingests each exact receipt block through `EventIndexer` into disposable PostgreSQL with all three migrations applied.
- The latest cold run passed all `10/10` stages and indexed `38` workflow receipts across `28` distinct catalog write methods. It persisted `68` canonical raw events and `53` projection rows, satisfied every `all`, `one-of`, or `none` event assertion plus every declared projection-table assertion, and preserved every table count when all proven blocks were replayed.
- Generated-registry tests decode all `214` addressable registry entries derived from `218` ABI event declarations and bind all `260` write invariants to `287` declared event expectations, `150` projection references, and `27` intentionally eventless writes. The broader synthetic catalog proof remains separate from real-receipt coverage.
- Duplicate ingestion, delayed RPC responses, partial block/range failure, projection rollback, empty-block journaling, deep common-ancestor reorg recovery, canonical replacement, and current-row rebuild are covered in unit tests and a disposable PostgreSQL gate.
- Ambiguous diamond-level topics use the originating write selector or an optional `debug_traceTransaction` call trace only when exactly one generated invariant matches. Unsupported tracing and non-unique candidates fail closed by retaining candidate evidence without projecting it.
- `pnpm run proof:indexer:trace-capability` now persists [`output/indexer-trace-capability.json`](/Users/chef/Public/api-layer-event-indexer-proof/output/indexer-trace-capability.json). The credential-safe probe selected the runtime's Base Sepolia public fallback (`sepolia.base.org`), confirmed chain `84532`, selected a recent successful transaction, and received an object result from `debug_traceTransaction` with `callTracer`. This closes the production trace-capability blocker while leaving fail-closed behavior intact for providers that do not expose tracing.
- Current gates pass `56/56` active indexer-assurance tests, `4/4` disposable-PostgreSQL tests, root TypeScript validation, lint, build, `coverage:check` (`492` functions, `218` events, `492` HTTP methods, `260/260` write invariants), and measured coverage at `99.70%` statements, `99.51%` branches, `99.54%` functions, and `99.76%` lines.

Blockers and next steps:

- Add deterministic fixtures and persisted receipt evidence for the remaining `232` write methods before claiming every write path is proven end to end.
- The local fork can still return `Resource not found` for pruned historical traces, but the production fallback is now proven to support `callTracer`; local unavailability remains a fail-closed test condition rather than a production-readiness blocker.

### ABI-Driven Gap Report Evidence

The 2026-08-11 Phase 1 artifact inventories all `33` facets, `492` functions, and `218` ABI event occurrences (`710` total items). Mechanical parity is present for all `710` ABI/RPC items; `709` items have reviewed HTTP entries because the legacy overloaded `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` variant remains intentionally excluded. The report currently classifies `223` items as `ready`, `223` as `needs fixture`, `51` as `unsafe on live network`, and `213` as `needs indexer proof`, with zero `needs contract change` or `needs API guard` findings. Red-team-attributed proof remains at `29` items after the mutation harness, guarded fork probes, and dedicated admin-control oracles were added; no proof-depth or classification drift was detected in this refresh.

Verification evidence:

- `pnpm run test:gap-report`: `4/4` focused generator tests passed.
- `pnpm run report:test-gaps`: regenerated `output/api-test-gap-report.json` and `output/api-test-gap-report.md` from the canonical inputs.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.
- `pnpm exec tsc -p tsconfig.json --noEmit`: repository TypeScript validation passed.
- `pnpm run lint`: repository lint validation passed.
- `pnpm run build`: codegen and the client, indexer, and API package builds all passed.
- `pnpm test`: all `1,300` active tests passed across `132` files; `23` gated contract-integration and local-fork-only red-team tests remained explicitly skipped.
- `pnpm run test:coverage`: the sharded coverage suite passed with `99.98%` lines, `99.98%` statements, `99.95%` branches, and `100%` functions; the only reported gaps are merged-Istanbul mappings on already-exercised `execution-context.ts` and `alchemy-debug-lib.ts` lines.

Build-blocker resolution:

- The API package production build now excludes test and integration sources, preventing test-only TypeChain and repository-script imports from contaminating deployable compilation while preserving those files under Vitest and root lint coverage.
- Strict production type defects were repaired in shared marketplace/vesting helper contracts, receipt/log normalization, gas diagnostics, signer preparation, and workflow result narrowing. Duplicate ABI event occurrences remain intact in the generated inventory and gap report.
- No merge blocker remains for the ABI-driven gap report section.

### Write-Method Invariant Metadata Evidence

The 2026-08-03 invariant catalog covers all `260` mounted ABI write methods across `31` facets. Every record includes the ABI signature plus required actor/role, preconditions, post-state readbacks, emitted-event expectations, balance effects, replay constraints, live-network safety, and indexer expectations. The current classification includes `152` role-gated, `54` owner-or-approved, `36` self, `10` protocol-contract, and `8` permissionless writes. Live safety defaults `153` writes to fork-only, marks `11` irreversible/global operations as never automate live, and permits `96` only with explicit disposable fixtures.

Coverage behavior is fail-closed: normal codegen validates the reviewed catalog and does not auto-add new ABI methods. The generated registry rejects missing or stale method keys, ABI signature drift, incomplete invariant sections, invalid modes, stale/non-read post-state references, stale event references, and indexer events that are not declared receipt expectations. An explicit `pnpm run sync:write-invariants` authoring command is available for deliberate catalog regeneration, but it is not part of normal codegen.

Verification evidence:

- `pnpm run test:write-invariants`: `5/5` focused generator and validation tests passed, including a repository-level `260/260` current-ABI assertion.
- `pnpm run codegen`: regenerated all ABI/API artifacts and proved `260/260` invariant coverage during both registry generation and the final coverage gate.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.
- `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build`: the fixed-order repository quality sequence passed on 2026-08-10; the full build reran codegen and all client, indexer, and API package builds.
- Regeneration produced no semantic changes to the invariant catalog or generated registry. The only transient output was the reviewed API surface's generation timestamp, which was restored to avoid committing non-semantic churn.
- No merge blocker remains for the write-method invariant metadata section.

### Actor And Signer Negative-Path Evidence

The actor report, revalidated on 2026-08-10, covers all `259` mounted HTTP write endpoints across `13` domains and lists the intentionally excluded legacy `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` overload separately. The generated matrix contains `1,813` founder/admin/operator/buyer/seller/licensee/collaborator method cases, `777` unknown-key/read-only-key/signer-mismatch API-boundary cases, and `3,171` missing/stale/revoked/expired/ownership/self/protocol-contract mismatch cases. Protected capability mappings explicitly cover commercialization, listing, transfer, minting, voting, upgrades, pauses, recovery, withdrawals, and ownership-controlled mutation.

The common execution path now rejects unknown and read-only keys before provider work, binds configured or direct-request wallet identity to the actual signer, and always runs contract static-call preflight—including write functions with no ABI outputs—before transaction persistence or submission. Verification and contract-integration fixtures now assign their `read-key` the `read-only` role rather than the write-capable `service` role.

Verification evidence:

- `pnpm run report:actor-negative-paths`: regenerated `output/actor-negative-path-report.json` and `output/actor-negative-path-report.md` from the canonical ABI, HTTP, and invariant inventories.
- `pnpm run test:actor-negative-paths`: `100/100` focused auth, API-boundary, execution-context, and report tests passed, including the exhaustive `1,813` actor/method preflight matrix.
- `pnpm test`: `1,300/1,300` active tests passed across `132` files; `23` gated contract-integration and local-fork-only tests remained explicitly skipped.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.
- `pnpm run test:coverage`: repo-wide measured coverage passed at `99.96%` statements, `99.93%` branches, `99.92%` functions, and `99.98%` lines; shared API authorization remains fully covered.
- `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm run lint`, and `pnpm run build`: TypeScript, lint, codegen, and all client/indexer/API production builds passed on 2026-08-10.
- The 2026-08-10 revalidation regenerated the actor report without semantic drift and confirmed that no actor/signer negative-path blocker remains.

### Red-Team Mutation And Fuzzing Evidence

The red-team harness, completed and revalidated against current `master` on 2026-08-10, generates valid wire values and `1,914` deterministic invalid mutations across all `521` inputs on the `259` mounted HTTP write endpoints. The `29` mutation classes cover integer syntax and overflow/underflow, addresses, booleans, tuples, fixed/dynamic/nested arrays, bytes and calldata length/encoding, and function pointers. The live write inventory includes direct mutation targets for role IDs (`9` inputs), nonces (`3`), calldata (`7`), token IDs (`16`), prices (`4`), deadlines (`5`), and signatures (`1`); actor/API-key signer confusion and scheduled/attempted timestamps are exercised by dedicated adversarial oracles.

The harness also supplies deterministic detectors for replay fingerprints, double-spend/value conservation, illegal state transitions, stale/forked/inconsistent RPC snapshots, selector collisions and duplicates, missing replacement selectors, untrusted or malformed diamond initialization, early/substituted timelock operations, duplicate/insufficient multisig approvals, and emergency state/approval/timelock bypasses. API and client wire validation now fail closed on integer width overflow, odd-length dynamic bytes, incorrectly sized fixed bytes, and malformed 24-byte ABI function pointers.

The loopback-only fork suite snapshots and reverts its chain state and refuses to run against a non-loopback RPC. It funds a random attacker, proves an identical signed transaction cannot transfer value twice, verifies balance conservation including gas burn, probes malformed/unknown diamond calldata, attempts an unauthorized selector-collision cut through a malicious initializer, attempts emergency stop/resume and timelock execution without privileges, and compares real fork block responses to detect stale reads. The same gate includes emergency, timelock, and multisig workflow suites plus indexer duplicate-log/reorg/decode tests.

Verification evidence:

- `pnpm run test:redteam`: `103/103` deterministic mutation, validation, and oracle tests passed; focused harness coverage is `100%` statements, branches, functions, and lines.
- `pnpm run redteam:local-fork`: `135/135` tests passed across `9` files, including `5/5` real loopback-fork probes and the relevant workflow/indexer suites.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.
- `pnpm run test:coverage`: completed successfully at `99.96%` statements, `99.93%` branches, `99.92%` functions, and `99.98%` lines; the red-team harness and modified wire codecs each measure `100%` in all four categories.
- `pnpm exec tsc -p tsconfig.json --noEmit`: repository TypeScript validation passed.
- `pnpm run lint`: repository lint validation passed.
- `pnpm run build`: full codegen and all client, indexer, and API package production builds passed.
- `pnpm run report:test-gaps`: regenerated the JSON and Markdown artifacts with red-team evidence attributed to `29` ABI items.

Merge readiness:

- The prior API-package build backlog has been repaired on `master`; the merged branch now passes TypeScript, lint, full build, explicit surface coverage, focused mutation tests, guarded local-fork tests, relevant workflow/indexer suites, and repository coverage together.
- No merge blocker remains for the red-team mutation and fuzzing section.

## Definition Of Done

The API assurance effort is complete when every ABI method and event has a visible proof classification, every user-facing workflow has positive and negative evidence, every value-moving path has balance conservation checks, every state machine has illegal-transition tests, every emitted event is indexer-proven, every privileged function has role-abuse tests, and all remaining exceptions are explicitly documented as unsafe/destructive on live networks or blocked by upstream contract behavior.
