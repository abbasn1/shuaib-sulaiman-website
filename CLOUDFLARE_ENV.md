# Production environment variables

## Cloudflare Pages — public build variables

Configure only browser-safe values in Cloudflare Pages:

- `VITE_SUPABASE_URL` — Supabase project URL for project `eiubgsqvlsddvnwolfyf`.
- `VITE_SUPABASE_ANON_KEY` — the project's public anon/publishable-compatible key used by the current frontend client.
- `VITE_TURNSTILE_SITE_KEY` — the public Cloudflare Turnstile site key for the production domain.

These `VITE_` values are bundled into the browser and must never contain privileged credentials.

## Supabase Edge Function secrets — server-side only

Configure these in Supabase Edge Function secrets, not Cloudflare Pages public variables:

- `SUPABASE_SERVICE_ROLE_KEY` — privileged server-side Supabase key used by administrative functions.
- `RESEND_API_KEY` — Resend transactional-email credential.
- `QUOTE_EMAIL_FROM` — verified production sender, for example a mailbox on the verified business domain.
- `QUOTE_NOTIFICATION_EMAIL` — optional notification destination; the function currently falls back to the approved Yahoo recipient.
- `TURNSTILE_SECRET_KEY` — private Turnstile verification secret used by `send-quote-email`.

Never commit real values for any server-side secret.
