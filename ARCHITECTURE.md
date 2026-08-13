# Architecture

Amrit LifeOS is a single Expo (React Native + React Native Web) codebase deployed to Android, iOS, and web (Vercel). The **only** backend is Supabase — there is no custom server, VPS, or other backend service. Server-only logic lives in Supabase Edge Functions.

## Why these choices

### Front end

- **Expo + Expo Router, SDK 54** (pinned — see [AGENTS.md](./AGENTS.md) for why it must not be upgraded). `src/app` is the router root, which Metro picks up automatically; no `expo-router` config-plugin `root` option is needed, and that option is explicitly discouraged by Expo's own docs for anything other than the default.
- **React Native Web** for the web target, exported statically (`web.output: "static"` in `app.json`) so Vercel can serve it as a plain static site.
- **Styling: a custom themed primitive layer** (`src/components/ui`, tokens in `src/constants/theme.ts`) instead of NativeWind. NativeWind adds a Tailwind/PostCSS compilation pipeline on top of Metro, which is one more moving part that can break across three renderers (Android/iOS/web) for a project this size. Plain `StyleSheet`-based themed components have zero extra build tooling and are trivially portable. If a future contributor prefers NativeWind, the token file (`spacing`, `radius`, `fontSize`, `Theme`) is the single place to bridge from.
- **TanStack Query** owns all server/domain data (Supabase reads/writes, cached with query keys). **Zustand** is intentionally restricted to small, ephemeral, device-local UI state (`theme-store.ts`, `app-lock-store.ts`) — never business data. Mixing the two is a common source of stale/duplicated state, so the project convention is: if it round-trips to Supabase, it's a Query; if it's just "is the drawer open," it's Zustand.
- **React Hook Form + Zod** for every form; Zod again at every external I/O boundary (env vars, Supabase responses that need parsing, later: OCR output). `any` is banned via the ESLint config (`@typescript-eslint/no-explicit-any: error`).

### Navigation

A single `AppShell` component (`src/components/layout/AppShell.tsx`) renders either:

- a **bottom tab bar** (5 items: Today, Planner, Money, Notes, Scan) below `DESKTOP_BREAKPOINT` (768px), or
- a **persistent left sidebar** (17 items covering every feature area) at or above that width.

Every top-level route segment (`today/`, `tasks/`, `notes/`, `finance/`, `people/`, `loans/`, `investments/`, `documents/`, `imports/`, `reports/`, `settings/`, `habits/`, `calendar/`, `scan/`) has its own one-line `_layout.tsx` that renders `<AuthenticatedLayout />`, which guards on session and wraps content in `<AppShell>`. This keeps chrome and the auth guard from ever drifting between sections, while matching the flat `app/tasks/`, `app/notes/`, ... structure requested rather than nesting everything inside one route group.

Screens for features not yet built in the current phase render `<ComingSoonScreen phase="Phase N" />` instead of being dead links — see the phase notes below. As of Phase 5 that is only `finance/budgets`.

Every built screen is wrapped in `<Screen>` (`src/components/layout/Screen.tsx`), which owns safe-area insets, gutters, pull-to-refresh, and the max content width so a task list doesn't stretch across a 2000px desktop viewport.

### Backend / database

See [DATABASE.md](./DATABASE.md) for the full schema and [SECURITY.md](./SECURITY.md) for Row Level Security. In short: a proper double-entry ledger (`financial_transactions` + `ledger_entries`) with a Postgres trigger that rejects unbalanced _posted_ transactions, integer minor-unit money throughout, and soft deletion (`deleted_at`) plus `version` columns on every syncable table for the future offline engine.

#### How income and expense balance (the system account)

The `account_type` enum only models accounts the user actually owns or owes — there is no income or expense account to be the other side of a spend. But the balance trigger requires every _confirmed_ transaction's entries to sum to zero, so a one-legged "spent 500 from my bank account" is rejected by Postgres.

The resolution (`0014_system_accounts.sql`, `src/features/finance/ledger.ts`) is a per-user, per-currency **system account** that plays the income/expense (retained earnings) role: an expense debits the asset account and credits the system account; income is the reverse; a transfer needs no system leg because both sides are real accounts. System accounts carry `is_system = true`, are excluded from net worth, and are filtered out of every account list and picker — `useAccounts()` returns real accounts, `useAllAccounts()` includes the system rows for posting. They are created lazily on first use in a currency, made safe against a two-device race by a partial unique index on `(user_id, currency) where is_system`.

