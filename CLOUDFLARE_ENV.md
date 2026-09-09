# Production environment variables

## Cloudflare — public build variables

Configure only browser-safe values in the Cloudflare production build:

- `VITE_SUPABASE_URL` — Supabase project URL for project `eiubgsqvlsddvnwolfyf`.
- `VITE_SUPABASE_ANON_KEY` — the project's public anon/publishable-compatible key used by the current frontend client.
- `VITE_TURNSTILE_SITE_KEY` — the public Cloudflare Turnstile site key for the production domain.

These `VITE_` values are bundled into the browser and must never contain privileged credentials. After changing any `VITE_` value, trigger a fresh production deployment so Vite rebuilds the frontend with the new value.

## Supabase Edge Function secrets — server-side only

Configure these in Supabase Edge Function secrets, not Cloudflare public variables:

- `SUPABASE_SERVICE_ROLE_KEY` — privileged server-side Supabase key used by administrative functions.
- `RESEND_API_KEY` — Resend transactional-email credential used for enquiry notifications and in-dashboard customer replies.
- `QUOTE_EMAIL_FROM` — verified production sender used by `send-quote-email` and `reply-to-quote`.
- `QUOTE_NOTIFICATION_EMAIL` — optional emergency/default fallback recipient.
- `TURNSTILE_SECRET_KEY` — private Turnstile verification secret used by `send-quote-email`.

The normal contact-form recipient is stored server-side in `public.app_settings` under `quote_notification_email`. A signed-in `super_admin` can change it from **Admin → Settings → Contact-form notifications**. `send-quote-email` reads that protected setting first and falls back to `QUOTE_NOTIFICATION_EMAIL`, then to `sulaiman_shuaib@yahoo.com` if no setting exists.

`reply-to-quote` sends staff replies to the buyer using `QUOTE_EMAIL_FROM`; replies from the buyer are directed to the protected contact notification address when one is configured.

## Function deployment contract

`supabase/config.toml` declares the production verification mode for:
- `send-quote-email` — public endpoint; custom Turnstile validation, `verify_jwt = false`
- `admin-users` — authenticated/JWT protected
- `admin-quotes` — authenticated/JWT protected
- `reply-to-quote` — authenticated/JWT protected
- `admin-content` — authenticated/JWT protected; `content_editor` may manage unpublished drafts, while publish/unpublish and changes to already-published public content are restricted to `super_admin`

Never commit real values for any server-side secret.
