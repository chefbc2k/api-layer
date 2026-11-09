-- Compatibility prerequisites for a fresh standalone PostgreSQL database.
-- Run before 0001; never substitute these for Supabase-managed auth helpers.
-- The API authenticates requests itself; unset database claims deny RLS access.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;
create schema if not exists auth;
do $$
begin
  if to_regprocedure('auth.uid()') is null then
    execute $fn$create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid'$fn$;
  end if;
  if to_regprocedure('auth.jwt()') is null then
    execute $fn$create function auth.jwt() returns json language sql stable as
      'select coalesce(nullif(current_setting(''request.jwt.claims'', true), ''''), ''{}'')::json'$fn$;
  end if;
end $$;
