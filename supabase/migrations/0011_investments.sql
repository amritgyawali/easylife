-- 0011_investments.sql
-- Manual investment tracking (shares, mutual funds, fixed deposits, gold,
-- property, business, crypto, retirement, other). No paid live-price API
-- dependency: current_price_minor is manually entered and price providers
-- are added later behind an interface (see PriceProvider in services/).

create table investment_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) > 0),
  asset_type investment_asset_type not null,
  symbol text,
  institution text,
  currency text not null default 'NPR' check (char_length(currency) = 3),
  quantity numeric(20, 6) not null default 0,
  current_price_minor bigint,
  last_valuation_date date,
  tax_notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create trigger investment_assets_set_updated_at
  before update on investment_assets
  for each row execute function set_updated_at();

create index investment_assets_user_id_idx on investment_assets (user_id) where deleted_at is null;

create table investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references investment_assets(id) on delete cascade,
  txn_type investment_txn_type not null,
  txn_date date not null,
  quantity numeric(20, 6),
  price_minor bigint,
  fees_minor bigint not null default 0,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'NPR' check (char_length(currency) = 3),
  financial_transaction_id uuid references financial_transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger investment_transactions_set_updated_at
  before update on investment_transactions
  for each row execute function set_updated_at();

create index investment_transactions_asset_idx on investment_transactions (asset_id, txn_date);
create index investment_transactions_financial_txn_idx on investment_transactions (financial_transaction_id);

create table investment_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references investment_assets(id) on delete cascade,
  valuation_date date not null,
  price_minor bigint not null check (price_minor >= 0),
  source text not null default 'manual' check (source in ('manual', 'provider')),
  created_at timestamptz not null default now(),
  unique (asset_id, valuation_date)
);

create index investment_valuations_asset_idx on investment_valuations (asset_id, valuation_date desc);

alter table financial_transactions
  add constraint financial_transactions_investment_txn_id_fkey
  foreign key (investment_transaction_id) references investment_transactions(id) on delete set null;
