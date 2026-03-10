create extension if not exists pgcrypto;

create table if not exists indexer_checkpoints (
  chain_id bigint primary key,
  cursor_block bigint not null default 0,
  finalized_block bigint not null default 0,
  cursor_block_hash text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists raw_events (
  id bigint generated always as identity primary key,
  chain_id bigint not null,
  tx_hash text not null,
  log_index integer not null,
  block_number bigint not null,
  block_hash text not null,
  contract_address text not null,
  facet_name text,
  event_name text not null,
  event_signature text,
  decoded_args jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default timezone('utc', now()),
  confirmations integer not null default 0,
  canonical_status text not null default 'canonical',
  is_orphaned boolean not null default false,
  orphaned_at timestamptz,
  unique (chain_id, tx_hash, log_index)
);

create index if not exists raw_events_block_number_idx on raw_events (chain_id, block_number desc);
create index if not exists raw_events_event_name_idx on raw_events (event_name);
create index if not exists raw_events_contract_address_idx on raw_events (contract_address);

create table if not exists tx_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid,
  requester_wallet text,
  signer_id text,
  method text not null,
  params jsonb not null default '[]'::jsonb,
  tx_hash text,
  status text not null default 'queued',
  response_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function ensure_projection_table(table_name text) returns void language plpgsql as $$
begin
  execute format(
    'create table if not exists %I (
      id bigint generated always as identity primary key,
      entity_id text not null unique,
      tx_hash text not null,
      block_number bigint not null,
      block_hash text not null,
      payload jsonb not null default ''{}''::jsonb,
      last_updated_block bigint not null,
      last_event_id bigint not null,
      is_orphaned boolean not null default false,
      created_at timestamptz not null default timezone(''utc'', now()),
      updated_at timestamptz not null default timezone(''utc'', now())
    )',
    table_name
  );
  execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
end;
$$;

select ensure_projection_table('voice_assets');
select ensure_projection_table('voice_datasets');
select ensure_projection_table('voice_dataset_members');
select ensure_projection_table('voice_license_templates');
select ensure_projection_table('voice_licenses');
select ensure_projection_table('market_listings');
select ensure_projection_table('market_sales');
select ensure_projection_table('payment_flows');
select ensure_projection_table('payment_withdrawals');
select ensure_projection_table('staking_positions');
select ensure_projection_table('staking_rewards');
select ensure_projection_table('governance_proposals');
select ensure_projection_table('governance_votes');
select ensure_projection_table('governance_delegations');
select ensure_projection_table('timelock_operations');
select ensure_projection_table('emergency_incidents');
select ensure_projection_table('emergency_withdrawals');
select ensure_projection_table('vesting_schedules');
select ensure_projection_table('vesting_releases');
select ensure_projection_table('multisig_operations');
select ensure_projection_table('upgrade_requests');
select ensure_projection_table('ownership_transfers');

drop function if exists ensure_projection_table(text);

alter table raw_events enable row level security;
alter table tx_requests enable row level security;
alter table voice_assets enable row level security;
alter table voice_datasets enable row level security;
alter table voice_dataset_members enable row level security;
alter table voice_license_templates enable row level security;
alter table voice_licenses enable row level security;
alter table market_listings enable row level security;
alter table market_sales enable row level security;
alter table payment_flows enable row level security;
alter table payment_withdrawals enable row level security;
alter table staking_positions enable row level security;
alter table staking_rewards enable row level security;
alter table governance_proposals enable row level security;
alter table governance_votes enable row level security;
alter table governance_delegations enable row level security;
alter table timelock_operations enable row level security;
alter table emergency_incidents enable row level security;
alter table emergency_withdrawals enable row level security;
alter table vesting_schedules enable row level security;
alter table vesting_releases enable row level security;
alter table multisig_operations enable row level security;
alter table upgrade_requests enable row level security;
alter table ownership_transfers enable row level security;

create policy if not exists raw_events_public_select on raw_events
  for select using (canonical_status = 'canonical' and is_orphaned = false);

create policy if not exists tx_requests_owner_select on tx_requests
  for select using (
    auth.uid() is not null
    and requester_id = auth.uid()
  );

create policy if not exists tx_requests_service_all on tx_requests
  for all using (coalesce((auth.jwt() ->> 'role') = 'service_role', false))
  with check (coalesce((auth.jwt() ->> 'role') = 'service_role', false));

do $$
declare
  projection_table text;
begin
  foreach projection_table in array array[
    'voice_assets',
    'voice_datasets',
    'voice_dataset_members',
    'voice_license_templates',
    'voice_licenses',
    'market_listings',
    'market_sales',
    'payment_flows',
    'payment_withdrawals',
    'staking_positions',
    'staking_rewards',
    'governance_proposals',
    'governance_votes',
    'governance_delegations',
    'timelock_operations',
    'emergency_incidents',
    'emergency_withdrawals',
    'vesting_schedules',
    'vesting_releases',
    'multisig_operations',
    'upgrade_requests',
    'ownership_transfers'
  ]
  loop
    execute format(
      'create policy %I_public_select on %I for select using (is_orphaned = false)',
      projection_table || '_public_select',
      projection_table
    );
    execute format(
      'create policy %I_service_all on %I for all using (coalesce((auth.jwt() ->> ''role'') = ''service_role'', false)) with check (coalesce((auth.jwt() ->> ''role'') = ''service_role'', false))',
      projection_table || '_service_all',
      projection_table
    );
  end loop;
end $$;
