-- 0014_system_accounts.sql
-- Income and expense have no counter-account in the `account_type` enum (it
-- only models things the user actually owns or owes), but the ledger balance
-- trigger in 0008_ledger.sql requires every confirmed transaction's entries
-- to sum to zero. Without a counter-leg, a plain "spent 500 from my bank
-- account" could not be posted at all.
--
-- The resolution is a per-user, per-currency system account that plays the
-- role of the income/expense (retained earnings) side of those entries: an
-- expense debits the asset account and credits the system account, income
-- does the reverse. It is excluded from net worth and filtered out of every
-- account picker and account list, so it never reads as a real account.
--
-- Marking it with a column rather than by name matches how `categories`
-- already distinguishes seeded rows (`categories.is_system`).

alter table accounts add column is_system boolean not null default false;

-- At most one system account per user per currency, so the lazy
-- get-or-create in the client can never race itself into duplicates.
create unique index accounts_system_currency_uniq
  on accounts (user_id, currency)
  where is_system and deleted_at is null;
