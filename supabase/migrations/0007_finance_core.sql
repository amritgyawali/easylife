-- 0007_finance_core.sql
-- Accounts, categories, counterparties and exchange rates: the reference
-- data that financial_transactions / ledger_entries (0008) point to.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) > 0),
  institution text,
  account_type account_type not null,
  currency text not null default 'NPR' check (char_length(currency) = 3),
  opening_balance_minor bigint not null default 0,
  masked_account_number text,
  last_four text check (last_four is null or char_length(last_four) = 4),
  icon text,
  color text,
  notes text,
  is_active boolean not null default true,
  include_in_net_worth boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create trigger accounts_set_updated_at
  before update on accounts
  for each row execute function set_updated_at();

create index accounts_user_id_idx on accounts (user_id) where deleted_at is null;

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_category_id uuid references categories(id) on delete set null,
  name text not null check (char_length(name) > 0),
  kind text not null check (kind in ('income', 'expense', 'transfer', 'other')),
  icon text,
  color text,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, parent_category_id, name)
);

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

create index categories_user_id_idx on categories (user_id) where deleted_at is null;

create table counterparties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) > 0),
  kind text not null default 'person' check (kind in ('person', 'business', 'organization')),
  phone text,
  email text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create trigger counterparties_set_updated_at
  before update on counterparties
  for each row execute function set_updated_at();

create index counterparties_user_id_idx on counterparties (user_id) where deleted_at is null;
create index counterparties_search_idx on counterparties using gin (display_name gin_trgm_ops);

-- Known aliases / normalised raw-description fragments that resolve to a
-- counterparty. Populated both manually and via confirmed OCR-import matches
-- (see 22. Counterparty recognition). Never merges two people automatically.
create table counterparty_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty_id uuid not null references counterparties(id) on delete cascade,
  alias text not null check (char_length(alias) > 0),
  normalized_alias text not null,
  source text not null default 'manual' check (source in ('manual', 'import_confirmed')),
  created_at timestamptz not null default now(),
  unique (user_id, normalized_alias)
);

create index counterparty_aliases_counterparty_idx on counterparty_aliases (counterparty_id);
create index counterparty_aliases_search_idx on counterparty_aliases using gin (normalized_alias gin_trgm_ops);

create table counterparty_bank_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty_id uuid not null references counterparties(id) on delete cascade,
  bank_name text,
  masked_account_number text,
  created_at timestamptz not null default now()
);

create index counterparty_bank_refs_counterparty_idx on counterparty_bank_references (counterparty_id);

create table counterparty_wallet_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty_id uuid not null references counterparties(id) on delete cascade,
  wallet_provider text,
  masked_wallet_id text,
  created_at timestamptz not null default now()
);

create index counterparty_wallet_refs_counterparty_idx on counterparty_wallet_references (counterparty_id);

-- Manually supplied exchange rates (no paid FX API dependency). Rate converts
-- 1 unit of from_currency into to_currency.
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_currency text not null check (char_length(from_currency) = 3),
  to_currency text not null check (char_length(to_currency) = 3),
  rate numeric(20, 8) not null check (rate > 0),
  as_of_date date not null,
  source text not null default 'manual' check (source in ('manual', 'imported')),
  created_at timestamptz not null default now(),
  unique (user_id, from_currency, to_currency, as_of_date)
);

create index exchange_rates_lookup_idx on exchange_rates (user_id, from_currency, to_currency, as_of_date desc);
