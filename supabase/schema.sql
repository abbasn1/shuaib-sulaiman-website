create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quote_status as enum ('new','under_review','contacted','quotation_sent','won','lost','closed');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'sales_officer',
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text,
  email text not null,
  phone text,
  product_name text,
  destination_country text,
  message text not null,
  status public.quote_status not null default 'new',
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

drop policy if exists "public submit quotes" on public.quotes;
create policy "public submit quotes" on public.quotes
for insert to anon, authenticated with check (true);

drop policy if exists "staff read quotes" on public.quotes;
create policy "staff read quotes" on public.quotes
for select to authenticated using (
  public.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor')
);

drop policy if exists "staff update quotes" on public.quotes;
create policy "staff update quotes" on public.quotes
for update to authenticated using (
  public.current_role() in ('super_admin','admin','quote_manager','sales_officer')
) with check (
  public.current_role() in ('super_admin','admin','quote_manager','sales_officer')
);

drop policy if exists "users read profiles" on public.profiles;
create policy "users read profiles" on public.profiles
for select to authenticated using (
  id = auth.uid() or public.current_role() in ('super_admin','admin','auditor')
);

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles" on public.profiles
for update to authenticated using (
  public.current_role() in ('super_admin','admin')
) with check (
  public.current_role() in ('super_admin','admin')
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','New User'), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create index if not exists ix_quotes_status on public.quotes(status);
create index if not exists ix_quotes_created_at on public.quotes(created_at desc);
