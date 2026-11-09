alter table funding_attempts add column if not exists reconcile_next_at timestamptz not null default now();
alter table funding_attempts add column if not exists reconcile_attempts integer not null default 0;
alter table funding_attempts add column if not exists reconcile_error text;
alter table funding_attempts add column if not exists reconcile_page_key text;
alter table funding_attempts add column if not exists reconcile_candidates jsonb not null default '[]'::jsonb;
alter table funding_attempts add column if not exists reconcile_seen_keys jsonb not null default '[]'::jsonb;
create index if not exists funding_attempts_reconcile_due_idx on funding_attempts(reconcile_next_at);
create table if not exists funding_subscription_health (
  subscription_id text primary key,
  status text not null check(status in ('healthy','disabled','mismatch','unconfigured','unavailable')),
  checked_at timestamptz not null default now()
);
alter table funding_subscription_health enable row level security;
revoke all on funding_subscription_health from public,anon,authenticated;
grant select,insert,update on funding_subscription_health to service_role;
drop policy if exists funding_subscription_health_service on funding_subscription_health;
create policy funding_subscription_health_service on funding_subscription_health to service_role using(true) with check(true);
