# Launch Implementation Gaps

This file is the launch-side backlog for gaps that are not fully represented by ABI fixture counts.
Automation must treat these as implementation work, not documentation-only findings.

## Required Before Office 2.0 Public Launch

| Area | Current state | Required implementation |
| --- | --- | --- |
| Browser application connectivity | API now supports environment-driven CORS through `API_LAYER_ALLOWED_ORIGINS`. | Configure production allowed origins and keep preflight coverage green for every application domain. |
| Client isolation | API keys exist, but launch clients can still be forced into shared-key throttling if provisioned manually. | Add automated per-client key issuance, role assignment, wallet binding, and revocation workflow. |
| Rate limits | Upstash/local read/write/gasless limits exist. | Configure production Upstash, add per-client limits, and add write queue/backoff for 100-200 clients. |
| Fiat/card checkout | Smart contracts and CDP smart-wallet calls exist, but Stripe/Coinbase checkout is not implemented. | Add checkout provider abstraction, payment-intent/checkout creation, webhook verification, settlement reconciliation, and failed-payment recovery. |
| KYC/KYB and sanctions | No enforced KYC/KYB gate exists before listing, sale, payout, or investment-like participation. | Add identity/business verification status storage, provider webhooks, sanctions/wallet-risk gate, and workflow guards. |
| Content and rights review | Ownership checks exist for commercialization workflows. | Add content moderation, rights-review approval, and provenance gates before dataset/listing sale deployment. |
| Marketplace launch proof | Marketplace purchase and listing workflows exist, with remaining fixture/indexer gaps. | Reduce `needs fixture` and `needs indexer proof` counts for marketplace/payment events and refresh verification artifacts. |
| Governance/investing launch proof | Governance workflows exist, but sale participation and investor eligibility are not represented as an end-to-end gate. | Add eligibility checks, disclosure acknowledgement, jurisdiction gating, and governance onboarding proof. |
| Observability | Health/provider routes exist. | Add request IDs, structured logs, alerting, error budget thresholds, and dashboard checks for failed writes/webhooks/rate-limit pressure. |

## Automation Contract

Every gap-builder automation run must:

1. Run `pnpm run report:test-gaps` and `pnpm run gap-builder:plan`.
2. Select a batch of at least 10 non-ready items unless fewer than 10 remain.
3. Make source or test changes that target the selected batch.
4. Run the verification commands named in `output/gap-builder-plan.md`.
5. Regenerate `output/api-test-gap-report.json`, `output/api-test-gap-report.md`, `output/gap-builder-plan.json`, and `output/gap-builder-plan.md`.
6. Refuse to close as successful if it only changes generated reports or timestamps.
