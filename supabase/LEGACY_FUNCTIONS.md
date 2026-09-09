# Retired Supabase Edge Functions

The following legacy/unrelated Edge Functions remain visible in the live Supabase project because the connected management surface does not expose deletion, but they have been retired in production and no longer perform application work:

- `swift-task` — retired; JWT required; returns HTTP 410.
- `super-responder` — retired; JWT required; returns HTTP 410.
- `admin-create-user` — retired; JWT required; returns HTTP 410 and directs callers to `admin-users`.

The active application functions are:

- `send-quote-email`
- `admin-users`
- `admin-quotes`
- `admin-content`
- `reply-to-quote`

`resend-diagnostic-once` is also hard-disabled and returns HTTP 410; it exists only as an inert historical diagnostic endpoint.

If Supabase function deletion becomes available, the retired functions above should be deleted rather than reactivated.