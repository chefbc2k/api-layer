-- Server-owned pricing attempts; these records never constitute payment or settlement.
create table if not exists funding_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null check (length(user_id) between 1 and 64),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  chain_id bigint not null check (chain_id in (8453, 84532)),
  token_address text not null check (token_address ~ '^0x[0-9a-f]{40}$'),
  payment_method text not null check (payment_method in ('GUEST_CHECKOUT_APPLE_PAY', 'GUEST_CHECKOUT_GOOGLE_PAY')),
  request_amount numeric(18,6) not null check (request_amount > 0),
  amount_kind text not null check (amount_kind in ('payment', 'purchase')),
  sandbox boolean not null,
  quote jsonb not null check (jsonb_typeof(quote) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at),
  check (sandbox or chain_id = 8453)
);
create index if not exists funding_quotes_owner_created_idx on funding_quotes (user_id, created_at desc, id);
create index if not exists funding_quotes_expiry_idx on funding_quotes (expires_at);
alter table funding_quotes enable row level security;
revoke all on funding_quotes from public, anon, authenticated;
grant select, insert, delete on funding_quotes to service_role;
drop policy if exists funding_quotes_service on funding_quotes;
create policy funding_quotes_service on funding_quotes to service_role using (true) with check (true);
