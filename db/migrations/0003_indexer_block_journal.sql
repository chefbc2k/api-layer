create table if not exists indexer_blocks (
  chain_id bigint not null,
  block_number bigint not null,
  block_hash text not null,
  parent_hash text,
  canonical_status text not null default 'canonical',
  is_orphaned boolean not null default false,
  observed_at timestamptz not null default timezone('utc', now()),
  orphaned_at timestamptz,
  primary key (chain_id, block_number, block_hash)
);

create unique index if not exists indexer_blocks_canonical_height_uidx
  on indexer_blocks (chain_id, block_number)
  where canonical_status = 'canonical' and is_orphaned = false;
create index if not exists indexer_blocks_chain_height_idx
  on indexer_blocks (chain_id, block_number desc);

alter table indexer_blocks enable row level security;

drop policy if exists indexer_blocks_service_all on indexer_blocks;
create policy indexer_blocks_service_all on indexer_blocks
  for all using (coalesce((auth.jwt() ->> 'role') = 'service_role', false))
  with check (coalesce((auth.jwt() ->> 'role') = 'service_role', false));
