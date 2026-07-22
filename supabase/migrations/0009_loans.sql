-- 0009_loans.sql
-- Person-centric loan / personal-ledger module (money lent and borrowed).
-- A loan's running balance is derived from loan_events, never hand-edited,
-- mirroring the double-entry ledger's "no direct mutation of history" rule.

create table loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty_id uuid not null references counterparties(id) on delete restrict,
  direction loan_direction not null,
  principal_minor bigint not null check (principal_minor > 0),
  currency text not null check (char_length(currency) = 3),
  loan_date date not null,
  due_date date,
  interest_type interest_type not null default 'none',
  interest_rate_percent numeric(6, 3),
  interest_period text check (interest_period in ('monthly', 'yearly')),
  repayment_plan text,
  status loan_status not null default 'active',
  written_off_minor bigint not null default 0 check (written_off_minor >= 0),
  guarantor_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  check (
    interest_type = 'none' or interest_rate_percent is not null
  )
);

create trigger loans_set_updated_at
  before update on loans
  for each row execute function set_updated_at();

create index loans_user_id_idx on loans (user_id) where deleted_at is null;
create index loans_counterparty_idx on loans (counterparty_id) where deleted_at is null;
create index loans_status_idx on loans (user_id, status) where deleted_at is null;
create index loans_due_date_idx on loans (user_id, due_date) where deleted_at is null and status in ('active', 'partially_repaid', 'overdue');

-- Now that financial_transactions/loans both exist, wire loan_id FK back.
alter table financial_transactions
  add constraint financial_transactions_loan_id_fkey
  foreign key (loan_id) references loans(id) on delete set null;

create index financial_transactions_loan_idx on financial_transactions (loan_id) where deleted_at is null;

-- Every change to a loan's outstanding balance (disbursement, repayment,
-- interest accrual, write-off, instalment schedule) is an event. The loan's
-- current status/outstanding amount is derived by summing these, exactly
-- like ledger_entries drive account balances.
create type loan_event_type as enum (
  'disbursement', 'repayment', 'interest_accrual', 'write_off', 'reminder_sent', 'note'
);

create table loan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  event_type loan_event_type not null,
  amount_minor bigint not null default 0,
  event_date date not null default current_date,
  financial_transaction_id uuid references financial_transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index loan_events_loan_idx on loan_events (loan_id, event_date);
create index loan_events_transaction_idx on loan_events (financial_transaction_id);

create or replace function recompute_loan_outstanding(p_loan_id uuid)
returns bigint
language sql
as $$
  select p.principal_minor
    - coalesce((select sum(amount_minor) from loan_events
                where loan_id = p_loan_id and event_type = 'repayment' and deleted_at is null), 0)
    - coalesce((select sum(amount_minor) from loan_events
                where loan_id = p_loan_id and event_type = 'write_off' and deleted_at is null), 0)
    + coalesce((select sum(amount_minor) from loan_events
                where loan_id = p_loan_id and event_type = 'interest_accrual' and deleted_at is null), 0)
  from loans p
  where p.id = p_loan_id;
$$;

-- Instalment schedule (custom repayment plans).
create table loan_instalments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  due_date date not null,
  amount_minor bigint not null check (amount_minor > 0),
  paid_amount_minor bigint not null default 0 check (paid_amount_minor >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger loan_instalments_set_updated_at
  before update on loan_instalments
  for each row execute function set_updated_at();

create index loan_instalments_loan_idx on loan_instalments (loan_id, due_date);

create table loan_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'email' check (channel in ('email', 'local_notification')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index loan_reminders_loan_idx on loan_reminders (loan_id);
create index loan_reminders_due_idx on loan_reminders (user_id, remind_at) where sent_at is null;