Account balances are derived from `ledger_entries` in the client (`useAccountBalances`), not read from `account_balance_snapshots` — that table is a cache with no client-facing write policy, so reading it would show a number the app can never refresh.

### Offline & sync (Phase 6)

Not yet implemented. The plan: Expo SQLite + Drizzle ORM as the mobile working store, with an outbox/pending-sync queue, client-generated UUIDs, and `sync_conflicts` for anything that can't merge automatically. Web talks to Supabase directly via TanStack Query — no local SQLite on web. The domain model (repository interfaces) is designed now so both layers can share it later; see [OFFLINE_SYNC.md](./OFFLINE_SYNC.md).

### Extraction engines (Phase 5)

The `OCRProvider` interface (`src/services/ocr/`) is implemented, and so is the whole pipeline behind it: parse → validate → reconcile → match → review → confirm. What differs from the original design is which _engines_ exist.

Only the **delimited-text engine** is implemented. It reads CSV/TSV statement exports, which is what Nepali banks, wallets and co-operatives actually offer, and it needs no native module and no extra dependency.

**ML Kit and Tesseract are deliberately registered as unavailable** rather than half-built:

- ML Kit needs native modules and therefore a development build. This project is pinned to SDK 54 _specifically_ so it runs in Expo Go (see [AGENTS.md](./AGENTS.md)) — a provider that always throws at runtime would be worse than one that states its requirement up front.
- Tesseract.js + PDF.js would add megabytes of web-only dependency and a worker pipeline for a capability that does nothing on the platform this app is developed against.

Both report an `availability()` reason that the Scan screen renders verbatim, so the app explains the gap instead of failing mysteriously — and implementing either later is a change to one file, not to any call site.

### Reading documents in place (the Reader)

`/reader` (`src/app/reader/index.tsx`, views and parsers in `src/features/documents/viewer/`) opens **any document the app can make sense of — Word, Excel, PowerPoint, OpenDocument, EPUB, PDF, HTML, RTF, Markdown, CSV, images, audio, video and ZIP archives — in the page**, with no download, and, for a file picked off the device, no upload either until the user chooses to save it. It exists because the vault's only previous "open" was `Linking.openURL(signedUrl)`, which on web means a file landing in the downloads folder just to be looked at once.

The decisions that shape it:

- **A URL for the platform, bytes only when the app parses.** `resolveFileFormat` decides what a file _is_ and `viewerKindOf` decides how it is _shown_ — deliberately separate, because a .docx, an .odt, an .epub, an .rtf, an HTML page and a Markdown note all end up in the same view. PDFs, images, audio and video are handed to the browser (or a native `Image`) as a short-lived signed URL, so a 12 MB scan is streamed and decoded by the platform, never held in the JS heap.
- **File contents never enter the query cache.** Every TanStack query in this app is persisted to AsyncStorage (`services/offline/persister.ts`); a file's bytes written there would blow the browser's storage quota and take the whole cache with it. `useReaderContent` keeps them in component state for exactly as long as the file is open, revokes the object URL on unmount, and refuses anything over 64 MB rather than letting the OS kill the tab.
- **Office and OpenDocument files are parsed here, with no dependency.** `.docx`, `.xlsx`, `.pptx`, `.odt`, `.ods`, `.odp` and `.epub` are all ZIPs of XML, so the reader carries the three pieces that unlocks: a raw-DEFLATE decoder (`archive/inflate.ts`, RFC 1951, the reference bit-at-a-time `puff` algorithm), a ZIP central-directory reader (`archive/zip.ts`), and a small forgiving XML reader (`xml.ts`). Each is a couple of hundred lines, pure, and unit-tested against files Python's `zipfile`/`zlib` produced — which is a far better trade than a dependency that has to behave identically on Android, iOS and web, and it means the parsers run the same everywhere with no native module and no `DecompressionStream`.
- **Every formatted document becomes one `RichDocument`.** Word, slides, OpenDocument, EPUB, HTML, RTF and Markdown parse into a flat list of blocks (heading, paragraph, list item, quote, code, table, section, placeholder). One model gives one virtualised renderer, one search implementation and one set of toolbar controls for all seven; a new format is a parser plus a line in `parse-document.ts`. Spreadsheets and archive listings likewise share `DocumentGrid` with CSV.
- **The container has the last word on what a file is.** `sniffFileFormat` reads the first bytes and, for ZIPs, looks inside: `word/document.xml` means Word whatever the name says. Files arrive misnamed constantly — a .docx saved as .zip, an .xlsx mailed as `application/octet-stream` — and the alternative is telling someone their own document is unsupported.
- **No PDF.js.** Rendering PDF pages ourselves would mean a multi-megabyte web-only dependency and a worker pipeline (the same trade-off refused for OCR above). The browser already has a PDF viewer, so the web build embeds the file in an `<iframe>` and native shows a card that hands it to the system viewer — `InlineFrame.web.tsx` / `InlineFrame.tsx`. iOS browsers get the same card, because WebKit renders only the first page of a framed PDF and a silently broken document is worse than an explicit hand-off.
- **HTML is read, never executed.** `<script>`, `<style>` and `<noscript>` bodies are dropped by the parser before anything sees them, and nothing in the pipeline can issue a request — so a saved web page or an emailed HTML receipt is readable without being able to phone home, load a tracking pixel, or run at all.
- **The delimited views reuse `parseDelimited`.** A CSV opens as a real table — sticky header, RFC 4180 quoting, the same preamble-skipping the import pipeline uses — so what the reader shows and what an import would read are the same parse.

