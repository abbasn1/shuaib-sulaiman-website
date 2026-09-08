# Shuaib Sulaiman & Co Website

React 19 / Vite website for Shuaib Sulaiman & Co, deployed on Cloudflare and backed by Supabase.

## Public website
- Home, About, Products, Services and Contact pages
- Product-detail pages under `/export-product/:slug`
- `/products/:slug` remains as a compatibility alias
- Privacy Policy and Terms & Conditions
- Responsive public layout
- Contact enquiries protected by Cloudflare Turnstile and stored in Supabase before email notification
- Published products and approved testimonials are loaded from Supabase

## Product catalogue
The initial catalogue contains these 7 S&S products:
1. S&S Shea Butter
2. S&S Garri (Cassava)
3. S&S Cashew Nut
4. S&S Ginger
5. S&S Charcoal
6. S&S Coal (Black)
7. S&S Yam Flour (Amala)

After the content migration is applied, `public.products` is the production source of truth. A signed-in `super_admin` can create, edit, publish, unpublish and remove catalogue items from **Admin → Products**. `src/data.js` remains a safe build/deployment fallback for the original seven products and static service copy.

Only published product rows appear on the public Home, Products, Product Details and Contact pages.

## Administration
The private `/admin` area uses Supabase Auth and role-based access controls.

Current roles:
- `super_admin`
- `admin`
- `quote_manager`
- `sales_officer`
- `analytics_viewer`
- `auditor`

The dashboard supports, according to role:
- enquiry search and status management
- enquiry assignment
- in-app customer replies through Resend
- per-enquiry sent-reply conversation history
- user and role management
- password resets and forced first-login password changes
- visitor analytics and enquiry-pipeline charts
- administrative audit history and recent activity
- super-admin product catalogue management
- super-admin testimonial review/publish/unpublish
- super-admin management of the contact-form notification recipient

The dashboard polls for new enquiries every 20 seconds and shows a new-enquiry indicator without a full-page refresh.

Privileged writes are performed by JWT-protected Supabase Edge Functions rather than direct browser database writes.

## Edge Functions
- `send-quote-email` — public contact endpoint with Turnstile and rate limiting; stores the enquiry before notification delivery
- `admin-users` — JWT-protected user, password and protected-setting administration
- `admin-quotes` — JWT-protected status and assignment changes
- `reply-to-quote` — JWT-protected Resend reply delivery and conversation recording
- `admin-content` — JWT-protected, super-admin-only product and testimonial management

## Testimonials
Buyer enquiry messages are never automatically published. A super admin may create a testimonial draft from an enquiry or enter one manually, review/edit it, and explicitly publish or unpublish it. The public site only reads `is_published = true` testimonials.

## Environment variables
Public Vite variables:
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TURNSTILE_SITE_KEY=...
```

Server-side Supabase Edge Function secrets include the service-role key, Resend key, Turnstile secret, and optional email sender configuration. Never expose server-side secrets in Cloudflare public variables or frontend source.

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

GitHub Actions runs the production dependency audit, lint, build, public-route smoke tests, authenticated dashboard interaction tests, and role-permission tests for pull requests and production pushes.
