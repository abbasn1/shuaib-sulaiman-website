-- Archived legacy migration. This file was never part of the live Supabase migration ledger.
-- It is retained for historical reference only and must not be replayed automatically.

begin;

lock table public.quotes in access exclusive mode;

do $$
begin
  if to_regclass('public.quotes_backup_20260723') is not null then
    raise exception 'Backup table public.quotes_backup_20260723 already exists. Review or rename it before running this migration again.';
  end if;
end
$$;

create table public.quotes_backup_20260723 as table public.quotes;
comment on table public.quotes_backup_20260723 is
  'Full quotes-table snapshot created before the 2026-07-23 production schema cleanup.';

alter table public.quotes
  add column if not exists full_name text,
  add column if not exists company_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists product_name text,
  add column if not exists destination_country text,
  add column if not exists message text,
  add column if not exists assigned_to uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotes' and column_name = 'description') then
    execute $sql$ update public.quotes set message = coalesce(nullif(message, ''), description) where message is null or message = '' $sql$;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotes' and column_name = 'service_type') then
    execute $sql$ update public.quotes set product_name = coalesce(nullif(product_name, ''), service_type) where product_name is null or product_name = '' $sql$;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quotes' and column_name = 'project_location') then
    execute $sql$ update public.quotes set destination_country = coalesce(nullif(destination_country, ''), project_location) where destination_country is null or destination_country = '' $sql$;
  end if;
end
$$;

update public.quotes set full_name = 'Legacy enquiry' where full_name is null or btrim(full_name) = '';
update public.quotes set email = 'unknown@legacy.invalid' where email is null or btrim(email) = '';
update public.quotes set message = 'Legacy enquiry migrated without a description.' where message is null or btrim(message) = '';
update public.quotes set created_at = now() where created_at is null;
update public.quotes set updated_at = coalesce(created_at, now()) where updated_at is null;

alter table public.quotes
  drop column if exists project_location,
  drop column if exists service_type,
  drop column if exists description,
  drop column if exists project_type,
  drop column if exists budget;

alter table public.quotes
  alter column full_name set not null,
  alter column email set not null,
  alter column message set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quotes'::regclass and contype = 'f' and conname = 'quotes_assigned_to_fkey'
  ) then
    alter table public.quotes add constraint quotes_assigned_to_fkey foreign key (assigned_to) references public.profiles(id);
  end if;
end
$$;

create index if not exists ix_quotes_status on public.quotes(status);
create index if not exists ix_quotes_created_at on public.quotes(created_at desc);
alter table public.quotes enable row level security;

commit;
