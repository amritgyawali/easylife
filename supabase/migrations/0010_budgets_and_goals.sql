-- 0010_budgets_and_goals.sql
-- Budgeting (monthly/yearly, category-level, rollover) and savings goals.

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) > 0),
  period budget_period not null default 'monthly',
  period_start date not null,
  currency text not null default 'NPR' check (char_length(currency) = 3),
  rollover_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, period, period_start)
);

create trigger budgets_set_updated_at
  before update on budgets
  for each row execute function set_updated_at();

create index budgets_user_id_idx on budgets (user_id) where deleted_at is null;

create table budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  planned_amount_minor bigint not null check (planned_amount_minor >= 0),
  carried_over_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_id, category_id)
);

create trigger budget_items_set_updated_at
  before update on budget_items
  for each row execute function set_updated_at();

create index budget_items_budget_idx on budget_items (budget_id);

create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) > 0),
  is_emergency_fund boolean not null default false,
  target_amount_minor bigint not null check (target_amount_minor > 0),
  currency text not null default 'NPR' check (char_length(currency) = 3),
  target_date date,
  linked_account_id uuid references accounts(id) on delete set null,
  icon text,
  color text,
  recurring_contribution_minor bigint,
  recurring_contribution_day smallint check (recurring_contribution_day between 1 and 31),
  is_achieved boolean not null default false,
  achieved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create trigger savings_goals_set_updated_at
  before update on savings_goals
  for each row execute function set_updated_at();

create index savings_goals_user_id_idx on savings_goals (user_id) where deleted_at is null;

create table goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references savings_goals(id) on delete cascade,
  event_type goal_event_type not null,
  amount_minor bigint not null check (amount_minor > 0),
  event_date date not null default current_date,
  financial_transaction_id uuid references financial_transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index goal_events_goal_idx on goal_events (goal_id, event_date);

create or replace function recompute_goal_progress(p_goal_id uuid)
returns bigint
language sql
as $$
  select coalesce(sum(case when event_type = 'contribution' then amount_minor else -amount_minor end), 0)
  from goal_events
  where goal_id = p_goal_id;
$$;
