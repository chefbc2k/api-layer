-- Checkout attempts are separate from payments; provider completion never credits USDC.
create table if not exists funding_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null check (length(user_id) between 1 and 64),
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  chain_id bigint not null check (chain_id in (8453, 84532)),
  token_address text not null check (token_address ~ '^0x[0-9a-f]{40}$'),
  sandbox boolean not null check (sandbox),
  state text not null default 'creating' check (state in ('creating', 'checkout_created', 'unknown')),
  provider_order_id uuid unique,
  provider_response jsonb check (jsonb_typeof(provider_response) = 'object'),
  created_at timestamptz not null default date_trunc('milliseconds', now()),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check ((state = 'checkout_created') = (provider_order_id is not null and provider_response is not null))
);
create index if not exists funding_orders_owner_created_idx on funding_orders (user_id, created_at desc, id desc);
-- An uncertain upstream result must be reconciled before another payable attempt.
create unique index if not exists funding_orders_unresolved_owner_idx on funding_orders (user_id)
  where state in ('creating', 'unknown');
alter table funding_orders enable row level security;
revoke all on funding_orders from public, anon, authenticated;
grant select, insert, update on funding_orders to service_role;
drop policy if exists funding_orders_service on funding_orders;
create policy funding_orders_service on funding_orders to service_role using (true) with check (true);
