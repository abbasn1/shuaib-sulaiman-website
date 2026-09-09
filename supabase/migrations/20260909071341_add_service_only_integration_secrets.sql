create table if not exists public.integration_secrets (
  secret_key text primary key,
  secret_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.integration_secrets enable row level security;
revoke all on table public.integration_secrets from public;
revoke all on table public.integration_secrets from anon;
revoke all on table public.integration_secrets from authenticated;
grant select on table public.integration_secrets to service_role;

comment on table public.integration_secrets is 'Server-side integration credentials. Service-role read only; never exposed to browser roles.';
