create table if not exists funding_purchase_requests (
 id uuid primary key default gen_random_uuid(),
 user_id text not null,
 wallet_address text not null check(wallet_address ~ '^0x[0-9a-f]{40}$'),
 funding_attempt_id uuid not null references funding_attempts(id),
 sandbox boolean not null,
 chain_id bigint not null check(chain_id in (8453,84532)),
 intent jsonb not null,
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 tx_hash text check(tx_hash ~ '^0x[0-9a-f]{64}$'),
 proof jsonb,
 confirmed_at timestamptz,
 unique(chain_id,tx_hash)
);
alter table funding_purchase_requests enable row level security;
revoke all on funding_purchase_requests from public,anon,authenticated;
grant select,insert,update on funding_purchase_requests to service_role;
drop policy if exists funding_purchase_service on funding_purchase_requests;
create policy funding_purchase_service on funding_purchase_requests to service_role using(true) with check(true);
