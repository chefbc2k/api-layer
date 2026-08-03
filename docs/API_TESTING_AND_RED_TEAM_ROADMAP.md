# API Testing And Red-Team Roadmap

This document is the master tracking file for the API assurance automation. Daily automation runs must update this file with status, evidence, remaining gaps, and merge readiness for each section.

## Current State

This repo has strong mechanical and behavioral coverage for the API layer that sits on top of the USpeaks smart contracts.

- ABI/client wrapper coverage is complete for `33` facets, `492` functions, and `218` events.
- HTTP surface generation is complete for `491` generated endpoints across access control, tokenomics, staking, diamond admin, emergency, marketplace, governance, voice assets, multisig, ownership, licensing, datasets, and WhisperBlock.
- Standard TypeScript coverage currently reports `100%` lines, statements, functions, and branches across the measured API/client/indexer/script surface.
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

Status: **Complete and verified on 2026-08-03.** The generator now attributes evidence conservatively from the generated contract/RPC/HTTP inventories, reviewed API surface, protocol tests, and persisted verify outputs without calling the chain. It preserves duplicate ABI event declarations as distinct occurrences, records evidence paths for every proof flag, and emits both machine-readable and human-readable reports.

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

| Section | Status | Required Evidence Before Merge |
| --- | --- | --- |
| ABI-driven gap report | Complete (2026-08-03) | `output/api-test-gap-report.json`, `output/api-test-gap-report.md`, `scripts/generate-test-roadmap.test.ts` (`4/4` passing), and green `pnpm run coverage:check` (`492` functions / `218` events / `492` HTTP methods) |
| Write-method invariant metadata | Complete (2026-08-03) | `260/260` ABI writes in `reviewed/reviewed-write-invariants.json`, stale/missing/signature/reference gates, `scripts/write-invariants-lib.test.ts` (`5/5` passing), and green `pnpm run coverage:check` |
| Actor and signer negative paths | Complete (2026-08-03) | `259/259` mounted HTTP writes across `13` domains, `1,813` actor/method cases, `777` API-boundary cases, `3,171` role-lifecycle cases, `100/100` focused tests, and green full/coverage gates |
| Economic invariant expansion | Pending | balance/state delta assertions for escrow, rewards, vesting, staking, burns, withdrawals, and treasury flows |
| Event and indexer projection proof | Pending | event decode plus indexer projection tests for each write workflow, including replay/reorg cases |
| Local-fork destructive automation | Pending | deterministic local-fork runner, fixture setup, structured report output, and safe default flags |
| Base Sepolia promotion | Pending | gated live runner using funded fixtures, non-destructive default behavior, tx/block/evidence artifacts |
| Red-team mutation and fuzzing | Blocked from merge (implementation complete, 2026-08-03) | `1,914` invalid wire mutations across `259` mounted writes, deterministic replay/value/state/RPC/admin oracles, `5/5` loopback-fork probes, and `135/135` focused tests are green; merge awaits repair of the pre-existing `@uspeaks/api` package build backlog |

Automation merge rule: do not merge a section into `master` unless all section-specific evidence is present and the repo is clean after verification. If a section is blocked by contract state, funding, live-network safety, or upstream behavior, record the blocker here instead of merging partial work.

### ABI-Driven Gap Report Evidence

The 2026-08-03 Phase 1 artifact inventories all `33` facets, `492` functions, and `218` ABI event occurrences (`710` total items). Mechanical parity is present for all `710` ABI/RPC items; `709` items have reviewed HTTP entries because the legacy overloaded `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` variant remains intentionally excluded. The report currently classifies `223` items as `ready`, `223` as `needs fixture`, `51` as `unsafe on live network`, and `213` as `needs indexer proof`, with zero `needs contract change` or `needs API guard` findings.

Verification evidence:

- `pnpm run test:gap-report`: `4/4` focused generator tests passed.
- `pnpm run report:test-gaps`: regenerated `output/api-test-gap-report.json` and `output/api-test-gap-report.md` from the canonical inputs.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods.
- Focused TypeScript validation passed for `scripts/generate-test-roadmap.ts` and `scripts/generate-test-roadmap.test.ts` under the repo's ES module runtime shape.

### Write-Method Invariant Metadata Evidence

The 2026-08-03 invariant catalog covers all `260` mounted ABI write methods across `31` facets. Every record includes the ABI signature plus required actor/role, preconditions, post-state readbacks, emitted-event expectations, balance effects, replay constraints, live-network safety, and indexer expectations. The current classification includes `152` role-gated, `54` owner-or-approved, `36` self, `10` protocol-contract, and `8` permissionless writes. Live safety defaults `153` writes to fork-only, marks `11` irreversible/global operations as never automate live, and permits `96` only with explicit disposable fixtures.

Coverage behavior is fail-closed: normal codegen validates the reviewed catalog and does not auto-add new ABI methods. The generated registry rejects missing or stale method keys, ABI signature drift, incomplete invariant sections, invalid modes, stale/non-read post-state references, stale event references, and indexer events that are not declared receipt expectations. An explicit `pnpm run sync:write-invariants` authoring command is available for deliberate catalog regeneration, but it is not part of normal codegen.

Verification evidence:

- `pnpm run test:write-invariants`: `5/5` focused generator and validation tests passed, including a repository-level `260/260` current-ABI assertion.
- `pnpm run codegen`: regenerated all ABI/API artifacts and proved `260/260` invariant coverage during both registry generation and the final coverage gate.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.

