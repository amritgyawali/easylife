/**
 * Hand-authored Supabase database types, transcribed directly from
 * supabase/migrations/*.sql. This file mirrors the shape produced by
 * `supabase gen types typescript`; once the project is linked to a real
 * Supabase instance, regenerate the authoritative version with:
 *
 *   npm run db:types
 *
 * and diff against this file rather than hand-editing drift away silently.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// Enum types (must match supabase/migrations/0001_extensions_and_helpers.sql)
// ---------------------------------------------------------------------------

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export type AccountType =
  | 'cash'
  | 'bank'
  | 'savings'
  | 'current'
  | 'cooperative'
  | 'digital_wallet'
  | 'credit_card'
  | 'loan_receivable'
  | 'loan_payable'
  | 'investment'
  | 'fixed_deposit'
  | 'gold'
  | 'property'
  | 'other_asset'
  | 'other_liability';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'cash_withdrawal'
  | 'cash_deposit'
  | 'money_lent'
  | 'money_borrowed'
  | 'repayment_received'
  | 'repayment_paid'
  | 'interest_received'
  | 'interest_paid'
  | 'investment_purchase'
  | 'investment_sale'
  | 'dividend'
  | 'refund'
  | 'fee'
  | 'adjustment'
  | 'remittance'
  | 'wallet_topup'
  | 'qr_payment';

export type TransactionStatus = 'pending' | 'confirmed' | 'void';
export type LoanDirection = 'lent' | 'borrowed';
export type LoanStatus =
  'draft' | 'active' | 'partially_repaid' | 'overdue' | 'repaid' | 'written_off' | 'cancelled';
export type InterestType = 'none' | 'simple' | 'manual';
export type TaskStatus = 'inbox' | 'planned' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type NoteType =
  | 'plain'
  | 'markdown'
  | 'checklist'
  | 'journal'
  | 'study'
  | 'meeting'
  | 'financial'
  | 'contact'
  | 'document'
  | 'secure';
export type InvestmentAssetType =
  | 'share'
  | 'mutual_fund'
  | 'fixed_deposit'
  | 'gold'
  | 'property'
  | 'business'
  | 'crypto'
  | 'retirement_fund'
  | 'other';
export type InvestmentTxnType = 'buy' | 'sell' | 'dividend' | 'interest' | 'valuation' | 'fee';
export type DocumentType =
  | 'bank_statement'
  | 'receipt'
  | 'invoice'
  | 'loan_agreement'
  | 'investment_statement'
  | 'identity'
  | 'certificate'
  | 'contract'
  | 'other';
export type ExtractionJobStatus =
  'queued' | 'processing' | 'needs_review' | 'reviewed' | 'confirmed' | 'failed' | 'cancelled';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'missing';
export type BudgetPeriod = 'monthly' | 'yearly';
export type GoalEventType = 'contribution' | 'withdrawal';
export type DateSystem = 'AD' | 'BS';
export type AppLanguage = 'en' | 'ne';
export type LinkableEntity =
  | 'task'
  | 'note'
  | 'financial_transaction'
  | 'loan'
  | 'investment_asset'
  | 'document'
  | 'calendar_event'
  | 'counterparty';
export type TaggableEntity =
  | 'task'
  | 'note'
  | 'financial_transaction'
  | 'document'
  | 'loan'
  | 'investment_asset'
  | 'counterparty'
  | 'savings_goal';

// ---------------------------------------------------------------------------
// Generic helpers: Insert/Update are derived from Row, matching the
// convention Supabase's own codegen uses (nullable/defaulted columns become
// optional on insert).
// ---------------------------------------------------------------------------

type ProfilesRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

type UserPreferencesRow = {
  user_id: string;
  timezone: string;
  language: AppLanguage;
  date_system: DateSystem;
  week_start: number;
  theme: 'light' | 'dark' | 'system';
  fiscal_year_start_month: number;
  biometric_lock_enabled: boolean;
  pin_lock_enabled: boolean;
  auto_lock_minutes: number;
  notification_preferences: Json;
  dashboard_layout: Json;
  delete_documents_after_extraction: boolean;
  created_at: string;
  updated_at: string;
};

type DevicesRow = {
  id: string;
  user_id: string;
  device_name: string | null;
  platform: 'ios' | 'android' | 'web';
  push_token: string | null;
  last_seen_at: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

type EmailPreferencesRow = {
  user_id: string;
  welcome_sent_at: string | null;
  security_notifications: boolean;
  weekly_summary: boolean;
  loan_due_reminders: boolean;
  export_ready_notifications: boolean;
  extraction_complete_notifications: boolean;
  backup_reminders: boolean;
  include_amounts_in_email: boolean;
  created_at: string;
  updated_at: string;
};

type AccountsRow = {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  account_type: AccountType;
  currency: string;
  opening_balance_minor: number;
  masked_account_number: string | null;
  last_four: string | null;
  icon: string | null;
  color: string | null;
  notes: string | null;
  is_active: boolean;
  include_in_net_worth: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
};

type CategoriesRow = {
  id: string;
  user_id: string;
  parent_category_id: string | null;
  name: string;
  kind: 'income' | 'expense' | 'transfer' | 'other';
  icon: string | null;
  color: string | null;
  is_system: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CounterpartiesRow = {
  id: string;
  user_id: string;
  display_name: string;
  kind: 'person' | 'business' | 'organization';
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
};

type FinancialTransactionsRow = {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  posting_date: string;
  amount_minor: number;
  currency: string;
  exchange_rate: number | null;
  npr_equivalent_minor: number | null;
  account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  counterparty_id: string | null;
  payment_method: string | null;
  description: string | null;
  reference: string | null;
  notes: string | null;
  location: string | null;
  is_imported: boolean;
  status: TransactionStatus;
  is_reconciled: boolean;
  source_document_id: string | null;
  source_extracted_transaction_id: string | null;
  loan_id: string | null;
  investment_transaction_id: string | null;
  created_by_device_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
};

type LedgerEntriesRow = {
  id: string;
  user_id: string;
  transaction_id: string;
  account_id: string;
  amount_minor: number;
  currency: string;
  amount_transaction_currency_minor: number;
  created_at: string;
};

type LoansRow = {
  id: string;
  user_id: string;
  counterparty_id: string;
  direction: LoanDirection;
  principal_minor: number;
  currency: string;
  loan_date: string;
  due_date: string | null;
  interest_type: InterestType;
  interest_rate_percent: number | null;
  interest_period: 'monthly' | 'yearly' | null;
  repayment_plan: string | null;
  status: LoanStatus;
  written_off_minor: number;
  guarantor_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
};

type TasksRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  waiting_for: string | null;
  list_name: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
  source: 'manual' | 'quick_entry' | 'recurrence';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  device_id: string | null;
};

type NotesRow = {
  id: string;
  user_id: string;
  folder: string | null;
  note_type: NoteType;
  title: string;
  content: string;
  content_checklist: Json | null;
  is_pinned: boolean;
  is_favorite: boolean;
  is_locked: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  device_id: string | null;
};

type DocumentsRow = {
  id: string;
  user_id: string;
  folder: string | null;
  document_type: DocumentType;
  title: string;
  institution: string | null;
  document_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  page_count: number | null;
  extraction_status: ExtractionJobStatus | null;
  is_archived: boolean;
  original_deleted_after_extraction: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
};

// ---------------------------------------------------------------------------
// Insert / Update types.
//
// IMPORTANT: these are written as fully explicit, plain object types — NOT
// derived via `Partial<Row>` / `Pick<Row, Keys>` or any other mapped-type
// utility. Using a mapped type anywhere inside the Tables map breaks
// supabase-js's generic inference for `.insert()`/`.update()` on *every*
// other table in this Database (verified empirically: a single mapped-type
// Insert/Update on one table collapses unrelated tables' mutation argument
// types to `never`). Real `supabase gen types` output is plain object
// literals for exactly this reason — keep it that way here too.
// ---------------------------------------------------------------------------

type ProfilesInsert = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  default_currency?: string;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
};
type ProfilesUpdate = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  default_currency?: string;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
};

type UserPreferencesInsert = {
  user_id: string;
  timezone?: string;
  language?: AppLanguage;
  date_system?: DateSystem;
  week_start?: number;
  theme?: 'light' | 'dark' | 'system';
  fiscal_year_start_month?: number;
  biometric_lock_enabled?: boolean;
  pin_lock_enabled?: boolean;
  auto_lock_minutes?: number;
  notification_preferences?: Json;
  dashboard_layout?: Json;
  delete_documents_after_extraction?: boolean;
  created_at?: string;
  updated_at?: string;
};
type UserPreferencesUpdate = {
  user_id?: string;
  timezone?: string;
  language?: AppLanguage;
  date_system?: DateSystem;
  week_start?: number;
  theme?: 'light' | 'dark' | 'system';
  fiscal_year_start_month?: number;
  biometric_lock_enabled?: boolean;
  pin_lock_enabled?: boolean;
  auto_lock_minutes?: number;
  notification_preferences?: Json;
  dashboard_layout?: Json;
  delete_documents_after_extraction?: boolean;
  created_at?: string;
  updated_at?: string;
};

type DevicesInsert = {
  id?: string;
  user_id: string;
  device_name?: string | null;
  platform: 'ios' | 'android' | 'web';
  push_token?: string | null;
  last_seen_at?: string;
  last_sync_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type DevicesUpdate = {
  id?: string;
  user_id?: string;
  device_name?: string | null;
  platform?: 'ios' | 'android' | 'web';
  push_token?: string | null;
  last_seen_at?: string;
  last_sync_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type EmailPreferencesInsert = {
  user_id: string;
  welcome_sent_at?: string | null;
  security_notifications?: boolean;
  weekly_summary?: boolean;
  loan_due_reminders?: boolean;
  export_ready_notifications?: boolean;
  extraction_complete_notifications?: boolean;
  backup_reminders?: boolean;
  include_amounts_in_email?: boolean;
  created_at?: string;
  updated_at?: string;
};
type EmailPreferencesUpdate = {
  user_id?: string;
  welcome_sent_at?: string | null;
  security_notifications?: boolean;
  weekly_summary?: boolean;
  loan_due_reminders?: boolean;
  export_ready_notifications?: boolean;
  extraction_complete_notifications?: boolean;
  backup_reminders?: boolean;
  include_amounts_in_email?: boolean;
  created_at?: string;
  updated_at?: string;
};

type AccountsInsert = {
  id?: string;
  user_id: string;
  name: string;
  institution?: string | null;
  account_type: AccountType;
  currency?: string;
  opening_balance_minor?: number;
  masked_account_number?: string | null;
  last_four?: string | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  is_active?: boolean;
  include_in_net_worth?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};
type AccountsUpdate = {
  id?: string;
  user_id?: string;
  name?: string;
  institution?: string | null;
  account_type?: AccountType;
  currency?: string;
  opening_balance_minor?: number;
  masked_account_number?: string | null;
  last_four?: string | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  is_active?: boolean;
  include_in_net_worth?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};

type CategoriesInsert = {
  id?: string;
  user_id: string;
  parent_category_id?: string | null;
  name: string;
  kind: 'income' | 'expense' | 'transfer' | 'other';
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};
type CategoriesUpdate = {
  id?: string;
  user_id?: string;
  parent_category_id?: string | null;
  name?: string;
  kind?: 'income' | 'expense' | 'transfer' | 'other';
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

type CounterpartiesInsert = {
  id?: string;
  user_id: string;
  display_name: string;
  kind?: 'person' | 'business' | 'organization';
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};
type CounterpartiesUpdate = {
  id?: string;
  user_id?: string;
  display_name?: string;
  kind?: 'person' | 'business' | 'organization';
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};

type FinancialTransactionsInsert = {
  id?: string;
  user_id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  posting_date?: string;
  amount_minor: number;
  currency: string;
  exchange_rate?: number | null;
  npr_equivalent_minor?: number | null;
  account_id?: string | null;
  destination_account_id?: string | null;
  category_id?: string | null;
  counterparty_id?: string | null;
  payment_method?: string | null;
  description?: string | null;
  reference?: string | null;
  notes?: string | null;
  location?: string | null;
  is_imported?: boolean;
  status?: TransactionStatus;
  is_reconciled?: boolean;
  source_document_id?: string | null;
  source_extracted_transaction_id?: string | null;
  loan_id?: string | null;
  investment_transaction_id?: string | null;
  created_by_device_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};
type FinancialTransactionsUpdate = {
  id?: string;
  user_id?: string;
  transaction_type?: TransactionType;
  transaction_date?: string;
  posting_date?: string;
  amount_minor?: number;
  currency?: string;
  exchange_rate?: number | null;
  npr_equivalent_minor?: number | null;
  account_id?: string | null;
  destination_account_id?: string | null;
  category_id?: string | null;
  counterparty_id?: string | null;
  payment_method?: string | null;
  description?: string | null;
  reference?: string | null;
  notes?: string | null;
  location?: string | null;
  is_imported?: boolean;
  status?: TransactionStatus;
  is_reconciled?: boolean;
  source_document_id?: string | null;
  source_extracted_transaction_id?: string | null;
  loan_id?: string | null;
  investment_transaction_id?: string | null;
  created_by_device_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};

type LedgerEntriesInsert = {
  id?: string;
  user_id: string;
  transaction_id: string;
  account_id: string;
  amount_minor: number;
  currency: string;
  amount_transaction_currency_minor: number;
  created_at?: string;
};
type LedgerEntriesUpdate = {
  id?: string;
  user_id?: string;
  transaction_id?: string;
  account_id?: string;
  amount_minor?: number;
  currency?: string;
  amount_transaction_currency_minor?: number;
  created_at?: string;
};

type LoansInsert = {
  id?: string;
  user_id: string;
  counterparty_id: string;
  direction: LoanDirection;
  principal_minor: number;
  currency: string;
  loan_date: string;
  due_date?: string | null;
  interest_type?: InterestType;
  interest_rate_percent?: number | null;
  interest_period?: 'monthly' | 'yearly' | null;
  repayment_plan?: string | null;
  status?: LoanStatus;
  written_off_minor?: number;
  guarantor_notes?: string | null;
  internal_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};
type LoansUpdate = {
  id?: string;
  user_id?: string;
  counterparty_id?: string;
  direction?: LoanDirection;
  principal_minor?: number;
  currency?: string;
  loan_date?: string;
  due_date?: string | null;
  interest_type?: InterestType;
  interest_rate_percent?: number | null;
  interest_period?: 'monthly' | 'yearly' | null;
  repayment_plan?: string | null;
  status?: LoanStatus;
  written_off_minor?: number;
  guarantor_notes?: string | null;
  internal_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};

type TasksInsert = {
  id?: string;
  user_id: string;
  project_id?: string | null;
  parent_task_id?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  waiting_for?: string | null;
  list_name?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  archived_at?: string | null;
  source?: 'manual' | 'quick_entry' | 'recurrence';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
  device_id?: string | null;
};
type TasksUpdate = {
  id?: string;
  user_id?: string;
  project_id?: string | null;
  parent_task_id?: string | null;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  waiting_for?: string | null;
  list_name?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  archived_at?: string | null;
  source?: 'manual' | 'quick_entry' | 'recurrence';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
  device_id?: string | null;
};

type NotesInsert = {
  id?: string;
  user_id: string;
  folder?: string | null;
  note_type?: NoteType;
  title?: string;
  content?: string;
  content_checklist?: Json | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  is_locked?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
  device_id?: string | null;
};
type NotesUpdate = {
  id?: string;
  user_id?: string;
  folder?: string | null;
  note_type?: NoteType;
  title?: string;
  content?: string;
  content_checklist?: Json | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  is_locked?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
  device_id?: string | null;
};

type DocumentsInsert = {
  id?: string;
  user_id: string;
  folder?: string | null;
  document_type?: DocumentType;
  title: string;
  institution?: string | null;
  document_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  storage_bucket?: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  page_count?: number | null;
  extraction_status?: ExtractionJobStatus | null;
  is_archived?: boolean;
  original_deleted_after_extraction?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};
type DocumentsUpdate = {
  id?: string;
  user_id?: string;
  folder?: string | null;
  document_type?: DocumentType;
  title?: string;
  institution?: string | null;
  document_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  storage_bucket?: string;
  storage_path?: string;
  mime_type?: string;
  file_size_bytes?: number;
  sha256_hash?: string;
  page_count?: number | null;
  extraction_status?: ExtractionJobStatus | null;
  is_archived?: boolean;
  original_deleted_after_extraction?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  version?: number;
};

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfilesRow; Insert: ProfilesInsert; Update: ProfilesUpdate; Relationships: [] };
      user_preferences: {
        Row: UserPreferencesRow;
        Insert: UserPreferencesInsert;
        Update: UserPreferencesUpdate;
        Relationships: [];
      };
      devices: { Row: DevicesRow; Insert: DevicesInsert; Update: DevicesUpdate; Relationships: [] };
      email_preferences: {
        Row: EmailPreferencesRow;
        Insert: EmailPreferencesInsert;
        Update: EmailPreferencesUpdate;
        Relationships: [];
      };
      accounts: { Row: AccountsRow; Insert: AccountsInsert; Update: AccountsUpdate; Relationships: [] };
      categories: {
        Row: CategoriesRow;
        Insert: CategoriesInsert;
        Update: CategoriesUpdate;
        Relationships: [];
      };
      counterparties: {
        Row: CounterpartiesRow;
        Insert: CounterpartiesInsert;
        Update: CounterpartiesUpdate;
        Relationships: [];
      };
      financial_transactions: {
        Row: FinancialTransactionsRow;
        Insert: FinancialTransactionsInsert;
        Update: FinancialTransactionsUpdate;
        Relationships: [];
      };
      ledger_entries: {
        Row: LedgerEntriesRow;
        Insert: LedgerEntriesInsert;
        Update: LedgerEntriesUpdate;
        Relationships: [];
      };
      loans: { Row: LoansRow; Insert: LoansInsert; Update: LoansUpdate; Relationships: [] };
      tasks: { Row: TasksRow; Insert: TasksInsert; Update: TasksUpdate; Relationships: [] };
      notes: { Row: NotesRow; Insert: NotesInsert; Update: NotesUpdate; Relationships: [] };
      documents: { Row: DocumentsRow; Insert: DocumentsInsert; Update: DocumentsUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