Long documents are virtualised (`FlatList` over blocks, lines or rows), search is a literal, index-based scan with per-span highlighting, and Excel's date-styled serials are converted to ISO dates (including the 1900 leap-year bug it inherited from Lotus) so a delivery date doesn't read as `45678`.

**One deployment consequence:** the web CSP in `vercel.json` must allow `blob:` in `connect-src` (reading a picked file's bytes) and in `frame-src` (embedding it). Without those the Reader silently shows nothing on the deployed site while working perfectly against a local dev server, which is exactly the sort of bug that only appears in production.

**The safety property that matters:** extraction writes only to the `extracted_*` staging tables. The single path into `financial_transactions` is `useConfirmExtractedRow`, which runs only from an explicit user action, and records `confirmed_financial_transaction_id` back on the staged row so every imported transaction stays traceable to the file it came from. See [OCR_PIPELINE.md](./OCR_PIPELINE.md).

## A sharp TypeScript edge (worth knowing before touching `src/types/database.ts`)

`src/types/database.ts` is a **hand-written** stand-in for `supabase gen types typescript` output (no live Supabase project is linked yet in this environment). While wiring it up we hit a real, reproducible bug in this `@supabase/supabase-js` / `@supabase/postgrest-js` version: if any table's `Row`/`Insert`/`Update` shape is declared with TypeScript `interface` (instead of `type`), or built via a mapped/utility type (`Partial<T>`, `Pick<T, K>`, even an inline `{[K in keyof T]?: T[K]}`), the generic resolution for `.insert()`/`.update()` silently collapses to `never` for **every** table in the schema, not just the offending one — while `.select()` calls don't visibly error, making it easy to miss. The fix, applied throughout this file: every Row/Insert/Update is a plain `type X = { ... }` with each field spelled out explicitly (no utility types), and every table entry includes an explicit `Relationships: []`, with `Views`/`Functions` present (even if empty) on the schema object. This matches what real `supabase gen types` output looks like anyway — **once a Supabase project is linked, run `npm run db:types` and prefer the generated file over hand-editing this one.**

## Implementation sequence

Phases match the spec's required order. Each phase must typecheck, lint, and pass its tests before the next begins.

1. ~~**Foundation**~~ (done) — project setup, design system, Supabase client, auth, env validation, full DB schema + RLS, responsive nav shell, profile/settings, biometric+PIN app lock, error boundary, logging.
2. ~~**Daily life**~~ (done) — dashboard, tasks, planner, habits, notes, calendar, cross-feature search. Local notification _scheduling_ is deferred to Phase 7 alongside the rest of the delivery work; the preference toggles already exist.
3. ~~**Finance**~~ (done) — accounts with derived balances, ledger-backed income/expense/transfer, categories, counterparties, monthly reports. Multi-currency transactions (a transaction whose accounts don't share a currency) need per-leg exchange rates and land in Phase 4.
4. ~~**Loans & investments**~~ (done) — People module, lending/borrowing, repayments, investments, savings goals, net worth, multi-currency conversion.
5. ~~**Documents & extraction**~~ (done) — document vault, extraction-engine abstraction, delimited statement parsing, review queue, reconciliation, duplicate and counterparty matching. **Image and PDF OCR are registered but not implemented** — see below.
6. **Sync & exports** — offline SQLite engine, outbox queue, conflict handling, CSV/JSON/PDF exports.
7. **Deployment & hardening** — Vercel, Resend, security headers, full test pass, accessibility/performance review.
