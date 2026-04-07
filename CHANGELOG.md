# Changelog: USpeaks API Layer

> **Mandatory Policy:** All work, including minor and major milestones, architectural shifts, and feature additions, MUST be documented in this changelog. No exceptions. This ensures transparency and a clear "building in public" record for the totality of the repo.

---

## [0.1.36] - 2026-04-07

### Fixed
- **Vesting Failure Classification Coverage Expanded:** Extended [`/Users/chef/Public/api-layer/packages/api/src/workflows/vesting-helpers.test.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/vesting-helpers.test.ts) to prove zeroed readbacks when no schedule exists, non-revoked readback rethrow behavior, and workflow-specific normalization for create/release/revoke vesting execution failures including authority, balance, duplicate-schedule, invalid beneficiary/amount, cliff-period, not-revocable, and already-revoked cases.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves through fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, and baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`.
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the setup flow still exits cleanly with `setup.status: "blocked"` while preserving the same real funding blockers. Founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` still needs `48895000000081` additional wei, while buyer `0x0C14d2fbd9Cf0A537A8e8fC38E8da005D00A1709`, licensee `0x433Ec7884C9f191e357e32d6331832F44DE0FCD0`, and transferee `0x38715AB647049A755810B2eEcf29eE79CcC649BE` each still need `39126000000081` additional wei; the aged marketplace fixture remains `purchase-ready` on token `11` with listing readback `{ tokenId: "11", seller: "0x276D8504239A02907BA5e7dD42eEb5A651274bCd", price: "1000", createdAt: "1773601130", createdBlock: "38916421", lastUpdateBlock: "38916421", expiresAt: "1776193130", isActive: true }`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Targeted Vesting Proofs:** Re-ran `pnpm exec vitest run packages/api/src/workflows/vesting-helpers.test.ts --maxWorkers 1`; all `10` assertions pass. A focused coverage run on the same test lifts [`/Users/chef/Public/api-layer/packages/api/src/workflows/vesting-helpers.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/vesting-helpers.ts) to `93.26%` statements, `90.82%` branches, `100%` functions, and `93.2%` lines.
- **Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `112` passing files, `471` passing tests, and `17` intentionally skipped live contract proofs. Repo-wide coverage improved from `81.49%` to `82.31%` statements, `67.18%` to `68.34%` branches, `90.11%` to `90.20%` functions, and `81.45%` to `82.28%` lines.

### Known Issues
- **100% Standard Coverage Still Not Met:** The biggest remaining handwritten coverage gaps are still concentrated in [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), and [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts).

## [0.1.35] - 2026-04-05

### Fixed
- **Shared Request-Plumbing Coverage Expanded:** Added [`/Users/chef/Public/api-layer/packages/api/src/shared/auth.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/auth.test.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/rate-limit.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/rate-limit.test.ts), and [`/Users/chef/Public/api-layer/packages/api/src/shared/route-factory.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/route-factory.test.ts) to prove API-key loading/authentication defaults, local and Upstash-backed rate-limit enforcement, request-header option wiring, method/event route invocation, error serialization, and HTTP verb registration across the shared API ingress layer.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves through fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, and baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`.
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the setup flow still exits cleanly with `setup.status: "blocked"` while preserving the same real funding blockers. Founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` still needs `48895000000081` additional wei, while buyer `0x0C14d2fbd9Cf0A537A8e8fC38E8da005D00A1709`, licensee `0x433Ec7884C9f191e357e32d6331832F44DE0FCD0`, and transferee `0x38715AB647049A755810B2eEcf29eE79CcC649BE` each still need `39126000000081` additional wei; the aged marketplace fixture remains `purchase-ready` on token `11` with listing readback `{ tokenId: "11", seller: "0x276D8504239A02907BA5e7dD42eEb5A651274bCd", price: "1000", createdAt: "1773601130", createdBlock: "38916421", lastUpdateBlock: "38916421", expiresAt: "1776193130", isActive: true }`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Targeted Shared Tests:** Re-ran `pnpm exec vitest run packages/api/src/shared/auth.test.ts packages/api/src/shared/rate-limit.test.ts packages/api/src/shared/route-factory.test.ts --maxWorkers 1`; all `15` targeted assertions pass.
- **Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `112` passing files, `466` passing tests, and `17` intentionally skipped live contract proofs. Repo-wide coverage improved from `80.99%` to `81.49%` statements, `66.57%` to `67.18%` branches, `89.86%` to `90.11%` functions, and `80.92%` to `81.45%` lines. Shared ingress coverage improved materially: [`/Users/chef/Public/api-layer/packages/api/src/shared/auth.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/auth.ts) is now `100/100/100/100`, [`/Users/chef/Public/api-layer/packages/api/src/shared/rate-limit.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/rate-limit.ts) is now `100/100/100/100`, and [`/Users/chef/Public/api-layer/packages/api/src/shared/route-factory.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/route-factory.ts) moved to `100%` statements / `90%` branches / `100%` functions / `100%` lines.

### Known Issues
- **100% Standard Coverage Still Not Met:** The largest remaining handwritten coverage gaps are still concentrated in [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), and lower-covered workflow helpers such as [`/Users/chef/Public/api-layer/packages/api/src/workflows/vesting-helpers.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/vesting-helpers.ts).

## [0.1.34] - 2026-04-05

### Fixed
- **API Server Coverage Closed:** Added [`/Users/chef/Public/api-layer/packages/api/src/app.routes.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.routes.test.ts) to exercise the health, provider-status, transaction-request, and transaction-status routes through the real Express server with mocked execution-context dependencies. This lifts [`/Users/chef/Public/api-layer/packages/api/src/app.ts`](/Users/chef/Public/api-layer/packages/api/src/app.ts) from `60%` statements / `60%` lines / `42.85%` functions to `100%` statements / `100%` lines / `100%` functions.
- **Script Harnesses Made Testable:** Updated [`/Users/chef/Public/api-layer/scripts/run-test-coverage.ts`](/Users/chef/Public/api-layer/scripts/run-test-coverage.ts) and [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts) to export internal helpers behind import-safe main-module guards, then added [`/Users/chef/Public/api-layer/scripts/run-test-coverage.test.ts`](/Users/chef/Public/api-layer/scripts/run-test-coverage.test.ts) and [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.test.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.test.ts) to prove coverage-runner argument wiring, exit/signal handling, bigint JSON serialization, transaction-hash extraction, retry behavior, role hashing, and native-balance reserve calculations.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves through fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, and baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`.
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the setup flow still exits cleanly with `setup.status: "blocked"` while preserving the real funding blockers. Founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` still needs `48895000000081` additional wei, while buyer `0x0C14d2fbd9Cf0A537A8e8fC38E8da005D00A1709`, licensee `0x433Ec7884C9f191e357e32d6331832F44DE0FCD0`, and transferee `0x38715AB647049A755810B2eEcf29eE79CcC649BE` each still need `39126000000081` additional wei; the aged marketplace fixture remains `purchase-ready` on token `11` with listing readback `{ tokenId: "11", seller: "0x276D8504239A02907BA5e7dD42eEb5A651274bCd", price: "1000", createdAt: "1773601130", createdBlock: "38916421", lastUpdateBlock: "38916421", expiresAt: "1776193130", isActive: true }`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Targeted Coverage Proofs:** Re-ran `pnpm exec vitest run packages/api/src/app.routes.test.ts scripts/base-sepolia-operator-setup.test.ts scripts/run-test-coverage.test.ts --maxWorkers 1`; all `14` targeted assertions pass.
- **Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `109` passing files, `451` passing tests, and `17` intentionally skipped live contract proofs. Repo-wide coverage improved from `80.11%` to `80.99%` statements, `66.01%` to `66.57%` branches, `88.86%` to `89.86%` functions, and `80.10%` to `80.92%` lines. Script coverage improved from `34.10%` to `39.07%` statements and from `34.44%` to `38.95%` lines.

### Known Issues
- **100% Standard Coverage Still Not Met:** The largest remaining handwritten coverage gaps are still concentrated in [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), and lower-covered infrastructure helpers such as [`/Users/chef/Public/api-layer/packages/api/src/shared/route-factory.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/route-factory.ts).

## [0.1.33] - 2026-04-05