### Actor And Signer Negative-Path Evidence

The 2026-08-03 actor report covers all `259` mounted HTTP write endpoints across `13` domains and lists the intentionally excluded legacy `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` overload separately. The generated matrix contains `1,813` founder/admin/operator/buyer/seller/licensee/collaborator method cases, `777` unknown-key/read-only-key/signer-mismatch API-boundary cases, and `3,171` missing/stale/revoked/expired/ownership/self/protocol-contract mismatch cases. Protected capability mappings explicitly cover commercialization, listing, transfer, minting, voting, upgrades, pauses, recovery, withdrawals, and ownership-controlled mutation.

The common execution path now rejects unknown and read-only keys before provider work, binds configured or direct-request wallet identity to the actual signer, and always runs contract static-call preflight—including write functions with no ABI outputs—before transaction persistence or submission. Verification and contract-integration fixtures now assign their `read-key` the `read-only` role rather than the write-capable `service` role.

Verification evidence:

- `pnpm run report:actor-negative-paths`: regenerated `output/actor-negative-path-report.json` and `output/actor-negative-path-report.md` from the canonical ABI, HTTP, and invariant inventories.
- `pnpm run test:actor-negative-paths`: `100/100` focused auth, API-boundary, execution-context, and report tests passed, including the exhaustive `1,813` actor/method preflight matrix.
- `pnpm test`: `1,279/1,279` active tests passed across `130` files; `18` gated contract-integration tests remained explicitly skipped.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.
- `pnpm run test:coverage`: repo-wide measured coverage passed at `100%` statements, branches, functions, and lines.
- `pnpm exec tsc -p tsconfig.json --noEmit`: TypeScript validation passed.
- `pnpm exec tsc -p tsconfig.json --noEmit`: focused repository TypeScript validation passed.

### Red-Team Mutation And Fuzzing Evidence

The 2026-08-03 red-team harness generates valid wire values and `1,914` deterministic invalid mutations across all `521` inputs on the `259` mounted HTTP write endpoints. The `29` mutation classes cover integer syntax and overflow/underflow, addresses, booleans, tuples, fixed/dynamic/nested arrays, bytes and calldata length/encoding, and function pointers. The live write inventory includes direct mutation targets for role IDs (`9` inputs), nonces (`3`), calldata (`7`), token IDs (`16`), prices (`4`), deadlines (`5`), and signatures (`1`); actor/API-key signer confusion and scheduled/attempted timestamps are exercised by dedicated adversarial oracles.

The harness also supplies deterministic detectors for replay fingerprints, double-spend/value conservation, illegal state transitions, stale/forked/inconsistent RPC snapshots, selector collisions and duplicates, missing replacement selectors, untrusted or malformed diamond initialization, early/substituted timelock operations, duplicate/insufficient multisig approvals, and emergency state/approval/timelock bypasses. API and client wire validation now fail closed on integer width overflow, odd-length dynamic bytes, incorrectly sized fixed bytes, and malformed 24-byte ABI function pointers.

The loopback-only fork suite snapshots and reverts its chain state and refuses to run against a non-loopback RPC. It funds a random attacker, proves an identical signed transaction cannot transfer value twice, verifies balance conservation including gas burn, probes malformed/unknown diamond calldata, attempts an unauthorized selector-collision cut through a malicious initializer, attempts emergency stop/resume and timelock execution without privileges, and compares real fork block responses to detect stale reads. The same gate includes emergency, timelock, and multisig workflow suites plus indexer duplicate-log/reorg/decode tests.

Verification evidence:

- `pnpm run test:redteam`: `103/103` deterministic mutation, validation, and oracle tests passed; focused harness coverage is `100%` statements, branches, functions, and lines.
- `pnpm run redteam:local-fork`: `135/135` tests passed across `9` files, including `5/5` real loopback-fork probes and the relevant workflow/indexer suites.
- `pnpm run coverage:check`: wrapper coverage passed for `492` functions and `218` events; HTTP coverage passed for `492` methods; write-invariant coverage passed for `260/260` ABI writes.
- `pnpm run test:coverage`: completed successfully at `99.98%` statements, `99.95%` branches, `99.92%` functions, and `100%` lines; the red-team harness and modified wire codecs each measure `100%` in all four categories.
- `pnpm exec tsc -p tsconfig.json --noEmit`: repository TypeScript validation passed.

Merge blocker and next steps:

- `pnpm run build` completes codegen and the client/indexer builds, but the `@uspeaks/api` package build remains red on pre-existing issues outside this workstream: duplicate TypeChain declarations for repeated ABI events, package-level test/source typing debt, and the CommonJS `import.meta` mismatch inherited through `scripts/utils.ts`.
- Keep this section on `codex/red-team-harness`; do not merge it into `master` until the API package build is repaired on master (or its intended build scope is formally corrected), then rerun TypeScript, lint, full build, `pnpm run redteam:local-fork`, `pnpm run coverage:check`, and `pnpm run test:coverage`.

## Definition Of Done

The API assurance effort is complete when every ABI method and event has a visible proof classification, every user-facing workflow has positive and negative evidence, every value-moving path has balance conservation checks, every state machine has illegal-transition tests, every emitted event is indexer-proven, every privileged function has role-abuse tests, and all remaining exceptions are explicitly documented as unsafe/destructive on live networks or blocked by upstream contract behavior.
