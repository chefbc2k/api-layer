alter table if exists tx_requests
  add column if not exists relay_mode text,
  add column if not exists api_key_label text,
  add column if not exists request_hash text,
  add column if not exists spend_cap_decision text;

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
    execute format('alter table %I drop constraint if exists %I', projection_table, projection_table || '_entity_id_key');
    execute format(
      'alter table %I
        add column if not exists chain_id bigint,
        add column if not exists facet_name text,
        add column if not exists event_name text,
        add column if not exists event_signature text,
        add column if not exists event_payload jsonb not null default ''{}''::jsonb,
        add column if not exists source_raw_event_id bigint,
        add column if not exists canonical_status text not null default ''canonical'',
        add column if not exists is_current boolean not null default false,
        add column if not exists actor_address text,
        add column if not exists subject_address text,
        add column if not exists related_address text,
        add column if not exists status text,
        add column if not exists metadata_uri text,
        add column if not exists amount text,
        add column if not exists secondary_amount text,
        add column if not exists proposal_id text,
        add column if not exists asset_id text,
        add column if not exists dataset_id text,
        add column if not exists license_id text,
        add column if not exists template_id text,
        add column if not exists listing_id text,
        add column if not exists sale_id text,
        add column if not exists operation_id text,
        add column if not exists withdrawal_id text,
        add column if not exists support integer',
      projection_table
    );
    execute format('create unique index if not exists %I on %I (source_raw_event_id, entity_id)', projection_table || '_source_event_entity_uidx', projection_table);
    execute format('create unique index if not exists %I on %I (entity_id) where canonical_status = ''canonical'' and is_orphaned = false and is_current = true', projection_table || '_current_entity_uidx', projection_table);
    execute format('create index if not exists %I on %I (chain_id, last_updated_block desc)', projection_table || '_chain_block_idx', projection_table);
    execute format('create index if not exists %I on %I (actor_address)', projection_table || '_actor_idx', projection_table);
    execute format('create index if not exists %I on %I (subject_address)', projection_table || '_subject_idx', projection_table);
  end loop;
end $$;

drop policy if exists raw_events_public_select on raw_events;

create policy if not exists raw_events_service_all on raw_events
  for all using (coalesce((auth.jwt() ->> 'role') = 'service_role', false))
  with check (coalesce((auth.jwt() ->> 'role') = 'service_role', false));

drop view if exists raw_events_public;
create view raw_events_public as
select
  chain_id,
  tx_hash,
  log_index,
  block_number,
  block_hash,
  contract_address,
  facet_name,
  event_name,
  event_signature,
  decoded_args,
  observed_at,
  confirmations
from raw_events
where canonical_status = 'canonical'
  and is_orphaned = false;

grant select on raw_events_public to anon, authenticated, service_role;
