# Finite automation completion plan

Configured November 15, 2026, following the user's request to automate the remaining audit work and commit the changes to the main/default branch. This repository's actual default branch is `master`; no separate `main` branch is created.

## Applied scheduler configuration

Two new chat-attached heartbeat automations were created:

- **Paperclip runtime recovery and finite stopping controls** — daily at **6:30 AM America/Chicago**. Owns PC-RUNTIME and PC-STOP: repair the actual runtime/adapter launch path and implement tested blockage/terminal dispatch controls.
- **Paperclip project acceptance and completion** — daily at **10:30 AM America/Chicago**. Owns the 20 frozen project acceptances and PC-UNPROJECTED: complete dependency-ready implementation, validate real deliverables, reconcile historical outage tasks and close only evidence-accepted finite scope.

Eleven existing active API jobs were updated in place. Their schedules, model/reasoning choices, target projects/threads and notification preferences were preserved. They now use finite ownership, dependency evidence, completion and external-blocker pause rules. The original funding acceptance denominator, detailed tests and proof standard are retained. The former broad `contracts-api`, branch consolidation and test-gap prompts now define bounded release coordination, reviewed delivery and a frozen regression range.

The duplicate **Event Indexer Proof** automation was paused as superseded; the **Production Indexer Write Coverage** owner now owns its stronger local 113/260 proof artifact and all remaining method keys. This is a handoff, not completed proof. The four previously completed static generator/queue automations remain paused. Overall: **13 active completion jobs, 5 paused repo-linked jobs**, including the two new Paperclip jobs. Older paused Paperclip routing jobs were not reactivated.

Live scheduler definitions are exported in `ops/automations/finite-completion-configuration.json`. This is a reviewable configuration snapshot, not an installer: editing it alone does not change the Codex scheduler. Changes must go through the automation tool. No secrets, provider tokens or environment-file contents are included.

## Ownership and acceptance

`ops/automations/finite-completion-ledger.json` is the shared acceptance ledger. Every item has one owner, explicit acceptance, dependencies, baseline, evidence, delivered commit and blocker fields. All unverified completion-plan items begin open; historical source completion and project ticket percentages remain baseline evidence only. Each project row links by immutable project ID to the audit's concrete remaining actions.

| Acceptance | Owner | Finish condition |
| --- | --- | --- |
| API-01 | Write Invariants | Mounted deployment inventory/overloads reconciled; clean generation and metadata gates delivered |
| API-02 | Actor Negative Paths | Complete current actor/key/signer/lifecycle matrix, gates and delivery |
| API-03 | Red Team Harness | Current adversarial and real-loopback acceptance, gates and delivery |
| API-04 | Local Fork Automation | Existing runner's deterministic full aggregate accepted and delivered |
| API-05 | Production Indexer Write Coverage | Stronger local evidence reconciled; all frozen exact-method proof keys accepted with PostgreSQL/replay and delivery |
| API-06 | Economic Invariants | Fixed economic blocker/method checklist accepted with actual beneficiary/state/balance consequences |
| API-07 | Base Sepolia Promotion | Marketplace and governance safe testnet proofs both accepted |
| API-08, PRIV-ROLLOUT, COORD-01 | Release completion coordinator (`contracts-api`) | Frozen release rubric and actual authorized rollout acceptance verified; all API/Paperclip dependency handoffs and terminal schedule states reconciled |
| C19, C20, F01 | Existing Coinbase funding owner | Actual provider/deployed acceptance, security/release criteria, and confirmed consuming frontend complete |
| TEST-01 | Regression gap completion | Meaningful uncovered behavior resolved for the frozen release commit interval |
| DELIVERY-01 | Bounded delivery owner | Frozen branch/worktree dispositions and approved passenger delivery verified, without arbitrary autosaves |
| PC-RUNTIME, PC-STOP | New runtime/stopping-controls owner | Valid actual runtime and tested blocked/terminal dispatch suppression delivered |
| PC-PROJECT-01…20, PC-UNPROJECTED | New project acceptance owner | Actual finite deliverables accepted, historical failures adjudicated and statuses reconciled; undefined scope remains open |

## Run and stopping protocol

1. Fetch the actual remote default and read the latest shared ledger and owning-repo instructions. Inspect all relevant worktree states; use a clean isolated checkout and pinned dependencies. Do not treat missing dependencies/config in a new worktree as a reason to restart delivered implementation.
2. Work only owned items. Freeze concrete method/blocker membership before computing a percentage. Implement a dependency-ready slice and run meaningful affected tests plus required repo gates. No static-only or mocked acceptance for a real execution requirement.
3. Update only owned item fields from the latest default ledger; merge concurrent owner changes rather than overwriting stale JSON. Record source SHA, artifacts, exact commands/pass/fail/skip, remaining count, blockers and delivered commit. Commit verified scoped changes to the actual owning repo, then integrate without force-push and verify remote ref/CI. Source in other repositories belongs in those repositories; the API ledger contains the cross-repo delivery references.
4. If all owned acceptance and delivery are verified, set those items accepted, **pause the automation through the automation tool**, and report completion once.
5. If all remaining work needs external credentials, provider/account approval, intended frontend confirmation, production authorization or an undefined user scope, record **blocked_external** with exact owner/action and pause **waiting_external**. Items remain open. Resume only when the prerequisite changes; a paused blocked job is not a completed project.
6. When waiting only on an owned dependency, persist **waiting_dependency** and pause. The completion coordinator may resume the existing owner after newly delivered prerequisite evidence; it preserves the owner's other scheduler settings. This prevents unchanged blocked polling.
7. A pause failure is a real actionable failure. Report it and retain the incomplete ledger state. Never claim a stop merely because the prompt says to stop.

Public posting, email/Slack, real payments/transfers, service deployments and production migrations are not silently authorized by creating these schedules. Jobs must finish independent implementation and prepare concrete reviewable rollout artifacts, then identify the exact missing authorization or external action. No fake approvals or broad migrations to meet a quota.

## Paperclip scope and dependencies

Use the Paperclip skill for control-plane operations and source-repo instructions for domain fixes. Discover the actual live checkout before modifying runtime paths; a project path can be stale. Use the API and appropriate identity/run audit headers, never direct database mutation. Required factual task assignments/status/progress comments are authorized by this completion workflow; no external communication/publication is implied.

The runtime owner should temporarily pause Swarm Scout while its canonical execution prerequisite is broken, preserving all issue history. Writing Loop is already paused and must stay paused until its own acceptance is ready. Confirm a real isolated worker run, add tested unresolved-dependency/terminal dispatch rules, and distinguish ongoing backup/health operations from finite migration/build tasks. The project owner can implement source changes independently while runtime recovery proceeds; runtime-dependent execution waits for PC-RUNTIME.

Twenty project baselines, their open issue identifiers and unprojected open issue membership are frozen in the ledger. Cross-project work and duplicates must resolve against actual source/evidence; PRD ticket closure is not product delivery. Do not replay hundreds of outage copies or invent scope for the empty robotics company. Any new necessary dependency must be added explicitly with its reason and owner, without rewriting historical denominators.

## Verification of this configuration change

No application runtime source was changed. Validation covers actual scheduler definitions, retained schedules/targets/model/notification fields, unique ownership, dependency references/cycles, all 20 project IDs, JSON syntax, generated report timestamp-only diffs and whitespace. This configuration does not claim any remaining API or Paperclip acceptance has passed. The earlier audit is a historical snapshot; the applied plan and exported configuration supersede its scheduling recommendations.
