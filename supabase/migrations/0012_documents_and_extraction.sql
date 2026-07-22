-- 0012_documents_and_extraction.sql
-- Document vault + the OCR/statement-extraction pipeline. Extracted data is
-- always staged in extraction_jobs -> extracted_statements ->
-- extracted_transactions and requires explicit user confirmation before it
-- is written into financial_transactions (see OCR_PIPELINE.md).

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder text,
  document_type document_type not null default 'other',
  title text not null check (char_length(title) > 0),
  institution text,
  document_date date,
  expiry_date date,
  notes text,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  sha256_hash text not null,
  page_count integer,
  extraction_status extraction_job_status,
  is_archived boolean not null default false,
  original_deleted_after_extraction boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (user_id, sha256_hash)
);

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

create index documents_user_id_idx on documents (user_id) where deleted_at is null;
create index documents_type_idx on documents (user_id, document_type) where deleted_at is null;
create index documents_expiry_idx on documents (user_id, expiry_date) where deleted_at is null and expiry_date is not null;
create index documents_search_idx on documents using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(institution, '') || ' ' || coalesce(notes, '')));

alter table financial_transactions
  add constraint financial_transactions_source_document_id_fkey
  foreign key (source_document_id) references documents(id) on delete set null;

create table document_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  extracted_text text,
  thumbnail_storage_path text,
  has_selectable_text boolean not null default false,
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create index document_pages_document_idx on document_pages (document_id, page_number);
create index document_pages_text_search_idx on document_pages using gin (to_tsvector('english', coalesce(extracted_text, '')));

-- Reusable per-institution import profiles so new Nepali banks/wallets/
-- cooperatives can be added without code changes (column header mappings,
-- date/number formats, debit/credit layout, etc.).
create table import_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_name text not null,
  profile_type text not null default 'bank_statement' check (profile_type in ('bank_statement', 'wallet_statement', 'receipt')),
  column_mapping jsonb not null default '{}'::jsonb,
  date_format text,
  decimal_separator text not null default '.',
  thousands_separator text,
  header_row_pattern text,
  is_system_provided boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger import_profiles_set_updated_at
  before update on import_profiles
  for each row execute function set_updated_at();

create index import_profiles_user_idx on import_profiles (user_id) where deleted_at is null;

create table extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  import_profile_id uuid references import_profiles(id) on delete set null,
  status extraction_job_status not null default 'queued',
  engine text not null check (engine in ('pdf_text', 'mlkit', 'tesseract_web', 'server_fallback')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  pages_processed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger extraction_jobs_set_updated_at
  before update on extraction_jobs
  for each row execute function set_updated_at();

create index extraction_jobs_document_idx on extraction_jobs (document_id);
create index extraction_jobs_status_idx on extraction_jobs (user_id, status);

create table extracted_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extraction_job_id uuid not null references extraction_jobs(id) on delete cascade,
  institution text,
  account_name text,
  masked_account_number text,
  currency text,
  statement_start date,
  statement_end date,
  opening_balance_minor bigint,
  closing_balance_minor bigint,
  reconciliation_diff_minor bigint,
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending', 'balanced', 'mismatch')),
  account_id uuid references accounts(id) on delete set null,
  confidence confidence_level not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger extracted_statements_set_updated_at
  before update on extracted_statements
  for each row execute function set_updated_at();

create index extracted_statements_job_idx on extracted_statements (extraction_job_id);

create table extracted_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extracted_statement_id uuid not null references extracted_statements(id) on delete cascade,
  row_number integer not null,
  page_number integer,
  transaction_date date,
  value_date date,
  raw_description text,
  normalized_description text,
  suggested_counterparty_id uuid references counterparties(id) on delete set null,
  reference text,
  debit_minor bigint,
  credit_minor bigint,
  signed_amount_minor bigint,
  running_balance_minor bigint,
  currency text,
  suggested_category_id uuid references categories(id) on delete set null,
  bounding_box jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  row_confidence confidence_level not null default 'medium',
  is_duplicate boolean not null default false,
  duplicate_of_transaction_id uuid references financial_transactions(id) on delete set null,
  review_status text not null default 'pending' check (review_status in ('pending', 'confirmed', 'rejected', 'merged')),
  confirmed_financial_transaction_id uuid references financial_transactions(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger extracted_transactions_set_updated_at
  before update on extracted_transactions
  for each row execute function set_updated_at();

create index extracted_transactions_statement_idx on extracted_transactions (extracted_statement_id, row_number);
create index extracted_transactions_review_idx on extracted_transactions (user_id, review_status);

alter table financial_transactions
  add constraint financial_transactions_source_extracted_txn_id_fkey
  foreign key (source_extracted_transaction_id) references extracted_transactions(id) on delete set null;

-- Saved mapping rules learned from confirmed reviews (e.g. "raw description
-- containing X always maps to counterparty Y / category Z"), reused on
-- future imports for the same import profile.
create table import_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_profile_id uuid references import_profiles(id) on delete cascade,
  match_pattern text not null,
  match_field text not null default 'normalized_description' check (match_field in ('normalized_description', 'reference')),
  set_counterparty_id uuid references counterparties(id) on delete set null,
  set_category_id uuid references categories(id) on delete set null,
  set_transaction_type transaction_type,
  times_applied integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger import_rules_set_updated_at
  before update on import_rules
  for each row execute function set_updated_at();

create index import_rules_user_idx on import_rules (user_id) where deleted_at is null;
create index import_rules_pattern_idx on import_rules using gin (match_pattern gin_trgm_ops);

-- Generic attachment linking: a vault document attached to any other entity
-- (a receipt on a transaction, a supporting document on a loan, a file on a
-- note/task). Distinct from `documents`, which is the vault record itself.
create table attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  entity_type linkable_entity not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (document_id, entity_type, entity_id)
);

create index attachments_entity_idx on attachments (user_id, entity_type, entity_id);
create index attachments_document_idx on attachments (document_id);
