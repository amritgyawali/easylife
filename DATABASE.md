# Database

PostgreSQL via Supabase. Every table is user-owned and RLS-protected (see [SECURITY.md](./SECURITY.md)). Migrations are plain numbered SQL files in `supabase/migrations/`, applied with the Supabase CLI (`supabase db push` / `supabase db reset` for local dev) — never hand-edited via the dashboard.

## Conventions used throughout

- **Primary keys**: `uuid primary key default gen_random_uuid()`, generated client-side-compatible (client-generated UUIDs are safe to use offline, see [OFFLINE_SYNC.md](./OFFLINE_SYNC.md)).
- **Ownership**: every user-owned table has `user_id uuid not null references auth.users(id) on delete cascade`. Deleting an `auth.users` row cascades everywhere.
- **Money**: always `bigint ..._minor` (integer minor units — paisa for NPR), never `numeric`/`float`. See `src/utils/money.ts` for the conversion layer. NPR 1,250.50 is stored as `125050`.
- **Soft deletion**: syncable/user-editable tables have `deleted_at timestamptz`. Rows are never hard-deleted by normal app flows (see coding rule: never permanently delete user data without explicit confirmation) — indexes are `where deleted_at is null` to keep them useful.
- **Sync metadata**: `created_at`, `updated_at` (auto-maintained by a `set_updated_at()` trigger) on every table; `version integer not null default 1` and `device_id` on tables the offline engine will touch (tasks, notes, accounts, financial_transactions, documents, ...).
- **Enums**: Postgres `enum` types for closed vocabularies (`transaction_type`, `account_type`, `loan_status`, ...) defined in `0001_extensions_and_helpers.sql`.
- **Full-text search**: `gin` indexes over `to_tsvector('english', ...)` on the columns users actually search (task titles/descriptions, notes, transaction descriptions/references, documents). `pg_trgm` is enabled for fuzzy counterparty/search matching.

## The ledger (the core of the finance module)

`financial_transactions` is the user-facing header (one row per thing the user did — an expense, a transfer, a loan repayment, ...). `ledger_entries` is the internal double-entry representation: each entry has `account_id`, `amount_minor` (native to that account's currency), and `amount_transaction_currency_minor` (the same entry expressed in the transaction's accounting currency).

**Invariant, enforced in Postgres, not just application code:** for any `financial_transactions` row with `status = 'confirmed'`, `sum(ledger_entries.amount_transaction_currency_minor)` for that transaction must equal exactly zero. This is a deferred constraint trigger (`ledger_entries_balance_check` in `0008_ledger.sql`) so multi-row inserts for one transaction are checked once, at commit — plus a second trigger that re-checks when a transaction transitions into `confirmed` status. Draft/pending transactions (e.g. mid-review OCR imports) are not required to balance until confirmed.

`transaction_splits` divides one transaction across multiple categories for reporting (e.g. one grocery payment split between food/household/transport) — it does **not** affect `ledger_entries` or account balances, it's purely a reporting-side breakdown.

Balances are never stored as the source of truth: `recompute_account_balance()` / `account_balance_snapshots` derive/cache from `ledger_entries`, and the cache has no client-facing write policy — only trusted server-side logic (a future `SECURITY DEFINER` function) may refresh it.

## People / loans

`loans` + `loan_events` mirror the ledger pattern: a loan's outstanding balance is derived from its events (disbursement, repayment, interest accrual, write-off), never hand-edited. `loan_instalments` holds a custom repayment schedule; `loan_reminders` tracks due-date nudges.

## OCR / extraction pipeline tables

`documents` (the vault) → `extraction_jobs` (one OCR/parse attempt) → `extracted_statements` (header: institution, period, opening/closing balance, reconciliation status) → `extracted_transactions` (one row per detected transaction, with per-row and — via `field_confidence` jsonb — per-field confidence). Nothing here becomes a real `financial_transactions` row without the user explicitly confirming it (`extracted_transactions.review_status`); see [OCR_PIPELINE.md](./OCR_PIPELINE.md).

`import_profiles` are reusable, per-institution column-mapping configs (date format, decimal separator, debit/credit layout) so a new Nepali bank/wallet/cooperative can be supported by adding a profile, not by hardcoding a parser. `import_rules` are the learned "this raw description always means counterparty X / category Y" mappings, created only after a user explicitly confirms a match.

## Full table list

See `supabase/migrations/0001` through `0013` for the authoritative definitions. Summary by area:

| Area                   | Tables                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity/preferences   | `profiles`, `user_preferences`, `devices`, `email_preferences`                                                                                         |
| Tagging                | `tags`, `entity_tags`                                                                                                                                  |
| Tasks/planner          | `projects`, `tasks`, `task_subtasks`, `task_recurrence_rules`, `task_reminders`, `task_dependencies`                                                   |
| Habits                 | `habits`, `habit_entries`                                                                                                                              |
| Notes/calendar         | `notes`, `note_versions`, `note_links`, `calendar_events`                                                                                              |
| Finance reference data | `accounts`, `categories`, `counterparties`, `counterparty_aliases`, `counterparty_bank_references`, `counterparty_wallet_references`, `exchange_rates` |
| Ledger                 | `financial_transactions`, `ledger_entries`, `transaction_splits`, `account_balance_snapshots`                                                          |
| Loans                  | `loans`, `loan_events`, `loan_instalments`, `loan_reminders`                                                                                           |
| Budgets/goals          | `budgets`, `budget_items`, `savings_goals`, `goal_events`                                                                                              |
| Investments            | `investment_assets`, `investment_transactions`, `investment_valuations`                                                                                |
| Documents/OCR          | `documents`, `document_pages`, `import_profiles`, `extraction_jobs`, `extracted_statements`, `extracted_transactions`, `import_rules`, `attachments`   |
| Notifications/audit    | `notifications`, `audit_logs`, `sync_conflicts`                                                                                                        |

## Applying migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                 # apply supabase/migrations/*.sql
psql "$DATABASE_URL" -f supabase/policies/0001_rls_policies.sql   # apply RLS (see SECURITY.md for why this is separate)
```

For local development: `supabase start` (requires Docker) then `supabase db reset` to apply migrations + `supabase/seed.sql` against the local instance.

## Regenerating TypeScript types

`src/types/database.ts` is currently hand-written (see the note in [ARCHITECTURE.md](./ARCHITECTURE.md) about the `interface`-vs-`type` pitfall). Once linked to a real project:

```bash
npm run db:types   # supabase gen types typescript --local > src/types/database.ts
```
