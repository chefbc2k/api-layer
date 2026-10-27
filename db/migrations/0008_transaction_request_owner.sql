-- Keep legacy rows intact but inaccessible through API owner lookup until audited reassignment.
alter table tx_requests add column if not exists owner_hash text
  check (owner_hash is null or owner_hash ~ '^[0-9a-f]{64}$');
create index if not exists tx_requests_owner_hash_idx on tx_requests (owner_hash, id)
  where owner_hash is not null;
-- Private API records must not be reachable through the browser database API either.
-- Service-only storage access is combined with explicit owner predicates in the API.
revoke all on tx_requests from public, anon, authenticated;
grant select, insert, update on tx_requests to service_role;
