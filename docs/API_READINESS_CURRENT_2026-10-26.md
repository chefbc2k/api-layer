# Scoped API readiness update — October 26, 2026

This is the transaction-request privacy workstream's update. It does not replace the independent Coinbase acceptance ledger or exact-method receipt/indexer proof artifact.

| Acceptance item | Starting open | Required this run | Accepted completion |
| --- | ---: | ---: | --- |
| Private transaction-request authentication, ownership and durable isolation | 1 | 1 (rounded-up 25%) | Pending verified delivery receipt |

The implementation binds direct, signature and smart-wallet request records to a server-provisioned principal (or isolated API key) plus logical signer. Customer lookup authenticates, scopes the SQL query to that identity, hides internal hashes and returns non-disclosing errors. Legacy records remain preserved and inaccessible; shared wallet addresses, labels, forged headers and administrator roles do not authorize access. A migration also prevents browser database roles from directly reading private rows. Public on-chain transaction receipts remain public.

The production deployment still needs migration 0008 before the secured API binary. This automation does not deploy services or modify production databases. Default-branch source delivery is tracked separately from rollout. See [the privacy build log](./API_TRANSACTION_REQUEST_PRIVACY_BUILD_LOG.md) for rollout, rotation, recovery and verification details.

Other funding/frontend, Coinbase acceptance, settlement and ABI write-proof items remain owned by their existing workstreams. No overall production percentage or completion of those other items is claimed here. The October 25 current-readiness files named in the automation prompt were not present in this run's fetched remote baseline; this update records the observed baseline explicitly.
