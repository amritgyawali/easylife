# Contributing

## Project structure

```
src/
├── app/            # Expo Router routes only — no business logic here
├── components/
│   ├── ui/         # Themed primitives (Button, Card, ThemedText, ...) — the only things
│   │                 that should read design tokens directly
│   ├── forms/       # react-hook-form-bound field components
│   ├── charts/
│   └── layout/      # AppShell, error boundary, auth/lock gates
├── features/        # One folder per domain area (auth, dashboard, tasks, finance, ...):
│                       API/query functions, hooks, Zod schemas. UI screens live in app/
│                       and import from here — not the other way around.
├── database/        # local (SQLite/Drizzle, Phase 6), migrations, repositories, schema
├── services/        # Cross-cutting integrations: supabase client, email, ocr, pdf,
│                       notifications, storage, sync — each behind an interface
├── stores/           # Zustand — ephemeral UI state ONLY, never domain/server data
├── hooks/
├── types/            # Hand-written Database types + shared domain types
├── utils/             # Framework-free helpers (money, errors, logger, date/BS conversion)
├── constants/          # app.ts (product identity), env.ts (validated env), theme.ts, navigation.ts
└── i18n/

supabase/
├── functions/        # Edge Functions (Deno) — the only place server secrets are read
├── migrations/        # Numbered SQL, applied in order, never hand-edited via the dashboard
├── policies/           # RLS — one dedicated file, supabase/policies/0001_rls_policies.sql
└── seed.sql

tests/
├── unit/               # Jest — pure logic (utils/, services/ business logic)
├── integration/        # Jest — repository/query behavior against a local Supabase (Phase 6+)
└── e2e/                 # Playwright (web) / Maestro (mobile)
```

## Coding rules

These are enforced by review, not all by tooling, so hold yourself to them even where ESLint stays quiet:

- Strict TypeScript, no `any` (`@typescript-eslint/no-explicit-any` is an ESLint **error**, not a warning).
- Validate everything crossing an I/O boundary with Zod: env vars, Supabase responses that need shaping, (later) OCR output, form input.
- Business logic lives in `services/`/`features/*/api.ts`, never inline in a screen component. A screen component's job is to call a hook and render loading/empty/error/success states — see any existing screen in `src/app/(auth)/` for the pattern.
- Use repository/provider interfaces for anything that could plausibly be swapped later (OCR engine, email provider, storage, price feed) — see `OCRProvider` design in [OCR_PIPELINE.md](./OCR_PIPELINE.md) even though it isn't implemented yet.
- Money is always integer minor units (`bigint .._minor` columns, `number` in TS) via `src/utils/money.ts` — never a float.
- Financial writes are transactional at the database level (the ledger-balance trigger in `0008_ledger.sql` is the enforcement point, not application code).
- Every table migration needs a matching RLS policy in `supabase/policies/0001_rls_policies.sql` before it ships — see the pattern used for every existing table there.
- No enormous components. If a screen file is doing form state + data fetching + complex conditional rendering, pull pieces into `features/<area>/` and `components/`.
- No mock data once a real database layer exists for that feature — if you can't wire it to Supabase yet, use `ComingSoonScreen` (see `src/components/layout/ComingSoonScreen.tsx`) instead of fake data.
- No critical TODOs and no pseudocode committed — if something isn't built yet, it's either not there, or it's a documented placeholder (`ComingSoonScreen`) with a phase label.
- Comments explain **why**, not what — see the existing codebase for the expected density (sparse, and only where a reader would otherwise be surprised).

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

All four must pass. If you touched `supabase/migrations/` or `supabase/policies/`, run `npm run db:types` against a real/local Supabase instance and commit the regenerated `src/types/database.ts` rather than hand-editing it further (see the `interface`-vs-`type` pitfall in [ARCHITECTURE.md](./ARCHITECTURE.md) if you do need to hand-edit it).

## Commit/PR conventions

- Small, reviewable commits over one giant one.
- PR description states what changed and, for anything touching money/ledger/RLS, explicitly confirms you checked the balance/ownership invariants still hold.
