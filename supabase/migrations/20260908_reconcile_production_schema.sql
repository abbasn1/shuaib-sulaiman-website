begin;

-- Preserve the complete pre-cleanup quote rows before dropping legacy fields.
do $$
begin
  if to_regclass('public.quotes_backup_20260908') is not null then
    raise exception 'Backup table public.quotes_backup_20260908 already exists.';
  end if;
end
$$;

create table public.quotes_backup_20260908 as table public.quotes;
comment on table public.quotes_backup_20260908 is
  'Full public.quotes snapshot before the 2026-09-08 production schema reconciliation.';

-- Preserve useful legacy values in current columns before removing the legacy fields.
update public.quotes
set message = coalesce(nullif(message, ''), description)
where (message is null or btrim(message) = '') and description is not null;

update public.quotes
set product_name = coalesce(nullif(product_name, ''), service_type)
where (product_name is null or btrim(product_name) = '') and service_type is not null;

update public.quotes
set destination_country = coalesce(nullif(destination_country, ''), project_location)
where (destination_country is null or btrim(destination_country) = '') and project_location is not null;

alter table public.quotes
  drop column if exists project_location,
  drop column if exists service_type,
  drop column if exists estimated_budget,
  drop column if exists preferred_start_date,
  drop column if exists description;

-- content_editor is not implemented by the application and no live profile uses it.
do $$
begin
  if exists (select 1 from public.profiles where role::text = 'content_editor') then
    raise exception 'Cannot remove content_editor while a profile still uses it.';
  end if;
end
$$;

-- Temporarily remove policies/functions that depend on the enum while it is rebuilt.
drop policy if exists "staff read quotes" on public.quotes;
drop policy if exists "staff update quotes" on public.quotes;
drop policy if exists "users read profiles" on public.profiles;
drop policy if exists "admins update profiles" on public.profiles;
drop policy if exists "analytics read visits" on public.visits;
drop policy if exists "auditors read logs" on public.audit_logs;

drop function if exists private.current_role();

alter table public.profiles alter column role drop default;
alter type public.app_role rename to app_role_with_legacy_content_editor;
create type public.app_role as enum (
  'super_admin',
  'admin',
  'quote_manager',
  'sales_officer',
  'analytics_viewer',
  'auditor'
);

alter table public.profiles
  alter column role type public.app_role
  using role::text::public.app_role;

alter table public.profiles
  alter column role set default 'sales_officer'::public.app_role;

drop type public.app_role_with_legacy_content_editor;

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;

create policy "staff read quotes" on public.quotes
for select to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor')
);

create policy "staff update quotes" on public.quotes
for update to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer')
) with check (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer')
);

create policy "users read profiles" on public.profiles
for select to authenticated using (
  id = (select auth.uid())
  or private.current_role() in ('super_admin','admin','auditor')
);

create policy "admins update profiles" on public.profiles
for update to authenticated using (
  private.current_role() = 'super_admin'
  or (private.current_role() = 'admin' and role <> 'super_admin')
) with check (
  private.current_role() = 'super_admin'
  or (private.current_role() = 'admin' and role <> 'super_admin')
);

create policy "analytics read visits" on public.visits
for select to authenticated using (
  private.current_role() in ('super_admin','admin','analytics_viewer','auditor')
);

create policy "auditors read logs" on public.audit_logs
for select to authenticated using (
  private.current_role() in ('super_admin','admin','auditor')
);

-- Validate that the quote cleanup did not change row count.
do $$
declare
  live_count bigint;
  backup_count bigint;
begin
  select count(*) into live_count from public.quotes;
  select count(*) into backup_count from public.quotes_backup_20260908;
  if live_count <> backup_count then
    raise exception 'Quote row-count validation failed: live %, backup %', live_count, backup_count;
  end if;
end
$$;

commit;
