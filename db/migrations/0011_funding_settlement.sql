alter table funding_attempts add column if not exists expected_usdc_units numeric(78,0) check(expected_usdc_units>0);
alter table funding_attempts add column if not exists settlement_status text not null default 'unverified' check(settlement_status in ('unverified','verified','test_verified'));
alter table funding_attempts add column if not exists settlement_error text;
alter table funding_attempts add column if not exists settlement_next_at timestamptz not null default now();
create table if not exists funding_settlements (
  attempt_id uuid primary key references funding_attempts(id),
  chain_id bigint not null check(chain_id in (8453,84532)),
  tx_hash text not null check(tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer not null check(log_index>=0),
  block_number bigint not null check(block_number>=0),
  block_hash text not null check(block_hash ~ '^0x[0-9a-f]{64}$'),
  token_address text not null check(token_address ~ '^0x[0-9a-f]{40}$'),
  recipient text not null check(recipient ~ '^0x[0-9a-f]{40}$'),
  amount_units numeric(78,0) not null check(amount_units>0),
  sandbox boolean not null,
  verified_at timestamptz not null default now(),
  unique(chain_id,tx_hash,log_index),
  check(sandbox or chain_id=8453)
);
alter table funding_settlements enable row level security;
revoke all on funding_settlements from public,anon,authenticated;
grant select,insert on funding_settlements to service_role;
drop policy if exists funding_settlements_service on funding_settlements;
create policy funding_settlements_service on funding_settlements to service_role using(true) with check(true);
