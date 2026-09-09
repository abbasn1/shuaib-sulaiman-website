create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

do $$ begin
  create type public.app_role as enum ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor');
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
  message text,
  status public.quote_status not null default 'new',
  assigned_to uuid references public.profiles(id),
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  page_path text not null default '/',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  category text not null,
  image_url text,
  summary text not null default '',
  overview text not null default '',
  benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(benefits) = 'array'),
  applications jsonb not null default '[]'::jsonb check (jsonb_typeof(applications) = 'array'),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  packaging jsonb not null default '[]'::jsonb check (jsonb_typeof(packaging) = 'array'),
  quality_points jsonb not null default '[]'::jsonb check (jsonb_typeof(quality_points) = 'array'),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  source_quote_id uuid references public.quotes(id) on delete set null,
  buyer_name text not null,
  company_name text,
  role_or_market text,
  quote_text text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  resend_email_id text,
  created_at timestamptz not null default now()
);

insert into public.app_settings(setting_key, setting_value)
values ('quote_notification_email', 'sulaiman_shuaib@yahoo.com')
on conflict (setting_key) do nothing;

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;
alter table public.visits enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_rate_limits enable row level security;
alter table public.app_settings enable row level security;
alter table public.products enable row level security;
alter table public.testimonials enable row level security;
alter table public.quote_responses enable row level security;

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;

drop policy if exists "users read profiles" on public.profiles;
create policy "users read profiles" on public.profiles
for select to authenticated using (
  id = (select auth.uid())
  or private.current_role() in ('super_admin','admin','quote_manager','auditor')
);

drop policy if exists "staff read quotes" on public.quotes;
create policy "staff read quotes" on public.quotes
for select to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor')
);

drop policy if exists "public record visits" on public.visits;
create policy "public record visits" on public.visits
for insert to anon, authenticated with check (true);

drop policy if exists "analytics read visits" on public.visits;
create policy "analytics read visits" on public.visits
for select to authenticated using (
  private.current_role() in ('super_admin','admin','analytics_viewer','auditor')
);

drop policy if exists "auditors read logs" on public.audit_logs;
create policy "auditors read logs" on public.audit_logs
for select to authenticated using (
  private.current_role() in ('super_admin','admin','auditor')
);

drop policy if exists "public read published products" on public.products;
drop policy if exists "super admins read all products" on public.products;
drop policy if exists "anonymous read published products" on public.products;
drop policy if exists "authenticated read products" on public.products;
create policy "anonymous read published products" on public.products
for select to anon using (is_published = true);
create policy "authenticated read products" on public.products
for select to authenticated using (
  is_published = true or private.current_role() = 'super_admin'
);

drop policy if exists "public read published testimonials" on public.testimonials;
drop policy if exists "super admins read all testimonials" on public.testimonials;
drop policy if exists "anonymous read published testimonials" on public.testimonials;
drop policy if exists "authenticated read testimonials" on public.testimonials;
create policy "anonymous read published testimonials" on public.testimonials
for select to anon using (is_published = true);
create policy "authenticated read testimonials" on public.testimonials
for select to authenticated using (
  is_published = true or private.current_role() = 'super_admin'
);

drop policy if exists "staff read quote responses" on public.quote_responses;
create policy "staff read quote responses" on public.quote_responses
for select to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor')
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, email, role, is_active, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    'sales_officer',
    true,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.consume_contact_rate_limit(
  p_ip_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_ip_hash is null or btrim(p_ip_hash) = '' then
    return false;
  end if;

  insert into public.contact_rate_limits (ip_hash, window_start, request_count, updated_at)
  values (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update
  set
    window_start = case
      when public.contact_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.contact_rate_limits.window_start
    end,
    request_count = case
      when public.contact_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.contact_rate_limits.request_count + 1
    end,
    updated_at = now()
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_contact_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_rate_limit(text, integer, integer) to service_role;

-- Browser clients stay read-only for privileged business data. Trusted Edge
-- Functions use service_role for all mutations and perform server-side role checks.
revoke insert, update, delete on table public.profiles from anon, authenticated;
revoke insert, update, delete on table public.quotes from anon, authenticated;
revoke insert, update, delete on table public.audit_logs from anon, authenticated;
revoke insert, update, delete on table public.products from anon, authenticated;
revoke insert, update, delete on table public.testimonials from anon, authenticated;
revoke insert, update, delete on table public.quote_responses from anon, authenticated;
revoke all on table public.contact_rate_limits from public, anon, authenticated;
revoke all on table public.app_settings from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.quotes to authenticated;
grant insert on table public.visits to anon, authenticated;
grant select on table public.visits to authenticated;
grant select on table public.audit_logs to authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.testimonials to anon, authenticated;
grant select on table public.quote_responses to authenticated;
grant all on table public.contact_rate_limits to service_role;
grant all on table public.app_settings to service_role;
grant all on table public.products to service_role;
grant all on table public.testimonials to service_role;
grant all on table public.quote_responses to service_role;

create index if not exists ix_quotes_status on public.quotes(status);
create index if not exists ix_quotes_created_at on public.quotes(created_at desc);
create index if not exists ix_quotes_assigned_to on public.quotes(assigned_to);
create index if not exists ix_visits_created_at on public.visits(created_at desc);
create index if not exists ix_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists ix_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists ix_contact_rate_limits_updated_at on public.contact_rate_limits(updated_at);
create index if not exists ix_app_settings_updated_by on public.app_settings(updated_by);
create index if not exists ix_products_published_sort on public.products(is_published, sort_order, name);
create index if not exists ix_products_updated_by on public.products(updated_by);
create index if not exists ix_testimonials_published on public.testimonials(is_published, published_at desc nulls last, created_at desc);
create index if not exists ix_testimonials_source_quote on public.testimonials(source_quote_id);
create index if not exists ix_testimonials_updated_by on public.testimonials(updated_by);
create index if not exists ix_quote_responses_quote_created on public.quote_responses(quote_id, created_at);
create index if not exists ix_quote_responses_staff on public.quote_responses(staff_id);
