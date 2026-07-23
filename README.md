# Amrit LifeOS

A free-first personal life-management app — schedule, tasks, habits, notes, finance (double-entry ledger), loans, investments, documents, and OCR bank-statement import — built for personal use in Nepal, running from one Expo codebase on Android, iOS, web, and desktop browsers.

The product name is configurable in one place: `src/constants/app.ts` (`APP_NAME`).

> **Status:** Phases 1–7 are complete against a real Supabase project.
>
> - **Phase 1 (Foundation)** — auth, onboarding, the full database schema + RLS, the responsive navigation shell, settings, biometric/PIN app lock.
> - **Phase 2 (Daily life)** — dashboard, Today, planner/tasks, habits with streaks, notes, calendar agenda, and cross-feature search.
> - **Phase 3 (Finance)** — accounts with ledger-derived balances, double-entry income/expense/transfer posting, categories, counterparties, and monthly reports.
> - **Phase 4 (Loans & investments)** — People with net positions, loans with event-derived balances, investments with manual valuations, savings goals, cross-module net worth, and multi-currency transactions with user-recorded exchange rates.
> - **Phase 5 (Documents & extraction)** — private document vault with content-hash deduplication, CSV/TSV statement import with per-bank column mapping, reconciliation, duplicate and counterparty matching, and a review queue.
> - **Phase 6 (Sync & exports)** — a live offline-first layer: the query cache is persisted to device storage so the app is fully usable with no connection, writes made offline queue and auto-sync to Supabase on reconnect, and an always-visible banner reports the state. Plus CSV transaction export and full-account JSON backup (Settings → Data & backup), the conflict-resolution and outbox engines as pure unit-tested modules, and a "Sync & notifications" screen for resolving cross-device conflicts.
> - **Phase 7 (Deployment & hardening)** — `vercel.json` with security headers (CSP scoped to Supabase, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) and immutable-asset cache rules; the web export builds cleanly to `dist/`.
> - **Quick add + durable offline capture** — a floating ＋ on every screen captures a task or note in two taps; captures write through a persisted outbox so they appear instantly, survive a full app restart, and sync to Supabase on reconnect (idempotent, keyed on the client-generated id).
>
> **Two deliberate gaps, both stated in the app itself:**
>
> - **Photo and PDF text recognition are not implemented.** ML Kit needs an Expo development build and cannot run in Expo Go, which this project is pinned to SDK 54 for; Tesseract.js/PDF.js would add a large web-only dependency. Both engines are registered as unavailable with an explanation the Scan screen shows. CSV statement import works fully. See [ARCHITECTURE.md](./ARCHITECTURE.md#extraction-engines-phase-5).
> - **Budgets** remain a placeholder.
>
> Everything else is wired end-to-end. Offline reads, offline-write queuing, and auto-sync on reconnect all work today, and quick-add captures are durable across a full restart; generalising that restart-durability to the detailed edit screens is the one remaining hardening step (see [OFFLINE_SYNC.md](./OFFLINE_SYNC.md)).

## Prerequisites

- Node.js **22.13+**
- npm
- A free [Supabase](https://supabase.com) account/project
- For native builds: [EAS CLI](https://docs.expo.dev/eas/) or Android Studio / Xcode locally
- (Optional, for local Supabase dev) [Docker](https://www.docker.com/) + the [Supabase CLI](https://supabase.com/docs/guides/cli)

## Local setup

```bash
git clone <this repo>
cd amrit-lifeos      # or whatever you named the checkout
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase project's URL and anon key (Project Settings → API in the Supabase dashboard). Never fill in the server-only variables here — those belong in Supabase Edge Function secrets / Vercel project settings, not in the Expo app's `.env`. See [DEPLOYMENT.md](./DEPLOYMENT.md) for exactly how each secret is configured.

## Supabase setup & migrations

Full walkthrough in [DEPLOYMENT.md](./DEPLOYMENT.md#supabase-production-project). Short version:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
psql "$DATABASE_URL" -f supabase/policies/0001_rls_policies.sql
```

See [DATABASE.md](./DATABASE.md) for the schema itself.

## Running the app

### Web

```bash
npm run web
```

### Android / iOS — development build required

Native features used here (biometric app lock, SecureStore, SQLite, ML Kit OCR in a later phase) are **not available in Expo Go**. You need an Expo **development build**:

```bash
npx expo install expo-dev-client
npx eas build --profile development --platform android   # or ios
```

Once installed on a device/simulator, run:

```bash
npm run android   # or: npm run ios
```

### Web export (what Vercel builds)

```bash
npm run export:web   # npx expo export -p web -> dist/
```

## Vercel deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md#vercel-web) — build command `npx expo export -p web`, output directory `dist`, only `EXPO_PUBLIC_*` env vars.

## Resend setup

See [DEPLOYMENT.md](./DEPLOYMENT.md#resend). Resend is only ever called from Supabase Edge Functions — never from the client.

## Test commands

```bash
npm run typecheck     # tsc --noEmit
npm run lint           # eslint .
npm run format:check   # prettier --check .
npm test               # jest (unit tests)
npm run test:watch
```

Playwright (web E2E) and Maestro (mobile E2E) configs land alongside the flows they cover, starting in Phase 2 — see `tests/e2e/`.

## Troubleshooting

- **`Cannot find module 'babel-preset-expo'` when running Jest**: this package can end up nested under `node_modules/expo/node_modules/` instead of hoisted to the top level after certain install orders. Fix: `npx expo install babel-preset-expo`.
- **`.insert()`/`.update()` calls type-error as `never` on a Supabase table that clearly has that field**: see the note in [ARCHITECTURE.md](./ARCHITECTURE.md#a-sharp-typescript-edge) before touching `src/types/database.ts` — it's a real `interface`-vs-`type` inference bug in this postgrest-js version, not a mistake in your schema.
- **Magic link / password reset opens the app but doesn't sign you in on web**: check that your deployed URL (and `<url>/auth/callback`) is in Supabase's Auth redirect allow-list (see [DEPLOYMENT.md](./DEPLOYMENT.md)).
- **"App is not configured" screen on launch**: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing or malformed in `.env` — this is `src/constants/env.ts` failing fast on purpose rather than crashing deeper in the Supabase client.

## Free-tier limitations

See [DEPLOYMENT.md](./DEPLOYMENT.md#free-tier-limitations-to-plan-around). In short: Supabase free-tier projects pause after inactivity and have Storage/DB size and Edge Function invocation caps; Resend free tier caps monthly emails. Every quota-sensitive limit in this app (`MAX_UPLOAD_MB`, `MAX_PDF_PAGES`, `MAX_DAILY_EXTRACTIONS`, `MAX_DAILY_EMAILS`) is read from environment/settings, never hardcoded, so they can be tuned without a code change.

## More documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack decisions and why, implementation phase plan
- [DATABASE.md](./DATABASE.md) — schema, ledger design, migrations
- [SECURITY.md](./SECURITY.md) — RLS, session storage, app lock, account deletion
- [OCR_PIPELINE.md](./OCR_PIPELINE.md) — extraction pipeline design (Phase 5)
- [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) — offline engine design (Phase 6)
- [DEPLOYMENT.md](./DEPLOYMENT.md) — full Supabase/Vercel/Resend deployment steps
- [CONTRIBUTING.md](./CONTRIBUTING.md) — coding rules, project structure, PR expectations
