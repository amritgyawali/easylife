# Architecture

Amrit LifeOS is a single Expo (React Native + React Native Web) codebase deployed to Android, iOS, and web (Vercel). The **only** backend is Supabase — there is no custom server, VPS, or other backend service. Server-only logic lives in Supabase Edge Functions.

## Why these choices

### Front end

- **Expo + Expo Router, SDK 57.** `src/app` is the router root — this has been the zero-config default location since Expo SDK 55, so no `expo-router` config-plugin `root` option is needed (that option is explicitly discouraged by Expo's own docs for anything other than the default).
- **React Native Web** for the web target, exported statically (`web.output: "static"` in `app.json`) so Vercel can serve it as a plain static site.
- **Styling: a custom themed primitive layer** (`src/components/ui`, tokens in `src/constants/theme.ts`) instead of NativeWind. NativeWind adds a Tailwind/PostCSS compilation pipeline on top of Metro, which is one more moving part that can break across three renderers (Android/iOS/web) for a project this size. Plain `StyleSheet`-based themed components have zero extra build tooling and are trivially portable. If a future contributor prefers NativeWind, the token file (`spacing`, `radius`, `fontSize`, `Theme`) is the single place to bridge from.
- **TanStack Query** owns all server/domain data (Supabase reads/writes, cached with query keys). **Zustand** is intentionally restricted to small, ephemeral, device-local UI state (`theme-store.ts`, `app-lock-store.ts`) — never business data. Mixing the two is a common source of stale/duplicated state, so the project convention is: if it round-trips to Supabase, it's a Query; if it's just "is the drawer open," it's Zustand.
- **React Hook Form + Zod** for every form; Zod again at every external I/O boundary (env vars, Supabase responses that need parsing, later: OCR output). `any` is banned via the ESLint config (`@typescript-eslint/no-explicit-any: error`).

### Navigation

A single `AppShell` component (`src/components/layout/AppShell.tsx`) renders either:

- a **bottom tab bar** (5 items: Today, Planner, Money, Notes, Scan) below `DESKTOP_BREAKPOINT` (768px), or
- a **persistent left sidebar** (17 items covering every feature area) at or above that width.

Every top-level route segment (`today/`, `tasks/`, `notes/`, `finance/`, `people/`, `loans/`, `investments/`, `documents/`, `imports/`, `reports/`, `settings/`, `habits/`, `calendar/`, `scan/`) has its own one-line `_layout.tsx` that renders `<AuthenticatedLayout />`, which guards on session and wraps content in `<AppShell>`. This keeps chrome and the auth guard from ever drifting between sections, while matching the flat `app/tasks/`, `app/notes/`, ... structure requested rather than nesting everything inside one route group.

Screens for features not yet built in the current phase render `<ComingSoonScreen phase="Phase N" />` instead of being dead links — see the phase notes below.

### Backend / database

See [DATABASE.md](./DATABASE.md) for the full schema and [SECURITY.md](./SECURITY.md) for Row Level Security. In short: a proper double-entry ledger (`financial_transactions` + `ledger_entries`) with a Postgres trigger that rejects unbalanced _posted_ transactions, integer minor-unit money throughout, and soft deletion (`deleted_at`) plus `version` columns on every syncable table for the future offline engine.

### Offline & sync (Phase 6)

Not yet implemented. The plan: Expo SQLite + Drizzle ORM as the mobile working store, with an outbox/pending-sync queue, client-generated UUIDs, and `sync_conflicts` for anything that can't merge automatically. Web talks to Supabase directly via TanStack Query — no local SQLite on web. The domain model (repository interfaces) is designed now so both layers can share it later; see [OFFLINE_SYNC.md](./OFFLINE_SYNC.md).

### OCR (Phase 5)

Not yet implemented. Planned `OCRProvider` interface with three backends (ML Kit on native via a **development build**, PDF.js + Tesseract.js in a Web Worker on browser, an optional Edge Function fallback). See [OCR_PIPELINE.md](./OCR_PIPELINE.md).

## A sharp TypeScript edge (worth knowing before touching `src/types/database.ts`)

`src/types/database.ts` is a **hand-written** stand-in for `supabase gen types typescript` output (no live Supabase project is linked yet in this environment). While wiring it up we hit a real, reproducible bug in this `@supabase/supabase-js` / `@supabase/postgrest-js` version: if any table's `Row`/`Insert`/`Update` shape is declared with TypeScript `interface` (instead of `type`), or built via a mapped/utility type (`Partial<T>`, `Pick<T, K>`, even an inline `{[K in keyof T]?: T[K]}`), the generic resolution for `.insert()`/`.update()` silently collapses to `never` for **every** table in the schema, not just the offending one — while `.select()` calls don't visibly error, making it easy to miss. The fix, applied throughout this file: every Row/Insert/Update is a plain `type X = { ... }` with each field spelled out explicitly (no utility types), and every table entry includes an explicit `Relationships: []`, with `Views`/`Functions` present (even if empty) on the schema object. This matches what real `supabase gen types` output looks like anyway — **once a Supabase project is linked, run `npm run db:types` and prefer the generated file over hand-editing this one.**

## Implementation sequence

Phases match the spec's required order. Each phase must typecheck, lint, and pass its tests before the next begins.

1. **Foundation** (this codebase, current state) — project setup, design system, Supabase client, auth, env validation, full DB schema + RLS, responsive nav shell, profile/settings, biometric+PIN app lock, error boundary, logging.
2. **Daily life** — dashboard, tasks, planner, habits, notes, search, notifications.
3. **Finance** — accounts, ledger-backed income/expense/transfer, categories, counterparties, reports.
4. **Loans & investments** — People module, lending/borrowing, repayments, investments, savings goals, net worth.
5. **Documents & extraction** — document vault, OCR abstraction, statement parsing, review queue, reconciliation.
6. **Sync & exports** — offline SQLite engine, outbox queue, conflict handling, CSV/JSON/PDF exports.
7. **Deployment & hardening** — Vercel, Resend, security headers, full test pass, accessibility/performance review.
