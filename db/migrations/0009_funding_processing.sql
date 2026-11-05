alter table funding_attempts add column if not exists provider_user_ref text;
alter table funding_attempts add column if not exists provider_transaction_id text;
alter table funding_attempts add column if not exists provider_updated_at timestamptz;
alter table funding_attempts add column if not exists provider_tx_hash text;
create unique index if not exists funding_attempts_transaction_id_idx on funding_attempts(provider_transaction_id) where provider_transaction_id is not null;
create unique index if not exists funding_attempts_user_ref_idx on funding_attempts(provider_user_ref) where provider_user_ref is not null;
alter table funding_webhook_inbox add column if not exists next_attempt_at timestamptz not null default now();
alter table funding_webhook_inbox add column if not exists quarantined_at timestamptz;
alter table funding_webhook_inbox add column if not exists last_error text;
