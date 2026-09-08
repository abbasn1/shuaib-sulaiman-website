# Shuaib Sulaiman & Co Website

React 19 / Vite website for Shuaib Sulaiman & Co, deployed on Cloudflare Pages and backed by Supabase.

## Public website
- Home, About, Products, Services and Contact pages
- 7 current S&S product-detail pages under `/export-product/:slug`
- `/products/:slug` remains as a compatibility alias
- Privacy Policy and Terms & Conditions
- Responsive public layout
- Contact enquiries protected by Cloudflare Turnstile and stored in Supabase before email notification

## Current products
1. S&S Shea Butter
2. S&S Garri (Cassava)
3. S&S Cashew Nut
4. S&S Ginger
5. S&S Charcoal
6. S&S Coal (Black)
7. S&S Yam Flour (Amala)

`src/data.js` is the product catalogue source of truth.

## Administration
The private `/admin` area uses Supabase Auth and role-based access controls. Depending on role, the dashboard supports:
- enquiry search and status management
- enquiry assignment
- user and role management
- password resets and forced first-login password changes
- visitor analytics
- administrative audit history
- super-admin management of the contact-form notification recipient

Privileged writes are performed by JWT-protected Supabase Edge Functions rather than direct browser database writes.

## Environment variables
Public Vite variables:
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TURNSTILE_SITE_KEY=...
```

Server-side Supabase Edge Function secrets include the service-role key, Resend key, Turnstile secret, and optional email sender configuration. Never expose server-side secrets in Cloudflare Pages public variables or frontend source.

## Run locally
```bash
npm install
npm run dev
```

## Quality checks
```bash
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

GitHub Actions also runs the production dependency audit, lint, build and browser route smoke tests for pull requests and production pushes.
