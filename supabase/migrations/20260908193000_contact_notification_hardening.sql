begin;

alter table public.quotes
  add column if not exists notification_sent_at timestamptz;

-- Public browsers must submit through send-quote-email so Turnstile and rate
-- limiting are verified before any customer data is written.
drop policy if exists "public submit quotes" on public.quotes;
revoke insert on table public.quotes from anon, authenticated;

create table if not exists public.contact_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.contact_rate_limits enable row level security;
revoke all on table public.contact_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.contact_rate_limits to service_role;

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

create index if not exists ix_contact_rate_limits_updated_at
  on public.contact_rate_limits(updated_at);

commit;
