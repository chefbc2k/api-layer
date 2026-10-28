# Gap Builder Plan

Generated: `2026-10-28T10:09:26.545Z`
Source gap report: `2026-10-28T10:09:24.292Z`

## Summary

- Non-ready items in scope: `1`
- Selected this run: `1`

## ProposalFacet

Reduce ProposalFacet launch blockers across 1 gap item.

- `ProposalFacet.propose(string,string,address[],uint256[],bytes[],uint8)` (unsafe on live network)
  - Endpoint: `ABI-only`
  - Required work: Add fail-closed live-network gating plus focused negative-path coverage before any live execution. Add or refresh local-fork/Base Sepolia verification artifact evidence for the mounted route.

Verification: `pnpm run test:gap-report`, `pnpm run coverage:check`, `pnpm run test:actor-negative-paths`

