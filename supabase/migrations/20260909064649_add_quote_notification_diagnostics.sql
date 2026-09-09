alter table public.quotes
  add column if not exists notification_attempted_at timestamptz,
  add column if not exists notification_provider_id text,
  add column if not exists notification_error text;

comment on column public.quotes.notification_attempted_at is 'Most recent attempt to send the owner notification email.';
comment on column public.quotes.notification_provider_id is 'Provider message identifier for a successful owner notification.';
comment on column public.quotes.notification_error is 'Sanitized error from the most recent owner notification attempt; null after success.';
