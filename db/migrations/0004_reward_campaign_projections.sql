create or replace function ensure_reward_projection_table(table_name text) returns void language plpgsql as $$
begin
  execute format(
    'create table if not exists %I (
      id bigint generated always as identity primary key,
      entity_id text not null,
      chain_id bigint,
      tx_hash text not null,
      block_number bigint not null,
      block_hash text not null,
      payload jsonb not null default ''{}''::jsonb,
      event_payload jsonb not null default ''{}''::jsonb,
      last_updated_block bigint not null,
      last_event_id bigint not null,
      source_raw_event_id bigint,
      facet_name text,
      event_name text,
      event_signature text,
      canonical_status text not null default ''canonical'',
      is_orphaned boolean not null default false,
      is_current boolean not null default false,
      actor_address text,
      subject_address text,
      related_address text,
      status text,
      metadata_uri text,
      amount text,
      secondary_amount text,
      proposal_id text,
      asset_id text,
      dataset_id text,
      license_id text,
      template_id text,
      listing_id text,
      sale_id text,
      operation_id text,
      withdrawal_id text,
      support integer,
      created_at timestamptz not null default timezone(''utc'', now()),
      updated_at timestamptz not null default timezone(''utc'', now())
    )',
    table_name
  );
  execute format('drop trigger if exists %I_set_updated_at on %I', table_name, table_name);
  execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  execute format('create unique index if not exists %I on %I (source_raw_event_id, entity_id)', table_name || '_source_event_entity_uidx', table_name);
  execute format('create unique index if not exists %I on %I (entity_id) where canonical_status = ''canonical'' and is_orphaned = false and is_current = true', table_name || '_current_entity_uidx', table_name);
  execute format('create index if not exists %I on %I (chain_id, last_updated_block desc)', table_name || '_chain_block_idx', table_name);
  execute format('create index if not exists %I on %I (actor_address)', table_name || '_actor_idx', table_name);
  execute format('create index if not exists %I on %I (subject_address)', table_name || '_subject_idx', table_name);
  execute format('alter table %I enable row level security', table_name);
  execute format('drop policy if exists %I on %I', table_name || '_public_select', table_name);
  execute format(
    'create policy %I on %I for select using (canonical_status = ''canonical'' and is_orphaned = false)',
    table_name || '_public_select',
    table_name
  );
  execute format('drop policy if exists %I on %I', table_name || '_service_all', table_name);
  execute format(
    'create policy %I on %I for all using (coalesce((auth.jwt() ->> ''role'') = ''service_role'', false)) with check (coalesce((auth.jwt() ->> ''role'') = ''service_role'', false))',
    table_name || '_service_all',
    table_name
  );
end;
$$;

select ensure_reward_projection_table('reward_campaigns');
select ensure_reward_projection_table('reward_claims');

drop function if exists ensure_reward_projection_table(text);
