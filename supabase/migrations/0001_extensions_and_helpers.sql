-- 0001_extensions_and_helpers.sql
-- Extensions, shared enum types and helper functions/triggers used by every
-- subsequent migration. Amrit LifeOS stores all money as bigint minor units
-- and relies on Postgres-level constraints (not just client code) to protect
-- financial integrity.

create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists pg_trgm;       -- fuzzy counterparty / search matching
create extension if not exists unaccent;      -- diacritic-insensitive search

-- ---------------------------------------------------------------------------
-- Shared enum types
-- ---------------------------------------------------------------------------

create type sync_status as enum ('synced', 'pending', 'conflict', 'error');

create type account_type as enum (
  'cash', 'bank', 'savings', 'current', 'cooperative', 'digital_wallet',
  'credit_card', 'loan_receivable', 'loan_payable', 'investment',
  'fixed_deposit', 'gold', 'property', 'other_asset', 'other_liability'
);

create type transaction_type as enum (
  'income', 'expense', 'transfer', 'cash_withdrawal', 'cash_deposit',
  'money_lent', 'money_borrowed', 'repayment_received', 'repayment_paid',
  'interest_received', 'interest_paid', 'investment_purchase', 'investment_sale',
  'dividend', 'refund', 'fee', 'adjustment', 'remittance', 'wallet_topup',
  'qr_payment'
);

create type transaction_status as enum ('pending', 'confirmed', 'void');

create type loan_direction as enum ('lent', 'borrowed');

create type loan_status as enum (
  'draft', 'active', 'partially_repaid', 'overdue', 'repaid', 'written_off', 'cancelled'
);

create type interest_type as enum ('none', 'simple', 'manual');

create type task_status as enum ('inbox', 'planned', 'in_progress', 'waiting', 'completed', 'cancelled');

create type task_priority as enum ('none', 'low', 'medium', 'high', 'urgent');

create type note_type as enum (
  'plain', 'markdown', 'checklist', 'journal', 'study', 'meeting',
  'financial', 'contact', 'document', 'secure'
);

create type investment_asset_type as enum (
  'share', 'mutual_fund', 'fixed_deposit', 'gold', 'property',
  'business', 'crypto', 'retirement_fund', 'other'
);

create type investment_txn_type as enum ('buy', 'sell', 'dividend', 'interest', 'valuation', 'fee');

create type document_type as enum (
  'bank_statement', 'receipt', 'invoice', 'loan_agreement',
  'investment_statement', 'identity', 'certificate', 'contract', 'other'
);

create type extraction_job_status as enum (
  'queued', 'processing', 'needs_review', 'reviewed', 'confirmed', 'failed', 'cancelled'
);

create type confidence_level as enum ('high', 'medium', 'low', 'missing');

create type budget_period as enum ('monthly', 'yearly');

create type goal_event_type as enum ('contribution', 'withdrawal');

create type date_system as enum ('AD', 'BS');

create type app_language as enum ('en', 'ne');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ownership helper: every user-owned table must have user_id uuid referencing
-- auth.users(id). This function is used by RLS policies (see
-- supabase/policies) and by triggers that need to stamp user_id.
-- ---------------------------------------------------------------------------

create or replace function current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
