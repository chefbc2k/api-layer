create table if not exists funding_webhook_inbox (
  event_id text primary key check (length(event_id) between 1 and 256),
  event_type text not null check (length(event_type) between 1 and 256),
  body_digest text not null check (body_digest ~ '^[a-f0-9]{64}$'),
  raw_body bytea not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0)
);
create index if not exists funding_webhook_inbox_pending_idx on funding_webhook_inbox(received_at) where processed_at is null;
alter table funding_webhook_inbox enable row level security;
revoke all on funding_webhook_inbox from public, anon, authenticated;
grant select, insert, update on funding_webhook_inbox to service_role;
drop policy if exists funding_webhook_service on funding_webhook_inbox;
create policy funding_webhook_service on funding_webhook_inbox to service_role using (true) with check (true);