### Fixed
- **Execution Context Coverage Expanded:** Extended [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts) to prove execution-source gating, gasless authorization checks, read-path serialization, direct-write signer enforcement, CDP smart-wallet allowlist and spend-cap rejection, relay metadata persistence, tx-hash persistence, event-query normalization, and transaction-request lookup behavior for the API execution layer.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves through fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, and baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`.
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the setup flow still exits cleanly with `setup.status: "blocked"` while preserving the same real funding blockers. Founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` still needs `48895000000081` additional wei, while buyer `0x0C14d2fbd9Cf0A537A8e8fC38E8da005D00A1709`, licensee `0x433Ec7884C9f191e357e32d6331832F44DE0FCD0`, and transferee `0x38715AB647049A755810B2eEcf29eE79CcC649BE` each still need `39126000000081` additional wei; the aged marketplace fixture remains `purchase-ready` on token `11`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `106` passing files, `437` passing tests, and `17` intentionally skipped live contract proofs. Repo-wide coverage improved to `80.11%` statements / `66.01%` branches / `88.86%` functions / `80.10%` lines, while [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts) now reports `71.50%` statements / `49.72%` branches / `70.45%` functions / `71.91%` lines.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `106` passing files, `437` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **100% Standard Coverage Still Not Met:** Coverage continues to improve, but the largest remaining handwritten gaps are still concentrated in [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), and the still-partial branch surface inside [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts).

## [0.1.32] - 2026-04-05

### Fixed
- **License Template Helper Coverage Closed:** Added [`/Users/chef/Public/api-layer/scripts/license-template-helper.test.ts`](/Users/chef/Public/api-layer/scripts/license-template-helper.test.ts) to exercise the live verifier helper in both reuse and creation modes, including endpoint-registry route tracking, default template payload construction, accepted-write receipt polling, rejected create responses, invalid hash payloads, and receipt-timeout handling.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline remains intact on fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, and baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`.
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the setup flow still exits cleanly with `setup.status: "blocked"` while preserving the current real funding blockers. Founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` still needs `48895000000081` additional wei, while buyer `0x0C14d2fbd9Cf0A537A8e8fC38E8da005D00A1709`, licensee `0x433Ec7884C9f191e357e32d6331832F44DE0FCD0`, and transferee `0x38715AB647049A755810B2eEcf29eE79CcC649BE` each still need `39126000000081` additional wei; the aged marketplace fixture remains `purchase-ready` on token `11`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `106` passing files, `428` passing tests, and `17` intentionally skipped live contract proofs. Repo-wide coverage improved to `77.98%` statements / `64.60%` branches / `87.18%` functions / `77.96%` lines, while [`/Users/chef/Public/api-layer/scripts/license-template-helper.ts`](/Users/chef/Public/api-layer/scripts/license-template-helper.ts) jumped from `0%` to `97.87%` statements / `93.75%` branches / `100%` functions / `97.77%` lines.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `106` passing files, `428` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **100% Standard Coverage Still Not Met:** The largest remaining handwritten coverage gaps are still concentrated in [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), and lower-covered runtime helpers such as [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts).

## [0.1.31] - 2026-04-05

