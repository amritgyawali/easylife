-- 0008_ledger.sql
-- The double-entry ledger. This is the financial core of the application:
-- financial_transactions is the user-facing header, ledger_entries is the
-- internal double-entry representation that account balances are derived
-- from, and transaction_splits allows one transaction to be divided across
-- multiple categories for reporting (e.g. one grocery payment split between
-- food / household / transport).
--
-- Balance invariant (enforced by trigger, not just application code):
-- for every financial_transactions row with status = 'confirmed', the sum of
-- its ledger_entries.amount_minor must equal exactly zero. Entries are
-- always denominated in the parent transaction's accounting currency.

create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type transaction_type not null,
  transaction_date date not null,
  posting_date date not null default current_date,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  exchange_rate numeric(20, 8),
  npr_equivalent_minor bigint,
  account_id uuid references accounts(id) on delete restrict,
  destination_account_id uuid references accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  counterparty_id uuid references counterparties(id) on delete set null,
  payment_method text,
  description text,
  reference text,
  notes text,
  location text,
  is_imported boolean not null default false,
  status transaction_status not null default 'confirmed',
  is_reconciled boolean not null default false,
  source_document_id uuid,
  source_extracted_transaction_id uuid,
  loan_id uuid,
  investment_transaction_id uuid,
  created_by_device_id uuid references devices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  check (
    transaction_type <> 'transfer' or destination_account_id is not null
  ),
  check (
    account_id is null or destination_account_id is null or account_id <> destination_account_id
  )
);

create trigger financial_transactions_set_updated_at
  before update on financial_transactions
  for each row execute function set_updated_at();

create index financial_transactions_user_date_idx on financial_transactions (user_id, transaction_date desc) where deleted_at is null;
create index financial_transactions_account_idx on financial_transactions (account_id) where deleted_at is null;
create index financial_transactions_counterparty_idx on financial_transactions (counterparty_id) where deleted_at is null;
create index financial_transactions_category_idx on financial_transactions (category_id) where deleted_at is null;
create index financial_transactions_status_idx on financial_transactions (user_id, status) where deleted_at is null;
create index financial_transactions_search_idx on financial_transactions using gin (
  to_tsvector('english', coalesce(description, '') || ' ' || coalesce(reference, '') || ' ' || coalesce(notes, ''))
);

-- amount_minor / currency are native to account_id (used for account balance
-- calculation). amount_transaction_currency_minor is the same entry expressed
-- in the parent transaction's accounting currency (used for the zero-sum
-- balance check below) — for the common single-currency case the two are
-- identical.
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references financial_transactions(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  amount_minor bigint not null check (amount_minor <> 0),
  currency text not null check (char_length(currency) = 3),
  amount_transaction_currency_minor bigint not null,
  created_at timestamptz not null default now()
);

create index ledger_entries_transaction_idx on ledger_entries (transaction_id);
create index ledger_entries_account_idx on ledger_entries (account_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Balance enforcement trigger
-- ---------------------------------------------------------------------------

create or replace function assert_ledger_balanced(p_transaction_id uuid)
returns void
language plpgsql
as $$
declare
  v_status transaction_status;
  v_sum bigint;
  v_entry_count integer;
begin
  select status into v_status from financial_transactions where id = p_transaction_id;

  -- Only posted (confirmed) transactions must balance. Pending/imported draft
  -- rows may be edited freely until the user confirms them.
  if v_status is distinct from 'confirmed' then
    return;
  end if;

  select coalesce(sum(amount_transaction_currency_minor), 0), count(*)
    into v_sum, v_entry_count
    from ledger_entries
    where transaction_id = p_transaction_id;

  if v_entry_count > 0 and v_sum <> 0 then
    raise exception 'Ledger entries for transaction % do not balance (sum = %)', p_transaction_id, v_sum
      using errcode = '23514';
  end if;
end;
$$;

create or replace function ledger_entries_check_balance()
returns trigger
language plpgsql
as $$
begin
  perform assert_ledger_balanced(coalesce(new.transaction_id, old.transaction_id));
  return coalesce(new, old);
end;
$$;

-- Deferred so multi-row inserts for one transaction (the normal case: two or
-- more legs inserted together) are only checked once, at commit.
create constraint trigger ledger_entries_balance_check
  after insert or update or delete on ledger_entries
  deferrable initially deferred
  for each row execute function ledger_entries_check_balance();

-- Also re-check when a transaction transitions into 'confirmed' status, in
-- case entries were created while it was still 'pending'.
create or replace function financial_transactions_check_balance_on_confirm()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'confirmed' and (old.status is distinct from 'confirmed') then
    perform assert_ledger_balanced(new.id);
  end if;
  return new;
end;
$$;

create trigger financial_transactions_confirm_balance_check
  after update on financial_transactions
  for each row execute function financial_transactions_check_balance_on_confirm();

-- ---------------------------------------------------------------------------
-- Transaction splits: divide one transaction across multiple categories for
-- reporting purposes. Does not affect ledger_entries / account balances.
-- ---------------------------------------------------------------------------

create table transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references financial_transactions(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  amount_minor bigint not null check (amount_minor > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index transaction_splits_transaction_idx on transaction_splits (transaction_id);

-- ---------------------------------------------------------------------------
-- Cached account balance summary (safe cache: always rebuildable from
-- ledger_entries, never authoritative). Refreshed by application code /
-- Edge Function after posting a transaction, not hand-edited.
-- ---------------------------------------------------------------------------

create table account_balance_snapshots (
  account_id uuid primary key references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  balance_minor bigint not null default 0,
  as_of timestamptz not null default now()
);

create or replace function recompute_account_balance(p_account_id uuid)
returns bigint
language sql
as $$
  select coalesce(sum(le.amount_minor), 0)
  from ledger_entries le
  join financial_transactions ft on ft.id = le.transaction_id
  where le.account_id = p_account_id
    and ft.status = 'confirmed'
    and ft.deleted_at is null;
$$;
