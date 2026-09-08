begin;

create table if not exists public.app_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Settings are intentionally not exposed for browser writes or direct public reads.
revoke all on table public.app_settings from anon, authenticated;
grant all on table public.app_settings to service_role;

insert into public.app_settings(setting_key, setting_value)
values ('quote_notification_email', 'sulaiman_shuaib@yahoo.com')
on conflict (setting_key) do nothing;

commit;
