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
| Event and indexer projection proof | Blocked — partial proof on `codex/event-indexer-proof` | event decode plus indexer projection tests for each write workflow, including replay/reorg cases |
| Local-fork destructive automation | Pending | deterministic local-fork runner, fixture setup, structured report output, and safe default flags |
| Base Sepolia promotion | Pending | gated live runner using funded fixtures, non-destructive default behavior, tx/block/evidence artifacts |
| Red-team mutation and fuzzing | Pending | mutation suites for replay, double spend, malformed calldata, stale RPC, signer confusion, admin controls, emergency/timelock bypasses |

Automation merge rule: do not merge a section into `master` unless all section-specific evidence is present and the repo is clean after verification. If a section is blocked by contract state, funding, live-network safety, or upstream behavior, record the blocker here instead of merging partial work.

### Event And Indexer Projection Run — 2026-08-03

Status: **blocked; do not merge this section yet**.

Evidence added on `codex/event-indexer-proof`:

- The generated-registry assurance test synthesizes and decodes logs for all `214` addressable event registry entries derived from the `218` ABI event declarations. It proves `200` entries are uniquely decodable and exercises all `130` reviewed projection targets attached to those unambiguous events.
- The indexer now records ambiguous event candidates and skips projection instead of silently choosing the first facet with the same topic. This prevents known `Transfer`, `Approval`, `AssetEscrowed`, `VotingPowerUpdated`, `VoiceAssetUsed`, and `LicenseCreated` collisions from corrupting projection tables.
- Raw event insertion and projection now share one database transaction. A projection failure therefore rolls back the raw insert, leaves the checkpoint unchanged, and permits a clean replay.
- Raw decoded arguments are recursively sanitized before JSON persistence, including `bigint` values emitted by ethers for Solidity integers.
- `pnpm run test:indexer:assurance` passes `40/40` tests across `7/7` files, covering duplicate log replay, delayed RPC responses, partial-block projection failure, transaction rollback, one-block reorg orphaning/checkpoint rewind, generated-registry decoding, and reviewed table projection SQL.
- The same indexer assurance command with focused instrumentation reports `100%` statements, branches, functions, and lines for `events.ts`, `worker.ts`, and the measured projection helper surface.
- A focused client/indexer regression run passes `53/53` tests across `8/8` files, and standalone client and indexer TypeScript builds pass after correcting existing test-fixture facet typing and nullable block-filter normalization.
- `pnpm run coverage:check` passes with `492` functions and `218` ABI events covered by generated wrappers and all `492` HTTP methods validated.

Blockers and next steps:

- The merged invariant catalog now provides expected receipt events and indexer expectations for all `260` ABI write methods. The next test layer must consume that catalog directly and fail when any declared expected event lacks decode/projection evidence; the current generated-registry test proves event inventory breadth but does not yet bind every write method to its declared events.
- Fourteen registry entries share six indistinguishable event signatures on the same diamond address, covering `9` reviewed projection targets. Topic, address, indexed layout, and data are identical, so the indexer cannot safely select a facet. Resolve this upstream with distinct event signatures/discriminants or provide a transaction-aware authoritative disambiguation policy backed by write/event metadata.
- This run proves generated projection SQL but not committed rows in a real Supabase/Postgres service because `SUPABASE_DB_URL` is not configured. Add an ephemeral-Postgres or Supabase integration gate that applies both migrations and verifies replay, rollback, orphaning, and current-row rebuild behavior against actual constraints.
- Existing reorg coverage proves checkpoint-tip replacement. Deep reorg recovery still needs a canonical block journal and common-ancestor search so all divergent blocks, including empty blocks, can be rolled back deterministically.
- The repository-wide quality baseline also prevents merge: there is no lint script, ESLint dependency, or ESLint configuration; `pnpm run build` reaches green client/indexer builds but the API package has extensive pre-existing TypeScript failures (including duplicate TypeChain declarations from repeated ABI events); and `pnpm run test:coverage` still depends on the ignored root `.env` and hard-coded `/Users/chef/Public/api-layer` coverage fixtures when executed from a clean worktree.
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

## Definition Of Done

The API assurance effort is complete when every ABI method and event has a visible proof classification, every user-facing workflow has positive and negative evidence, every value-moving path has balance conservation checks, every state machine has illegal-transition tests, every emitted event is indexer-proven, every privileged function has role-abuse tests, and all remaining exceptions are explicitly documented as unsafe/destructive on live networks or blocked by upstream contract behavior.