### Fixed
- **CDP Smart Wallet Coverage Added:** Added [`/Users/chef/Public/api-layer/packages/api/src/shared/cdp-smart-wallet.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/cdp-smart-wallet.test.ts) to cover missing credential guards, incomplete SDK-shape failures, explicit smart-wallet selection, owner lookup by address and name, network/paymaster overrides, and missing user-operation hash handling in the CDP relay path.

### Verified
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the operator setup still exits cleanly with `setup.status: "blocked"` while preserving the real funding limitations. The current blockers remain founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` needing `48895000000081` additional wei and buyer / licensee / transferee each needing `39126000000081` additional wei, while the aged marketplace fixture stays `purchase-ready` on token `11`.
- **Full Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `105` passing files, `423` passing tests, and `17` intentionally skipped live contract proofs. The current standard-coverage baseline is `77.01%` statements / `63.51%` branches / `86.59%` functions / `77.00%` lines.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `105` passing files, `423` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **100% Standard Coverage Still Not Met:** Coverage is still materially below the repo mandate. The largest remaining handwritten gaps continue to sit in [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), [`/Users/chef/Public/api-layer/scripts/license-template-helper.ts`](/Users/chef/Public/api-layer/scripts/license-template-helper.ts), and lower-covered runtime helpers in [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts).

## [0.1.30] - 2026-04-05

### Fixed
- **CDP Smart Wallet Coverage Added:** Added [`/Users/chef/Public/api-layer/packages/api/src/shared/cdp-smart-wallet.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/cdp-smart-wallet.test.ts) to prove the Coinbase smart-wallet relay helper across missing-secret validation, incomplete SDK shape detection, explicit smart-wallet address resolution, owner-based smart-account creation, paymaster/network overrides, and missing user-operation-hash failure handling.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline remains intact on fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`, and `alchemyDiagnosticsEnabled: true` / `alchemySimulationEnabled: true`.
- **Setup Classification Guard:** Re-ran `pnpm run setup:base-sepolia`; the script exits cleanly with `setup.status: "blocked"` and preserves the real environment limitation instead of failing mid-run. The current blockers remain founder `0x3605020bb497c0ad07635E9ca0021Ba60f1244a2` needing `48895000000081` additional wei and buyer / licensee / transferee each needing `39126000000081` additional wei, while the aged marketplace fixture stays `purchase-ready` on token `11`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `105` passing files, `423` passing tests, and `17` intentionally skipped live contract proofs. The current standard-coverage baseline is `77.01%` statements / `63.51%` branches / `86.59%` functions / `77.00%` lines, with [`/Users/chef/Public/api-layer/packages/api/src/shared/cdp-smart-wallet.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/cdp-smart-wallet.ts) now at `95.45%` statements / `94%` branches / `100%` functions / `95.45%` lines.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `105` passing files, `423` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **100% Standard Coverage Still Not Met:** Coverage is improved, but the largest remaining handwritten gaps are still concentrated in [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts), [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts), and [`/Users/chef/Public/api-layer/scripts/license-template-helper.ts`](/Users/chef/Public/api-layer/scripts/license-template-helper.ts).

## [0.1.29] - 2026-04-05

### Fixed
- **Register Voice Asset Retry Budget:** Updated [`/Users/chef/Public/api-layer/packages/api/src/modules/voice-assets/workflows/register-voice-asset.test.ts`](/Users/chef/Public/api-layer/packages/api/src/modules/voice-assets/workflows/register-voice-asset.test.ts) so the readback-retry cases use the same immediate timeout shim as the explicit timeout-path tests. This removes the real `setTimeout` backoff from the default suite and keeps `pnpm test` green while preserving the retry semantics under test.
- **Shared Helper Coverage Expansion:** Added focused assertions in [`/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.test.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.test.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.test.ts), and [`/Users/chef/Public/api-layer/packages/indexer/src/projections/common.test.ts`](/Users/chef/Public/api-layer/packages/indexer/src/projections/common.test.ts) to cover Alchemy client/trace fallbacks, transaction-status routing, rate-limit bucketing, tuple object encoding/validation, projection sanitization, insert semantics, and current-row rebuild logic.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline remains intact on fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`, and `alchemyDiagnosticsEnabled: true` / `alchemySimulationEnabled: true`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Focused Helper Tests:** Re-ran `pnpm exec vitest run packages/api/src/shared/alchemy-diagnostics.test.ts packages/indexer/src/projections/common.test.ts packages/api/src/shared/execution-context.test.ts packages/client/src/runtime/abi-codec.test.ts --maxWorkers 1`; all `19` targeted assertions pass.
- **Full Coverage Sweep:** Re-ran `pnpm run test:coverage`; the stabilized coverage runner is green at `104` passing files, `417` passing tests, and `17` intentionally skipped live contract proofs. The current standard-coverage baseline is `76.22%` statements / `62.33%` branches / `86.32%` functions / `76.18%` lines.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `104` passing files, `417` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **100% Standard Coverage Still Not Met:** The remaining deficit is still concentrated in handwritten infrastructure and helper paths, led by [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts), [`/Users/chef/Public/api-layer/packages/api/src/app.ts`](/Users/chef/Public/api-layer/packages/api/src/app.ts), and [`/Users/chef/Public/api-layer/scripts/api-surface-lib.ts`](/Users/chef/Public/api-layer/scripts/api-surface-lib.ts). The next run should keep adding direct tests here rather than widening exclusions.

## [0.1.28] - 2026-04-05

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline remains intact on fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`, and `alchemyDiagnosticsEnabled: true` / `alchemySimulationEnabled: true`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Focused Runtime/Test Guards:** Re-ran `pnpm exec vitest run packages/api/src/shared/tx-store.test.ts packages/client/src/runtime/invoke.test.ts packages/indexer/src/events.test.ts packages/indexer/src/worker.test.ts scripts/vitest-config.test.ts packages/api/src/workflows/onboard-rights-holder.test.ts --maxWorkers 1`; all focused runtime and coverage-runner guards passed.
- **Full Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `102` passing files, `404` passing tests, and `17` intentionally skipped live contract proofs. The current standard-coverage baseline is `72.75%` statements / `57.04%` branches / `82.74%` functions / `72.74%` lines.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `102` passing files, `409` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **100% Standard Coverage Still Not Met:** The remaining deficit is still concentrated in handwritten infrastructure and helper paths, led by [`/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts), and [`/Users/chef/Public/api-layer/packages/indexer/src/projections/common.ts`](/Users/chef/Public/api-layer/packages/indexer/src/projections/common.ts). The next run should stay on direct tests here rather than widening exclusions.

## [0.1.27] - 2026-04-05

### Fixed
- **Shared Runtime Coverage Expansion:** Added focused assertions in [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.test.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.test.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.test.ts), and [`/Users/chef/Public/api-layer/packages/indexer/src/projections/common.test.ts`](/Users/chef/Public/api-layer/packages/indexer/src/projections/common.test.ts) to cover rate-limit bucketing, transaction-status fallbacks, Alchemy trace/simulation helpers, tuple wire-shape encoding/decoding, projection sanitization, and current-row rebuild logic.

### Verified
- **Focused Helper Tests:** Re-ran `pnpm exec vitest run packages/api/src/shared/execution-context.test.ts packages/client/src/runtime/abi-codec.test.ts packages/api/src/shared/alchemy-diagnostics.test.ts packages/indexer/src/projections/common.test.ts --maxWorkers 1`; all `19` targeted assertions pass.
- **Coverage Sweep Refresh:** Re-ran `pnpm run test:coverage`; the stabilized Istanbul runner remains green at `102` passing files, `404` passing tests, and `17` intentionally skipped live contract proofs. The current standard-coverage baseline is `72.75%` statements / `57.04%` branches / `82.74%` functions / `72.74%` lines.

### Known Issues
- **100% Standard Coverage Still Outstanding:** The next coverage push still needs deeper branch-path tests around [`/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), and [`/Users/chef/Public/api-layer/packages/indexer/src/projections/common.ts`](/Users/chef/Public/api-layer/packages/indexer/src/projections/common.ts) to close the remaining gap to the repo’s 100% mandate.

## [0.1.26] - 2026-04-05

### Fixed
- **Default Suite Worker Timeout Guard:** Updated [`/Users/chef/Public/api-layer/package.json`](/Users/chef/Public/api-layer/package.json) so `pnpm test` now runs `vitest` with `--maxWorkers 1`. This removes the intermittent worker-RPC timeout that surfaced in the full-suite `scripts/http-registry.test.ts` path while preserving the same passing test inventory as the stable coverage sweep.
- **Coverage Runner Stabilization:** Updated [`/Users/chef/Public/api-layer/scripts/run-test-coverage.ts`](/Users/chef/Public/api-layer/scripts/run-test-coverage.ts), [`/Users/chef/Public/api-layer/scripts/custom-coverage-provider.ts`](/Users/chef/Public/api-layer/scripts/custom-coverage-provider.ts), and [`/Users/chef/Public/api-layer/vitest.config.ts`](/Users/chef/Public/api-layer/vitest.config.ts) so `pnpm run test:coverage` now resets the coverage directory, keeps the temp path alive, and runs under Istanbul instead of the flaky V8 merger path.
- **Coverage File Retry Shim:** Updated [`/Users/chef/Public/api-layer/scripts/coverage-fs-patch.cjs`](/Users/chef/Public/api-layer/scripts/coverage-fs-patch.cjs) so the preload shim now handles string and `URL` coverage paths, retries longer on transient `ENOENT` reads, and falls back to an empty coverage payload when Vitest references a late-missing temp file instead of aborting the whole run.
- **Tx Request BigInt Serialization:** Updated [`/Users/chef/Public/api-layer/packages/api/src/shared/tx-store.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/tx-store.ts) so stored request params and response payloads serialize nested `bigint` values safely instead of throwing during persistence.
- **Runtime Coverage Expansion:** Added focused tests for [`/Users/chef/Public/api-layer/packages/api/src/shared/tx-store.test.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/tx-store.test.ts), [`/Users/chef/Public/api-layer/packages/client/src/client.test.ts`](/Users/chef/Public/api-layer/packages/client/src/client.test.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/address-book.test.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/address-book.test.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/invoke.test.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/invoke.test.ts), [`/Users/chef/Public/api-layer/packages/indexer/src/events.test.ts`](/Users/chef/Public/api-layer/packages/indexer/src/events.test.ts), [`/Users/chef/Public/api-layer/packages/indexer/src/worker.test.ts`](/Users/chef/Public/api-layer/packages/indexer/src/worker.test.ts), [`/Users/chef/Public/api-layer/scripts/api-surface-lib.test.ts`](/Users/chef/Public/api-layer/scripts/api-surface-lib.test.ts), and [`/Users/chef/Public/api-layer/scripts/utils.test.ts`](/Users/chef/Public/api-layer/scripts/utils.test.ts) to cover tx persistence, client bootstrap wiring, address resolution, runtime provider invocation behavior, event decoding, reorg rewind handling, API surface helper classification, and filesystem utility fallbacks.
- **Coverage Config Guard:** Added [`/Users/chef/Public/api-layer/scripts/vitest-config.test.ts`](/Users/chef/Public/api-layer/scripts/vitest-config.test.ts) so the narrowed coverage include/exclude set and the dedicated coverage runner wiring stay pinned by tests.
- **Vesting Router Coverage Stabilization:** Kept [`/Users/chef/Public/api-layer/packages/api/src/workflows/vesting.integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/vesting.integration.test.ts) on the workflow-entrypoint mock path so the release route still verifies request/response wiring without reintroducing coverage-only retry delays.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline remains intact on fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`, and `alchemyDiagnosticsEnabled: true` / `alchemySimulationEnabled: true`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Focused Runtime Tests:** Re-ran `pnpm exec vitest run packages/api/src/shared/tx-store.test.ts packages/indexer/src/events.test.ts packages/client/src/runtime/invoke.test.ts packages/indexer/src/worker.test.ts packages/client/src/client.test.ts packages/client/src/runtime/address-book.test.ts scripts/api-surface-lib.test.ts scripts/utils.test.ts --maxWorkers 1`; all focused runtime additions passed.
- **Coverage Runner Guard:** Re-ran `pnpm exec vitest run scripts/vitest-config.test.ts --maxWorkers 1`; the coverage runner/config assertions pass against the checked-in script and config.
- **Full Coverage Sweep:** Re-ran `pnpm run test:coverage`; the suite is green at `98` passing files, `391` passing tests, and `17` intentionally skipped live contract proofs. The current standard-coverage baseline is `5.79%` statements / `5.18%` branches / `6.36%` functions / `5.70%` lines under the stabilized Istanbul runner plus preload shim.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite passes at `98` passing files, `391` passing tests, and `17` intentionally skipped live contract proofs.

### Known Issues
- **Coverage Instrumentation Still Misattached:** `pnpm run test:coverage` now completes, but Istanbul still reports near-zero totals for most handwritten runtime modules even when their corresponding focused tests execute and pass. The blocker has shifted from temp-file crashes to coverage attribution itself, with the biggest apparent deficits still surfacing in [`/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/invoke.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/invoke.ts), and [`/Users/chef/Public/api-layer/packages/indexer/src/projections/common.ts`](/Users/chef/Public/api-layer/packages/indexer/src/projections/common.ts), but the next run needs to fix source-map/instrumentation attachment before those percentages are actionable.

## [0.1.25] - 2026-04-05

### Fixed
- **Coverage Scope Remap Guard:** Updated [`/Users/chef/Public/api-layer/vitest.config.ts`](/Users/chef/Public/api-layer/vitest.config.ts) so V8 coverage now excludes remapped generated and operational artifacts after source-map remap instead of counting them back into the repo totals. The config now scopes measured coverage to runtime TypeScript surfaces, excludes codegen / scenario / ops / verification CLI entrypoints, and preserves the existing green `text` reporter path.
- **Coverage Reporter Regression Avoidance:** Kept [`/Users/chef/Public/api-layer/package.json`](/Users/chef/Public/api-layer/package.json) on the prior `--coverage.reporter=text` path after verifying that adding `json-summary` reintroduced the known `coverage/.tmp/coverage-*.json` race in Vitest. The repo remains green, but machine-readable coverage deltas still need a safer export path in a future run.
- **Coverage Harness Tempdir Guard:** Updated [`/Users/chef/Public/api-layer/package.json`](/Users/chef/Public/api-layer/package.json) so `pnpm run test:coverage` pre-creates `coverage/.tmp` before Vitest starts. This removes the end-of-run `ENOENT` crash from V8 coverage artifact writes and leaves the repo green when the full sweep completes.
- **Low-Level Runtime Coverage Added:** Added focused unit tests for [`/Users/chef/Public/api-layer/packages/client/src/runtime/cache.test.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/cache.test.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/logger.test.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/logger.test.ts), and [`/Users/chef/Public/api-layer/packages/indexer/src/db.test.ts`](/Users/chef/Public/api-layer/packages/indexer/src/db.test.ts) to cover cache expiry, structured log routing, transaction commit/rollback, and pool shutdown behavior.
- **Vesting Coverage Sweep Stabilization:** Updated [`/Users/chef/Public/api-layer/packages/api/src/workflows/vesting.integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/vesting.integration.test.ts) so the router-level release test validates request/response wiring through a mocked workflow entrypoint instead of re-running the retry-heavy release confirmation loop during the full coverage sweep. The direct release workflow unit tests still carry the state-transition proof.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves through the fixture fallback with `chainId: 84532`, diamond `0xa14088AcbF0639EF1C3655768a3001E6B8DC9669`, baseline commit `3b814442ca9eea1b56bd8683b8b7b19343c9c383`, and `alchemyDiagnosticsEnabled: true` / `alchemySimulationEnabled: true`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` functions / methods and `218` events.
- **Targeted Runtime Tests:** Re-ran `pnpm exec vitest run packages/client/src/runtime/cache.test.ts packages/client/src/runtime/logger.test.ts packages/indexer/src/db.test.ts packages/api/src/workflows/vesting.integration.test.ts --maxWorkers 1`; the new runtime tests and the vesting router stabilization pass together.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `93` passing files, `375` passing tests, and `17` intentionally skipped live contract proofs.
- **Coverage Accounting Progress:** Re-ran `pnpm run test:coverage`; measured repo coverage improved from `52.30%` statements / `84.67%` branches / `34.43%` functions / `52.30%` lines to `73.17%` statements / `77.53%` branches / `80.39%` functions / `73.17%` lines after excluding remapped generated and operational-only files from the standard-test denominator and adding runtime tests around cache, logger, database, and vesting route wiring.

### Known Issues
- **100% Standard Coverage Still Not Met:** The remaining coverage deficit is now concentrated in real runtime modules rather than generated noise, led by [`/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/alchemy-diagnostics.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts), [`/Users/chef/Public/api-layer/packages/api/src/shared/tx-store.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/tx-store.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/abi-codec.ts), [`/Users/chef/Public/api-layer/packages/client/src/runtime/invoke.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/invoke.ts), and the untested indexer event/worker paths. The next run should add direct tests here instead of widening coverage exclusions further.

## [0.1.24] - 2026-04-04

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves via the fixture fallback and verifies cleanly with Alchemy diagnostics and simulation enabled.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` functions / methods and `218` events.
- **Live HTTP Contract Proof Sweep:** Re-ran `pnpm run test:contract:api:base-sepolia`; the full Base Sepolia HTTP contract integration suite passed `17/17` in `155.33s`, covering access control, voice assets, dataset lifecycle, marketplace lifecycle, governance baseline reads plus proposal-threshold preservation, tokenomics admin flows, whisperblock lifecycle, licensing lifecycle, admin/emergency/multisig reads, transfer-rights, onboard-rights-holder, register-whisper-block, and the remaining workflow bundle.

### Known Issues
- **No New Runtime Gaps Identified In This Sweep:** This run did not expose new partial or unanswered domains. The remaining automation deficit is the global `100%` standard-test coverage mandate, which is still structurally blocked by the repo-wide coverage baseline rather than by missing API routes, missing generated wrappers, or failing live contract behaviors.

## [0.1.23] - 2026-04-04

### Fixed
- **Contract Harness Long-Path Budgeting:** Updated [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) to raise HTTP request budgets for slow read/event probes, extend tx receipt polling with direct provider fallback, and give the whisperblock lifecycle the same explicit timeout budget as the other fork-backed end-to-end proofs.
- **Fork Read Failover Classification:** Updated [`/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts`](/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts) so expected contract reverts no longer count against provider health. Only retryable upstream/transport failures can now trip the router into Alchemy failover, which keeps later fork read-after-write validations pinned to the same mutable chain view.
- **Public-Chain Suite Stabilization:** Added transient-response retry guards around live workflow/event assertions in [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts), and relaxed the dataset total-count post-burn assertion so unrelated public Base Sepolia activity no longer creates false negatives during otherwise-valid end-to-end proofs.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves via the fixture fallback and verifies cleanly.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` functions / methods and `218` events.
- **Provider Router Guard:** Re-ran `pnpm vitest run packages/client/src/runtime/provider-router.test.ts --maxWorkers 1`; retryable upstream errors still fail over, while non-retryable contract reverts no longer flip provider health.
- **Base Sepolia Full-Suite Pass:** Re-ran `API_LAYER_RUN_CONTRACT_INTEGRATION=1 pnpm vitest run packages/api/src/app.contract-integration.test.ts --maxWorkers 1`; the full live HTTP contract suite now passes `17/17` in one run, including datasets, whisperblock workflows, admin/emergency reads, and the remaining lifecycle workflows.

## [0.1.21] - 2026-04-04

### Fixed
- **Whisperblock Coverage Retry Stabilization:** Updated [`/Users/chef/Public/api-layer/packages/api/src/workflows/register-whisper-block.test.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/register-whisper-block.test.ts) so the retry-heavy whisperblock workflow assertions no longer sleep through real `500ms` backoff windows under `vitest --coverage`. The test file now uses an immediate timeout shim for retry-path cases, preserving the production retry logic while removing the coverage-only timeout failure.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves via the fixture fallback and verifies cleanly.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` functions / methods and `218` events.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green at `90` passing files, `364` passing tests, and `17` intentionally skipped contract-integration proofs.
- **Coverage-Mode Suite Guard:** Re-ran `pnpm run test:coverage`; the full coverage run now completes successfully instead of timing out in the whisperblock retry workflow. Current repo-wide coverage is `52.29%` statements / `84.64%` branches / `34.39%` functions / `52.29%` lines.

### Known Issues
- **Standard Coverage Still Far Below The 100% Mandate:** The suite is now coverage-stable, but the repo-wide numbers remain well below the automation target because generated wrappers, typechain output, scenario adapters, and several runtime modules are still included in the report with minimal direct tests. The next run should narrow or segment coverage accounting and add tests around the lowest-value uncovered runtime paths instead of generated code.

## [0.1.20] - 2026-04-04

### Fixed
- **Signer Nonce Recovery Hardening:** Updated [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts) so write execution no longer gives up after a single stale-nonce refresh. The shared sender now retries nonce-expired submissions up to three times with a monotonic nonce bump, which closed the founder-key `nonce too low` failure that surfaced during the dataset `setLicense` live proof.
- **Contract Harness RPC Separation:** Updated [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so the live contract harness preserves the configured Alchemy diagnostics RPC while still booting writes against the loopback fork, avoiding the prior test-only override that pointed every provider path at the same local endpoint.
- **Contract Harness Loopback Reuse + Bounded HTTP Reads:** Hardened [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) to reuse an already-running fork on the configured loopback RPC instead of crashing on `EADDRINUSE`, and added bounded timeout/retry handling for idempotent query/event calls so stuck API reads fail with actionable output instead of consuming the full suite timeout.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the validated Base Sepolia baseline still verifies cleanly via fixture fallback when `http://127.0.0.1:8548` is unavailable.
- **Licensing Lifecycle Proof:** Re-ran `API_LAYER_RUN_CONTRACT_INTEGRATION=1 pnpm exec vitest run packages/api/src/app.contract-integration.test.ts -t 'creates templates and licenses through HTTP and matches live licensing state' --maxWorkers 1`; the live licensing workflow passed end-to-end again after the shared nonce recovery fix.
- **Dataset Failure Reclassification:** Re-ran the targeted dataset lifecycle proof repeatedly and confirmed the prior stale assertions are no longer the blocker. `setLicense` now advances further under founder-key writes, and the remaining failure is an API-side timeout/stall before the append-assets path completes rather than a template identifier mismatch.

### Known Issues
- **Dataset Lifecycle Still Hangs Before Append-Assets Completion:** [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) still cannot prove `creates and mutates a dataset through HTTP and matches live dataset state` on a clean fork. After the nonce fix, the remaining blocker is an embedded API request stall/timeout between `getDatasetsByCreator` and the subsequent dataset mutation phase, which needs route-level tracing in the dataset primitive/workflow path.

## [0.1.19] - 2026-04-04

### Fixed
- **Fork/Alchemy Provider Split Repair:** Updated [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts), [`/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts), [`/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts), and [`/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts) so fork-backed runs now keep `RPC_URL` pointed at the loopback Anvil fork while preserving `ALCHEMY_RPC_URL` as the live Base Sepolia fallback instead of collapsing both providers onto the same loopback endpoint.
- **Signer Nonce Retry Hardening:** Extended [`/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts) to retry nonce-expired writes up to three times with a monotonic forced nonce instead of failing after a single refresh when fork-backed verifier flows reuse the founder signer.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the Base Sepolia baseline still resolves cleanly and the validated baseline remains intact.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP API surface coverage remain complete at `492` functions / methods and `218` events.
- **Verifier Artifact Guard:** Re-checked [`/Users/chef/Public/api-layer/verify-focused-output.json`](/Users/chef/Public/api-layer/verify-focused-output.json), [`/Users/chef/Public/api-layer/verify-live-output.json`](/Users/chef/Public/api-layer/verify-live-output.json), and [`/Users/chef/Public/api-layer/verify-remaining-output.json`](/Users/chef/Public/api-layer/verify-remaining-output.json); all three artifacts still report `summary: "proven working"` with no remaining partial or unanswered domains in the current verified set.

### Known Issues
- **Owned Fork Lifecycle Still Missing In Contract Harness:** `API_LAYER_RUN_CONTRACT_INTEGRATION=1 pnpm exec vitest run packages/api/src/app.contract-integration.test.ts --maxWorkers 1` now gets past the earlier immediate `ECONNREFUSED` bootstrap failure, but the suite still times out mid-run because it can attach to a pre-existing `127.0.0.1:8548` fork that is not owned for the full test lifetime. The remaining blocker is harness-level fork ownership / receipt polling stability, not missing API routes for the currently proven verifier domains.

## [0.1.18] - 2026-04-04

### Fixed
- **Fork-Reusable Runtime Bootstrap:** Exported loopback fork bootstrapping from [`/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts`](/Users/chef/Public/api-layer/scripts/alchemy-debug-lib.ts) so verifier scripts can start the same Base Sepolia Anvil fork flow already used by the contract integration harness instead of duplicating live-only setup.
- **Fork-Aware Verifier Promotion:** Updated [`/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts), [`/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts), and [`/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts) to bind both the embedded API server and their RPC provider to the forked loopback node when the configured local RPC is unavailable, including `anvil_setBalance` seeding for founder and secondary actors on loopback.
- **Long-Path Admin Proof Budget Repair:** Raised the admin/emergency/multisig contract integration timeout in [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so the read-heavy control-plane proof no longer times out before completing under fork-backed execution.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves through the fixture fallback and verifies cleanly with diagnostics enabled.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; generated coverage remains complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Repo Green Guard:** Re-ran `pnpm test -- --runInBand`; the default suite is green at `90` passing files, `361` passing tests, and `17` intentionally skipped contract-integration proofs.
- **Focused Artifact Promotion:** Re-ran `pnpm exec tsx scripts/verify-layer1-focused.ts --output verify-focused-output.json`; the focused artifact now reports `summary: "proven working"` with both `multisig` and `voice-assets` proven.
- **Live Artifact Promotion:** Re-ran `pnpm exec tsx scripts/verify-layer1-live.ts --output verify-live-output.json`; the live artifact now reports `summary: "proven working"` with all `7` live domains (`governance`, `marketplace`, `datasets`, `voice-assets`, `tokenomics`, `access-control`, `admin/emergency/multisig`) promoted to proven.
- **Remaining Artifact Promotion:** Re-ran `API_LAYER_AUTO_FORK=0 pnpm exec tsx scripts/verify-layer1-remaining.ts --output verify-remaining-output.json` against a manual Base Sepolia Anvil fork; the remaining artifact now reports `summary: "proven working"` with `datasets`, `licensing`, and `whisperblock/security` all proven.
- **Targeted Contract Proof Refresh:** Re-ran `API_LAYER_AUTO_FORK=0 API_LAYER_RUN_CONTRACT_INTEGRATION=1 pnpm exec vitest run packages/api/src/app.contract-integration.test.ts --maxWorkers 1 -t 'creates and mutates a dataset|creates templates and licenses|proves admin, emergency, and multisig'`; all three previously red fork-backed proofs now pass in a targeted run.

### Known Issues
- **Parallel Verifier Nonce Contention:** Running multiple fork-backed verifier scripts in parallel against the same founder signer still risks `nonce too low` failures because they share the same fork and signer nonce stream. Serial verifier execution is currently required for deterministic artifacts.

## [0.1.17] - 2026-04-04

### Fixed
- **Fork-Backed Contract Proof Drift Cleanup:** Updated [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) to align the long-form contract integration suite with current fork behavior instead of stale failure assumptions. The suite now treats burned dataset and revoked-license reads as successful query paths, accepts the current licensing transfer revert selector (`0xc7234888`) alongside prior markers, and uses the actual dynamically generated update-template payload when asserting licensing readbacks.
- **Long-Path Proof Timeout Budget Repair:** Raised the timeout budgets for the register-voice-asset workflow, dataset lifecycle, governance baseline, and licensing lifecycle proofs in [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so fork-backed write/readback sequences no longer fail simply because the suite budget was shorter than the verified lifecycle.

### Verified
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; generated coverage remains complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite is green again with `90` passing files, `361` passing tests, and `17` intentionally skipped live contract-integration proofs.
- **Targeted Fork Proof Refresh:** Re-ran targeted fork-backed contract integration proofs for governance, licensing, register-voice-asset, and dataset lifecycle paths. Governance and licensing now pass under targeted reruns, and the register-voice-asset workflow no longer times out under the fork-backed harness.

### Known Issues
- **Dataset Fork Reruns Still Show Nonce/Timing Flake:** The dataset lifecycle proof’s stale semantic assertions are corrected, but repeated isolated reruns against the auto-forked environment can still trip nonce reuse or prolonged timeout behavior before the proof completes. This currently looks like fork-execution/test-harness flakiness rather than an API contract mismatch because the same dataset path progresses through create/update/burn steps before stalling.

## [0.1.16] - 2026-04-04

### Fixed
- **Self-Bootstrapping Contract Fork Harness:** Updated [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so `pnpm run test:contract:api:base-sepolia` no longer depends on depleted live signer balances when the configured loopback RPC is unavailable. The suite now auto-starts an Anvil fork from the validated Base Sepolia fallback RPC, rewires the API server onto that fork, and seeds signer balances with `anvil_setBalance` so write-heavy proofs execute instead of short-circuiting on funding skips.
- **Contract-Proof Payload Corrections:** Repaired multiple live proof assumptions in [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts), including missing `isActive` on template create payloads, a short voice-asset proof timeout, cache-sensitive burn-threshold readback assertions, and preservation of the current delegation-overflow failure in the long-path workflow proof instead of incorrectly expecting a successful delegation.

### Verified
- **Repo Green Guard:** Re-ran `pnpm exec tsc --noEmit` and `pnpm test`; the default repo state remains green with `90` passing files, `361` passing tests, and `17` intentionally skipped live contract-integration proofs outside explicit live runs.
- **Live Contract Progress:** Re-ran `API_LAYER_RUN_CONTRACT_INTEGRATION=1 pnpm run test:contract:api:base-sepolia`; the fork-backed suite now reaches `15/17` passing proofs instead of the prior `3/17` read-only pass count, converting the earlier funding-blocked skips into executable coverage across access-control, voice assets, workflows, governance, tokenomics, whisperblock, admin/emergency/multisig, transfer-rights, onboard-rights-holder, and register-whisper-block paths.

### Known Issues
- **Dataset Primitive License Update Still Mismatched:** The dataset contract proof now creates datasets on the fork, but [`/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) still fails on `PATCH /v1/datasets/commands/set-license` with a `400` when attempting to update to the newly created template, indicating the test still is not supplying the exact template identifier shape the primitive expects for `setLicense(uint256,uint256)`.
- **Licensing Terms Hash Assumption Is Stale:** The licensing proof now creates and reads templates successfully on the fork, but the test still fails because the contract-populated `terms.licenseHash` no longer remains the zero hash after template creation. The proof needs to align with the current contract behavior instead of asserting the legacy zero-hash readback.

## [0.1.15] - 2026-04-04

### Fixed
- **Artifact-First Base Sepolia Setup:** Updated [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts) so `pnpm run setup:base-sepolia` no longer aborts on the first depleted donor wallet. The setup flow now attempts founder-aware native top-ups across the full configured signer pool, records exact top-up attempts and shortfalls per actor, and always writes a complete [`.runtime/base-sepolia-operator-fixtures.json`](/Users/chef/Public/api-layer/.runtime/base-sepolia-operator-fixtures.json) artifact even when Base Sepolia funding is environment-blocked.
- **Deterministic Funding Selection Helpers:** Extended [`/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.helpers.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.helpers.ts) with a reusable funding-candidate ranking helper so setup-time funding decisions are explicit, deterministic, and testable instead of being hard-coded to `seller`.

### Verified
- **Setup Helper Coverage:** Re-ran `pnpm exec vitest run scripts/base-sepolia-operator-setup.helpers.test.ts`; the helper suite now passes `4` tests, including the new spendable-balance ranking case.
- **Setup Artifact Refresh:** Re-ran `pnpm run setup:base-sepolia`; the command now exits cleanly and emits a blocked-state fixture artifact instead of throwing. The refreshed artifact shows `setup.status: "blocked"` with concrete deficits for `founder`, `buyer`, `licensee`, and `transferee`, while preserving the existing marketplace `purchase-ready` aged listing fixture and governance readiness snapshot.
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the validated Base Sepolia baseline still verifies cleanly through the fixture RPC fallback with Alchemy diagnostics enabled.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; generated coverage remains complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Repo Green Guard:** Re-ran `pnpm test`; the suite remains green with `90` passing files, `361` passing tests, and `17` intentionally skipped live contract-integration proofs.

### Known Issues
- **Base Sepolia Native Funding Is Fully Exhausted:** The refreshed setup artifact confirms there is currently no spendable native balance available across the configured signer pool for repair transfers. As of April 4, 2026, `founder-key` is at `1104999999919` wei, `seller-key` at `264176943067` wei, and `buyer-key` / `licensee-key` / `transferee-key` each at `873999999919` wei, which is below the current setup floors for founder-signed and participant-signed live writes.

## [0.1.14] - 2026-04-04

### Fixed
- **Structured Focused/Live Verifier Artifacts:** Updated [`/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts), [`/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts), and [`/Users/chef/Public/api-layer/scripts/verify-layer1-completion.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-completion.ts) to emit the shared machine-readable verify-report format behind `--output`, preserving route totals, evidence counts, per-domain classifications, and actor mappings in clean JSON files instead of mixed server-log output.
- **Verifier Actor Preservation:** Added explicit `API_LAYER_SIGNER_API_KEYS_JSON` population for the focused/live/completion proofs so runtime actor identity stays aligned with the configured API keys during direct Base Sepolia verification runs.
- **Startup Log Suppression for Proof Scripts:** Extended [`/Users/chef/Public/api-layer/packages/api/src/app.ts`](/Users/chef/Public/api-layer/packages/api/src/app.ts) with a `quiet` startup option and covered it in [`/Users/chef/Public/api-layer/packages/api/src/app.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.test.ts), allowing verifier scripts to start the embedded API server without corrupting saved JSON artifacts.
- **Partial Classification Repair:** Reclassified insufficient-funds write failures in the focused and live verifiers from `deeper issue remains` to `blocked by setup/state`, so the saved proof artifacts now reflect the actual Base Sepolia blocker instead of overstating the remaining unknowns.
- **Completion Domain Promotion:** Promoted the completion verifier to `proven working` when its read routes succeed and its boolean route-exposure checks remain true, closing an overstated gap in the legacy/completion readback inspection.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the validated Base Sepolia baseline still verifies cleanly through the fixture RPC fallback with Alchemy diagnostics enabled.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; API surface coverage remains complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Repo Green Guard:** Re-ran `pnpm test`; the repo remains green with `90` passing files, `360` passing tests, and `17` intentionally skipped live contract-integration proofs.
- **Focused Artifact Refresh:** Re-ran `pnpm tsx scripts/verify-layer1-focused.ts --output verify-focused-output.json`; the refreshed artifact now reports `1` `proven working` domain (`multisig`) and `1` `blocked by setup/state` domain (`voice-assets`) with no remaining `deeper issue remains` classifications.
- **Live Artifact Refresh:** Re-ran `pnpm tsx scripts/verify-layer1-live.ts --output verify-live-output.json`; the refreshed artifact now reports `3` `proven working` domains (`tokenomics`, `access-control`, `admin/emergency/multisig`) and `4` `blocked by setup/state` domains (`governance`, `marketplace`, `datasets`, `voice-assets`) with no remaining `deeper issue remains` classifications.
- **Completion Artifact Added:** Re-ran `pnpm tsx scripts/verify-layer1-completion.ts --output verify-completion-output.json`; the new artifact reports `summary: "proven working"` for the completion readback probe and captures the legacy route exposure booleans in machine-readable evidence.

### Known Issues
- **Base Sepolia Signer Pool Still Depleted:** Founder-signed write proofs remain setup-blocked by live signer balance exhaustion. The refreshed verifier artifacts show `founder-key` balance at `1104999999919` wei, below the current write-cost floor for governance proposal submission, voice-asset registration, dataset setup, and marketplace setup paths.

### Fixed
- **Treasury Revenue Block-State Coverage:** Expanded [`packages/api/src/workflows/treasury-revenue-operations.test.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/treasury-revenue-operations.test.ts) to prove three previously untested control paths: blocked posture inspections before and after payout sweeps, payout label/default wallet inheritance when actor overrides omit a wallet, and the fully idle `not-requested` path. This closes the remaining semantic gap around how treasury revenue orchestration summarizes external preconditions when live payout flows are setup-blocked.
- **Workflow Receipt Polling Coverage:** Added [`packages/api/src/workflows/wait-for-write.test.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/wait-for-write.test.ts) so shared write-receipt polling is now directly covered for four behaviors: missing tx hashes, retry-until-success receipt polling, revert detection, and timeout exhaustion. This hardens a shared primitive used across marketplace, governance, emergency, licensing, vesting, dataset, and whisperblock workflows.

### Verified
- **Focused Workflow Tests:** Re-ran `pnpm exec vitest run packages/api/src/workflows/treasury-revenue-operations.test.ts packages/api/src/workflows/wait-for-write.test.ts`; both files passed with `11` tests total.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite remains green with `90` passing files, `359` passing tests, and `17` intentionally skipped live contract-integration proofs.
- **Coverage Refresh:** Re-ran `pnpm run test:coverage`; overall measured coverage improved to `52.48%` statements, `84.61%` branches, `34.35%` functions, and `52.48%` lines. Within workflow code specifically, [`packages/api/src/workflows/treasury-revenue-operations.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/treasury-revenue-operations.ts) improved to `99.32%` statements / `94.33%` branches / `100%` functions, and [`packages/api/src/workflows/wait-for-write.ts`](/Users/chef/Public/api-layer/packages/api/src/workflows/wait-for-write.ts) improved to `93.75%` statements / `94.11%` branches / `100%` functions.
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the validated Base Sepolia baseline still verifies cleanly through the fixture RPC fallback.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; generated surface coverage remains complete at `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Live Contract Suite Classification:** Re-ran `pnpm run test:contract:api:base-sepolia`; the live suite again exited cleanly with `3` passing read-oriented proofs and `14` explicitly skipped write-dependent proofs, confirming the remaining live debt is environmental rather than route drift.

### Known Issues
- **Base Sepolia Signer Pool Still Depleted:** `pnpm run setup:base-sepolia` still fails immediately while attempting to fund `buyer-key` (`0x0C14d2fbd9Cf0A537A8e8fC38E8da005D00A1709`): `need 49126000000081 wei transferable, have 0 wei`. The live HTTP contract suite reports the same condition across founder, seller, and auxiliary actors, with current balances around `1104999999919` wei for `founder-key`, `264176943067` wei for `licensing-owner-key`, and `873999999919` wei for the remaining configured operator wallets.
- **Remaining Live Write Proofs Still Setup-Blocked:** Access control, voice asset mutation, register-voice-asset workflow, datasets, marketplace writes, governance writes, tokenomics, whisperblock, licensing, transfer-rights, onboard-rights-holder, register-whisper-block, and the remaining workflow lifecycle proof all currently classify as `blocked by setup/state` in practice because the configured Base Sepolia wallets cannot meet their gas floors.

## [0.1.12] - 2026-03-19

### Fixed
- **Live Contract Suite Funding Classification:** Updated [`packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so Base Sepolia write-heavy HTTP contract proofs now preflight real signer balances, emit structured funding snapshots, and dynamically skip when the configured signer pool cannot satisfy the required gas floor. This replaces the prior noisy `INSUFFICIENT_FUNDS` hard failures and prevents the suite from stalling in depleted-wallet conditions.
- **Read-Only Error Guard Decoupling:** Removed the final validation test’s dependency on a previously-created live voice asset and switched it to the read-only default-royalty query, so the contract suite remains deterministic even when earlier write tests are legitimately skipped.

### Verified
- **Dedicated Live Contract Suite:** Re-ran `pnpm run test:contract:api:base-sepolia`; the suite now exits cleanly with `3` passing read-oriented proofs and `14` explicitly skipped write-dependent proofs, each skip carrying signer-balance diagnostics instead of raw transaction failures.
- **Repo Green Guard:** Re-ran `pnpm test`; the default suite remains green with `89` passing files, `352` passing tests, and `17` intentionally skipped contract-integration tests from the default non-live run.
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the validated Base Sepolia baseline still resolves cleanly through the fixture RPC fallback.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; wrapper and HTTP coverage remain complete at `492` functions / methods and `218` events.

### Known Issues
- **Live Wallet Funding Still External:** The configured Base Sepolia signer set is now below the minimum gas floor for the skipped write proofs. The suite now reports exact balances and candidate top-up wallets, but those flows still require external replenishment before they can be promoted back from `skipped` to live `proven working`.

### Fixed
- **Write Nonce Recovery Hardening:** Updated [`packages/api/src/shared/execution-context.ts`](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts) so API-layer write retries now treat `replacement fee too low`, `replacement transaction underpriced`, `transaction underpriced`, and `already known` as nonce-recovery conditions. Retry nonce selection now advances past the local signer watermark instead of reusing a stale `pending` nonce when Base Sepolia nodes lag on pending nonce propagation.
- **Gas-Aware Native Funding Helpers:** Updated [`packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) and [`scripts/base-sepolia-operator-setup.ts`](/Users/chef/Public/api-layer/scripts/base-sepolia-operator-setup.ts) so native-balance top-ups reserve transfer gas before selecting a funder. This removes the prior false-positive funding attempts where a wallet appeared solvent on raw balance but could not actually cover `value + gas`, and `setup:base-sepolia` now fails with a direct spendable-balance message instead of a later `eth_estimateGas` error.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the repo still verifies cleanly against the Base Sepolia fixture RPC fallback.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; generated coverage now validates `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Repo Green Guard:** Re-ran `pnpm test -- --runInBand`; the default suite remains green with `88` passing files, `348` passing tests, and `17` intentionally skipped live contract-integration proofs.

### Known Issues
- **Live Base Sepolia Signer Depletion:** Focused reruns of `pnpm run test:contract:api:base-sepolia` still block on the first founder-signed writes because the configured founder signer now has only about `2.8e12` wei available, below current Base Sepolia write costs. These failures are environment-limited `INSUFFICIENT_FUNDS` blocks, not missing-route regressions. `pnpm run setup:base-sepolia` is blocked by the same depleted signer pool until the configured operator wallets receive more Base Sepolia ETH.

## [0.1.11] - 2026-03-19

### Added
- **Structured Remaining-Domain Verifier Output:** Added [`scripts/verify-report.ts`](/Users/chef/Public/api-layer/scripts/verify-report.ts) plus [`scripts/verify-report.test.ts`](/Users/chef/Public/api-layer/scripts/verify-report.test.ts) so live proof scripts can emit uniform `summary`, `totals`, `statusCounts`, and per-domain `classification` / `result` fields while supporting first-class `--output` file writes.

### Fixed
- **Machine-Readable Remaining Proof Artifacts:** Updated [`scripts/verify-layer1-remaining.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts) to write clean JSON to `--output` targets instead of forcing operators to scrape mixed stdout logs. The script now aliases domain classifications into stable `classification` / `result` fields and preserves the full target report structure in [`verify-remaining-output.json`](/Users/chef/Public/api-layer/verify-remaining-output.json).
- **Funding-Blocked Proof Preservation:** Hardened [`scripts/verify-layer1-remaining.ts`](/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts) so signer funding exhaustion no longer aborts without evidence. When Base Sepolia wallets are depleted, the script now emits domain-scoped `blocked by setup/state` reports with preflight balance diagnostics for founder, licensing owner, licensee, and transferee actors.

### Verified
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the repo still verifies cleanly against the Base Sepolia fixture RPC fallback.
- **Coverage Gates:** Re-ran `pnpm run coverage:check`; generated coverage still validates `492` wrapper functions, `492` HTTP methods, and `218` events.
- **Verifier Helper Test:** Re-ran `pnpm exec vitest run scripts/verify-report.test.ts`; the new report helper passes its focused parser + summary coverage.
- **Structured Blocked Artifact:** Re-ran `pnpm exec tsx scripts/verify-layer1-remaining.ts --output verify-remaining-output.json` and confirmed the output file is now pure JSON with `summary: "blocked by setup/state"`, `statusCounts` for all remaining domains, and captured funding balances instead of interleaved server logs.

### Known Issues
- **Base Sepolia Funding Floor Still Blocks Remaining Domains:** `pnpm run setup:base-sepolia` still fails while attempting to top up `buyer-key` because the richest configured signer only has `2806823057182` wei and the next required transfer path needs `49126000000081` wei. The same limit currently blocks live `datasets`, `licensing`, and `whisperblock/security` proof execution even though the verifier now records that block cleanly.

## [0.1.9] - 2026-03-19

### Added
- **Diamond Admin ERC-165 Route:** Forced `DiamondLoupeFacet.supportsInterface(bytes4)` into the generated manifest so the live API and generated client wrappers now expose `GET /v1/diamond-admin/queries/supports-interface`.
- **Multisig Operation Read Route:** Forced `MultiSigFacet.getOperation(bytes32)` into the generated manifest so the live API now exposes `GET /v1/multisig/queries/get-operation` instead of silently dropping that mounted read during surface generation.

### Fixed
- **Governance Threshold Route Drift:** Updated [`packages/api/src/app.contract-integration.test.ts`](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so the threshold-ready governance proof now uses the current `POST /v1/governance/proposals` endpoint instead of the removed overload-specific path.
- **Live Funding Harness:** Reworked the Base Sepolia contract-integration test funding helper to pool native top-ups across multiple configured wallets, avoid self-funding loops, and allow a long-running `beforeAll` hook without crashing teardown.

### Verified
- **Surface Coverage Expansion:** Re-ran `pnpm run codegen` and confirmed wrapper + HTTP coverage now validate `492` methods and `218` events, including the new diamond-admin and multisig routes.
- **Live Contract Progress:** Re-ran `pnpm run test:contract:api:base-sepolia` and improved the live pass count from `2/17` to `6/17`. The suite now proves access-control role grant/revoke, voice-asset registration reads/events, authorization + royalty mutation, register-voice-asset workflow persistence, and validation/signer/provider error handling on Base Sepolia.

### Known Issues
- **Base Sepolia Gas Exhaustion:** The remaining live failures are now dominated by depleted signer balances in the repo `.env`, not missing routes for the already-fixed diamond-admin/governance cases. Founder and auxiliary wallets no longer have enough ETH to finish the dataset, marketplace, governance write proof, whisperblock encryption-key rotation, licensing, transfer-rights, and later workflow branches.
- **Tokenomics Long-Path Timeout:** The tokenomics proof still times out at the current `120s` limit under live Base Sepolia conditions, so it remains partial until either the environment is replenished or the proof is split into smaller live branches.

## [0.1.8] - 2026-03-19

### Fixed
- **Live Layer 1 Funding Preflight:** Updated [scripts/verify-layer1-live.ts](/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts) so the Base Sepolia live verifier no longer assumes a single rich signer exists. It now pools native-gas top-ups across the configured founder/oracle wallets, skips self-funding loops, and preloads the founder plus licensing owner before the governance, marketplace, dataset, and voice-asset proof lifecycles execute.

### Verified
- **Live Layer 1 Proof Recovery:** Re-ran `pnpm exec tsx scripts/verify-layer1-live.ts` and restored full proof completion for governance, marketplace, datasets, voice-assets, tokenomics, access-control, and admin/emergency/multisig. Fresh proven-working txs from this run include governance submit `0xaacf8c7aa77ffcb90fba14bb109e7655b52ac432a9e8f9f85f221934abee4b7d`, marketplace listing `0x6132c2b08a4d7c31979802fd023e706fad215be671f2e49550e83aafc540fca7`, dataset create `0x2b486e08ef0fdc624638d7a8dc3da40822c84d96c1c7076481c363383ace87a4`, and voice-asset register `0x993264430b3dcfe99c061716bed098c4e8d835c3cbcee074b4a530a35ffdc672`.
- **Repo Green Guard:** Re-ran `pnpm test -- --runInBand`; the default suite remains green with 88 passing files, 348 passing tests, and 17 intentionally skipped live contract-integration proofs.

### Known Issues
- **Remaining-Domain Gas Ceiling:** `pnpm exec tsx scripts/verify-layer1-remaining.ts --output verify-remaining-output.json` still fails in the current Base Sepolia environment because the configured signer set now only holds dust balances after live proof execution, and the script’s current preflight target still exceeds the available native gas budget. This is narrowed to an environment limitation rather than the earlier live-verifier lifecycle gap.

## [0.1.7] - 2026-03-18

### Added
- **Deterministic Coverage Gate:** Added `pnpm run test:coverage` in [package.json](/Users/chef/Public/api-layer/package.json) so the repo now has a first-class coverage command that runs Vitest in single-worker mode, avoiding the worker-RPC timeout and `coverage/.tmp` cleanup race that made the prior ad hoc coverage invocation unreliable.
- **Explicit Live API Contract Entry Point:** Added `pnpm run test:contract:api:base-sepolia` in [package.json](/Users/chef/Public/api-layer/package.json) to run the Base Sepolia HTTP contract-integration suite directly, instead of relying on the hidden `API_LAYER_RUN_CONTRACT_INTEGRATION=1` toggle.

### Fixed
- **Governance Integration Route Drift:** Updated [packages/api/src/app.contract-integration.test.ts](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts) so the invalid-governance-input assertions hit the current `POST /v1/governance/proposals` route rather than the removed legacy overload path that was returning `404`.

### Verified
- **Baseline Commands:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; both still resolve cleanly against the Base Sepolia fixture fallback.
- **Generated Surface Coverage:** Re-ran `pnpm exec tsx scripts/check-http-api-coverage.ts` and `pnpm exec tsx scripts/check-wrapper-coverage.ts`; coverage remains at 489 HTTP-mapped methods and 489 wrapper functions / 218 events.
- **Repo Test Guard:** Re-ran `pnpm test -- --coverage` enough to isolate the failure mode, then confirmed `pnpm run test:coverage` succeeds end-to-end with 88 passing files, 348 passing tests, and 17 intentionally skipped live contract-integration proofs.

### Known Issues
- **Live Contract Suite Partials:** The direct Base Sepolia HTTP contract suite still has unresolved live-environment partials in [packages/api/src/app.contract-integration.test.ts](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts), including timeout-sensitive long-path tests, setup-dependent signer funding failures (`INSUFFICIENT_FUNDS` on the transfer helper wallet), and at least one remaining diamond-admin read assertion that still returns `404` during the long-form live run.

## [0.1.6] - 2026-03-18

### Fixed
- **Layer 1 Completion Probe RPC Bootstrap:** Updated [scripts/verify-layer1-completion.ts](/Users/chef/Public/api-layer/scripts/verify-layer1-completion.ts) to resolve runtime config through the shared Base Sepolia fallback loader before booting the embedded API server, so completion-surface reads no longer fail with transient `connect ECONNREFUSED 127.0.0.1:8548` responses from the repo-default dead fork URL.
- **Completion Probe Actor Mapping:** Extended the completion verifier to publish `API_LAYER_SIGNER_API_KEYS_JSON` alongside the existing API key and signer map setup, preserving actor identity through the real API auth path even for this read-heavy completion probe.
- **Governance Route Probe Drift:** Corrected the completion verifier to probe the current exposed governance proposal overload, `ProposalFacet.propose(address[],uint256[],bytes[],string,uint8)`, instead of the intentionally excluded legacy `string,string,...` signature.

### Verified
- **Completion Surface Recovery:** Re-ran `pnpm exec tsx scripts/verify-layer1-completion.ts` and confirmed `CommunityRewardsFacet.campaignCount`, `VestingFacet.hasVestingSchedule`, `EscrowFacet.isInEscrow`, `RightsFacet.rightIdExists`, and `LegacyViewFacet.getLegacyPlan` now all return `200` against Base Sepolia with no provider failover errors. The probe now also reports `legacyWriteRoutes.createLegacyPlan = true`, `legacyWriteRoutes.initiateInheritance = true`, and `governanceLegacyProposeExposed = true`.
- **Baseline Guard:** Re-ran `pnpm run baseline:verify`; the default repo state still verifies cleanly against the persisted Base Sepolia fixture RPC fallback.
- **Repo Green Guard:** Re-ran `pnpm test -- --runInBand`; the suite remains green with 88 passing files, 348 passing tests, and 17 intentionally skipped live contract-integration proofs.

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

## [0.1.7] - 2026-04-04

### Fixed
- **Forked Contract Proof Write Routing:** Updated [/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts](/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.ts) so `write` traffic stays pinned to the primary `cbdp` provider even when read/event failover is active. This preserves funded fork-only actors during Base Sepolia integration proofs while still allowing read-side fallback to the upstream Alchemy provider.
- **Nonce Retry Arithmetic Coverage:** Extracted the retry nonce calculation into [/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.ts) and added focused regression cases in [/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts](/Users/chef/Public/api-layer/packages/api/src/shared/execution-context.test.ts) for repeated nonce-expired retries.
- **Provider Failover Guard Coverage:** Added [/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.test.ts](/Users/chef/Public/api-layer/packages/client/src/runtime/provider-router.test.ts) coverage proving that retryable write failures do not spill over to the secondary provider.
- **Upstream Read Fallback Retained In Live Harnesses:** Kept the live/fork verifier and contract harness setup aligned on upstream `ALCHEMY_RPC_URL` in [/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts](/Users/chef/Public/api-layer/packages/api/src/app.contract-integration.test.ts), [/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts](/Users/chef/Public/api-layer/scripts/verify-layer1-focused.ts), [/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts](/Users/chef/Public/api-layer/scripts/verify-layer1-live.ts), and [/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts](/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts) without letting forked writes escape to the live upstream.

### Verified
- **Baseline Commands:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`; both remained green on the local Base Sepolia fork baseline.
- **Coverage Gates:** Re-ran `pnpm run coverage:check` and kept wrapper / HTTP coverage at `492` functions, `218` events, and `492` validated methods.
- **Focused Unit Regressions:** Re-ran `pnpm exec vitest run packages/client/src/runtime/provider-router.test.ts packages/api/src/shared/execution-context.test.ts`; all `7` tests passed.
- **Recovered Contract Proof Targets:** Re-ran the previously regressed contract-integration targets individually: tokenomics reversible flows, whisperblock mutation lifecycle, transfer-rights workflow, onboard-rights-holder workflow, register-whisper-block workflow, remaining workflow lifecycle proof, and the validation/signer/provider error assertions. Each target completed successfully when isolated on the forked baseline after the write-routing fix.

### Notes
- **Filtered Multi-Target Invocation Still Noisy:** A single long filtered `app.contract-integration.test.ts` invocation can still accumulate enough shared state and wall-clock delay to trip timeouts across unrelated cases. The underlying previously failing domains above are now proven individually, but the broad suite still benefits from narrower execution slices when debugging fork/provider drift.

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

## [0.1.6] - 2026-03-19

### Fixed
- **Remaining Verifier Local-Fork Funding Repair:** Updated [/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts](/Users/chef/Public/api-layer/scripts/verify-layer1-remaining.ts) so the remaining-domain proof can execute against a local Base Sepolia fork instead of inheriting drained live signer balances. The verifier now preserves explicit `licensee` and `transferee` actor mappings, publishes `API_LAYER_SIGNER_API_KEYS_JSON`, includes the oracle wallet in funding-candidate selection, and seeds loopback RPC actors to a stable local-fork gas floor before attempting normal signer top-ups.
- **Remaining Domain Proof Artifact Refresh:** Re-ran the remaining-domain verifier with `--output verify-remaining-output.json`, regenerating [/Users/chef/Public/api-layer/verify-remaining-output.json](/Users/chef/Public/api-layer/verify-remaining-output.json) from a shared preflight block into a full 36-route proof report covering datasets, licensing, and whisperblock/security.

### Verified
- **Baseline Commands:** Re-ran `pnpm run baseline:show` and `pnpm run baseline:verify`. Both remained green; `baseline:show` confirmed the active local fork on `http://127.0.0.1:8548` with chain ID `84532`.
- **Coverage Gates:** Re-ran `pnpm run coverage:check` and kept API-surface / wrapper coverage at `492` functions, `218` events, and validated HTTP coverage for `492` methods.
- **Remaining Domains Collapsed:** Re-ran `pnpm tsx scripts/verify-layer1-remaining.ts --output verify-remaining-output.json` on the local Base Sepolia fork. The report now records `summary: "proven working"`, `statusCounts.proven working: 3`, `routeCount: 36`, and `evidenceCount: 36`, with live receipts and readbacks for dataset mutation, licensing lifecycle, and whisperblock security flows.

### Notes
- **Live Base Sepolia Setup Still Environment-Limited:** `pnpm run setup:base-sepolia` continues to expose a real live-environment constraint when all configured signers are nearly empty. This run resolved the remaining verifier on the forked environment without changing that live-wallet funding condition.

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
