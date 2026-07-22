# Deployment

## Supabase (production project)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. `supabase login && supabase link --project-ref <ref>`
3. Apply migrations: `supabase db push`
4. Apply RLS policies: `psql "$DATABASE_URL" -f supabase/policies/0001_rls_policies.sql` (or paste into the SQL editor — this file is idempotent-unsafe to re-run as-is since `create policy` errors if it already exists; on a fresh project it runs cleanly once).
5. In **Storage**, confirm the `documents` and `avatars` buckets were created by the policies file (`insert into storage.buckets ... on conflict do nothing`) — both should show as _private_/_public_ respectively.
6. In **Authentication → URL Configuration**, set the Site URL to your deployed `EXPO_PUBLIC_APP_URL` and add it (plus `<url>/auth/callback`) to the redirect allow-list — required for magic links and password reset to land back in the app.
7. In **Authentication → Email**, either use Supabase's built-in email sending for local dev, or configure Resend as a custom SMTP provider for production (Resend → SMTP settings → paste host/port/credentials into Supabase Auth SMTP settings).
8. Set Edge Function secrets (these are read by `supabase/functions/**`, never by the client):
   ```bash
   supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=noreply@yourdomain.com
   supabase secrets set DOCUMENT_PROCESSING_SECRET=... CRON_SECRET=...
   ```
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provisioned automatically inside every Edge Function — you do not set these yourself.
9. Deploy functions as they're built: `supabase functions deploy delete-account`.
10. Regenerate types against the live schema: `npm run db:types`.

## Vercel (web)

- **Framework preset:** Other (this is a static export, not a Next.js app).
- **Build command:** `npx expo export -p web`
- **Output directory:** `dist`
- **Install command:** `npm install`
- **Environment variables** (Project Settings → Environment Variables): only the `EXPO_PUBLIC_*` client-safe ones from `.env.example`. Never add `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or any other server secret here — this project has no server-side Vercel runtime that would need them; all privileged logic lives in Supabase Edge Functions instead.
- **SPA/route rewrites:** the static export (`web.output: "static"` in `app.json`) pre-renders every route to its own HTML file (verified: 33 routes export cleanly, see build output), so a catch-all SPA rewrite is not required for the routes that exist. If you add a dynamic route later (e.g. `/notes/[id]`) that needs client-side-only resolution, add a `vercel.json` rewrite for that specific pattern rather than a blanket catch-all, to avoid breaking the pre-rendered static routes.
- **Security headers:** add a `vercel.json` with at minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Content-Security-Policy` scoped to your Supabase project URL — not yet added to this repo (tracked for Phase 7 hardening).
- **Cache rules:** static assets under `_expo/static/` are content-hashed by the Expo bundler and safe to cache aggressively (`Cache-Control: public, max-age=31536000, immutable`); `index.html` and other route HTML files should not be cached long-term.

## Resend

1. Create an account at [resend.com](https://resend.com) (free tier), verify a sending domain.
2. Generate an API key, set it as an Edge Function secret (`RESEND_API_KEY`) — **never** as an `EXPO_PUBLIC_*` variable; Resend is only ever called from server-side code (Edge Functions), per the architecture constraint.
3. Email templates (welcome, security notice, weekly summary, loan due/overdue, extraction complete, export ready, backup reminder) are Phase 3–7 work as their triggering features are built; `email_preferences` (per-user opt-out flags, already migrated) is the gate every send must check first.

## Free-tier limitations to plan around

- Supabase free tier: project pauses after a period of inactivity (resumes on next request, with a short delay); limited Edge Function invocations/month; limited database size and Storage.
- Resend free tier: limited emails/month — respect `MAX_DAILY_EMAILS` and `email_preferences` opt-outs so the quota is spent on emails users actually want.
- Vercel Hobby: fine for a static export with no serverless functions of its own (all dynamic logic is in Supabase Edge Functions, which have their own separate free tier).

## Running locally

```bash
npm install
cp .env.example .env    # fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run web              # or: npm run android / npm run ios (requires a dev build — see README)
```
