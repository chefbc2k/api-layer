create table if not exists funding_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null check (length(user_id) between 1 and 64),
  kind text not null check (kind in ('headless', 'hosted')),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  quote_id uuid references funding_quotes(id),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  chain_id bigint not null check (chain_id in (8453, 84532)),
  sandbox boolean not null,
  state text not null default 'creating' check (state in ('creating', 'uncertain', 'ready')),
  provider_order_id uuid unique,
  provider_status text,
  checkout_ciphertext text,
  checkout_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, idempotency_key),
  unique (user_id, kind, quote_id),
  check (sandbox or chain_id = 8453),
  check (kind <> 'headless' or quote_id is not null)
);
-- Crash or transport ambiguity must block a new key from creating another checkout.
create unique index if not exists funding_attempts_unresolved_owner_idx on funding_attempts (user_id) where state in ('creating', 'uncertain');
create index if not exists funding_attempts_owner_history_idx on funding_attempts (user_id, created_at desc, id desc);
alter table funding_attempts enable row level security;
revoke all on funding_attempts from public, anon, authenticated;
grant select, insert, update on funding_attempts to service_role;
drop policy if exists funding_attempts_service on funding_attempts;
create policy funding_attempts_service on funding_attempts to service_role using (true) with check (true);
