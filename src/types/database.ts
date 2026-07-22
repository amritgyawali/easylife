/**
 * Supabase database types, generated from the live `easylife` project
 * (ref: mhtkpfosyhvyrmgaavne) — do not hand-edit.
 *
 * Regenerate after any schema change with:
 *
 *   npm run db:types
 *
 * `Database` must stay a `type` alias and never become an `interface`: an
 * interface does not satisfy supabase-js's index-signature constraint, which
 * silently collapses the argument of .insert()/.update() to `never` rather
 * than raising a useful error.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_balance_snapshots: {
        Row: {
          account_id: string
          as_of: string
          balance_minor: number
          user_id: string
        }
        Insert: {
          account_id: string
          as_of?: string
          balance_minor?: number
          user_id: string
        }
        Update: {
          account_id?: string
          as_of?: string
          balance_minor?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          archived_at: string | null
          color: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          icon: string | null
          id: string
          include_in_net_worth: boolean
          institution: string | null
          is_active: boolean
          last_four: string | null
          masked_account_number: string | null
          name: string
          notes: string | null
          opening_balance_minor: number
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          archived_at?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          include_in_net_worth?: boolean
          institution?: string | null
          is_active?: boolean
          last_four?: string | null
          masked_account_number?: string | null
          name: string
          notes?: string | null
          opening_balance_minor?: number
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          archived_at?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          include_in_net_worth?: boolean
          institution?: string | null
          is_active?: boolean
          last_four?: string | null
          masked_account_number?: string | null
          name?: string
          notes?: string | null
          opening_balance_minor?: number
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          document_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["linkable_entity"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["linkable_entity"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["linkable_entity"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          device_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_hash: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          device_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          device_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          carried_over_minor: number
          category_id: string
          created_at: string
          id: string
          planned_amount_minor: number
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_id: string
          carried_over_minor?: number
          category_id: string
          created_at?: string
          id?: string
          planned_amount_minor: number
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_id?: string
          carried_over_minor?: number
          category_id?: string
          created_at?: string
          id?: string
          planned_amount_minor?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          name: string
          period: Database["public"]["Enums"]["budget_period"]
          period_start: string
          rollover_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          name: string
          period?: Database["public"]["Enums"]["budget_period"]
          period_start: string
          rollover_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          name?: string
          period?: Database["public"]["Enums"]["budget_period"]
          period_start?: string
          rollover_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          starts_at: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          all_day?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          starts_at?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          icon: string | null
          id: string
          is_system: boolean
          kind: string
          name: string
          parent_category_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          kind: string
          name: string
          parent_category_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          kind?: string
          name?: string
          parent_category_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparties: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          email: string | null
          id: string
          is_archived: boolean
          kind: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_archived?: boolean
          kind?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_archived?: boolean
          kind?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      counterparty_aliases: {
        Row: {
          alias: string
          counterparty_id: string
          created_at: string
          id: string
          normalized_alias: string
          source: string
          user_id: string
        }
        Insert: {
          alias: string
          counterparty_id: string
          created_at?: string
          id?: string
          normalized_alias: string
          source?: string
          user_id: string
        }
        Update: {
          alias?: string
          counterparty_id?: string
          created_at?: string
          id?: string
          normalized_alias?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_aliases_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparty_bank_references: {
        Row: {
          bank_name: string | null
          counterparty_id: string
          created_at: string
          id: string
          masked_account_number: string | null
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          counterparty_id: string
          created_at?: string
          id?: string
          masked_account_number?: string | null
          user_id: string
        }
        Update: {
          bank_name?: string | null
          counterparty_id?: string
          created_at?: string
          id?: string
          masked_account_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_bank_references_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparty_wallet_references: {
        Row: {
          counterparty_id: string
          created_at: string
          id: string
          masked_wallet_id: string | null
          user_id: string
          wallet_provider: string | null
        }
        Insert: {
          counterparty_id: string
          created_at?: string
          id?: string
          masked_wallet_id?: string | null
          user_id: string
          wallet_provider?: string | null
        }
        Update: {
          counterparty_id?: string
          created_at?: string
          id?: string
          masked_wallet_id?: string | null
          user_id?: string
          wallet_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_wallet_references_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          last_seen_at: string
          last_sync_at: string | null
          platform: string
          push_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string
          last_sync_at?: string | null
          platform: string
          push_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string
          last_sync_at?: string | null
          platform?: string
          push_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_pages: {
        Row: {
          created_at: string
          document_id: string
          extracted_text: string | null
          has_selectable_text: boolean
          id: string
          page_number: number
          thumbnail_storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          extracted_text?: string | null
          has_selectable_text?: boolean
          id?: string
          page_number: number
          thumbnail_storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          extracted_text?: string | null
          has_selectable_text?: boolean
          id?: string
          page_number?: number
          thumbnail_storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_date: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string | null
          extraction_status:
            | Database["public"]["Enums"]["extraction_job_status"]
            | null
          file_size_bytes: number
          folder: string | null
          id: string
          institution: string | null
          is_archived: boolean
          mime_type: string
          notes: string | null
          original_deleted_after_extraction: boolean
          page_count: number | null
          sha256_hash: string
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          extraction_status?:
            | Database["public"]["Enums"]["extraction_job_status"]
            | null
          file_size_bytes: number
          folder?: string | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          mime_type: string
          notes?: string | null
          original_deleted_after_extraction?: boolean
          page_count?: number | null
          sha256_hash: string
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          extraction_status?:
            | Database["public"]["Enums"]["extraction_job_status"]
            | null
          file_size_bytes?: number
          folder?: string | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          mime_type?: string
          notes?: string | null
          original_deleted_after_extraction?: boolean
          page_count?: number | null
          sha256_hash?: string
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          backup_reminders: boolean
          created_at: string
          export_ready_notifications: boolean
          extraction_complete_notifications: boolean
          include_amounts_in_email: boolean
          loan_due_reminders: boolean
          security_notifications: boolean
          updated_at: string
          user_id: string
          weekly_summary: boolean
          welcome_sent_at: string | null
        }
        Insert: {
          backup_reminders?: boolean
          created_at?: string
          export_ready_notifications?: boolean
          extraction_complete_notifications?: boolean
          include_amounts_in_email?: boolean
          loan_due_reminders?: boolean
          security_notifications?: boolean
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
          welcome_sent_at?: string | null
        }
        Update: {
          backup_reminders?: boolean
          created_at?: string
          export_ready_notifications?: boolean
          extraction_complete_notifications?: boolean
          include_amounts_in_email?: boolean
          loan_due_reminders?: boolean
          security_notifications?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
          welcome_sent_at?: string | null
        }
        Relationships: []
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["taggable_entity"]
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["taggable_entity"]
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["taggable_entity"]
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          as_of_date: string
          created_at: string
          from_currency: string
          id: string
          rate: number
          source: string
          to_currency: string
          user_id: string
        }
        Insert: {
          as_of_date: string
          created_at?: string
          from_currency: string
          id?: string
          rate: number
          source?: string
          to_currency: string
          user_id: string
        }
        Update: {
          as_of_date?: string
          created_at?: string
          from_currency?: string
          id?: string
          rate?: number
          source?: string
          to_currency?: string
          user_id?: string
        }
        Relationships: []
      }
      extracted_statements: {
        Row: {
          account_id: string | null
          account_name: string | null
          closing_balance_minor: number | null
          confidence: Database["public"]["Enums"]["confidence_level"]
          created_at: string
          currency: string | null
          extraction_job_id: string
          id: string
          institution: string | null
          masked_account_number: string | null
          opening_balance_minor: number | null
          reconciliation_diff_minor: number | null
          reconciliation_status: string
          statement_end: string | null
          statement_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          closing_balance_minor?: number | null
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          currency?: string | null
          extraction_job_id: string
          id?: string
          institution?: string | null
          masked_account_number?: string | null
          opening_balance_minor?: number | null
          reconciliation_diff_minor?: number | null
          reconciliation_status?: string
          statement_end?: string | null
          statement_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          closing_balance_minor?: number | null
          confidence?: Database["public"]["Enums"]["confidence_level"]
          created_at?: string
          currency?: string | null
          extraction_job_id?: string
          id?: string
          institution?: string | null
          masked_account_number?: string | null
          opening_balance_minor?: number | null
          reconciliation_diff_minor?: number | null
          reconciliation_status?: string
          statement_end?: string | null
          statement_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_statements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_statements_extraction_job_id_fkey"
            columns: ["extraction_job_id"]
            isOneToOne: false
            referencedRelation: "extraction_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_transactions: {
        Row: {
          bounding_box: Json | null
          confirmed_financial_transaction_id: string | null
          created_at: string
          credit_minor: number | null
          currency: string | null
          debit_minor: number | null
          duplicate_of_transaction_id: string | null
          extracted_statement_id: string
          field_confidence: Json
          id: string
          is_duplicate: boolean
          normalized_description: string | null
          page_number: number | null
          raw_description: string | null
          reference: string | null
          review_status: string
          reviewed_at: string | null
          row_confidence: Database["public"]["Enums"]["confidence_level"]
          row_number: number
          running_balance_minor: number | null
          signed_amount_minor: number | null
          suggested_category_id: string | null
          suggested_counterparty_id: string | null
          transaction_date: string | null
          updated_at: string
          user_id: string
          value_date: string | null
        }
        Insert: {
          bounding_box?: Json | null
          confirmed_financial_transaction_id?: string | null
          created_at?: string
          credit_minor?: number | null
          currency?: string | null
          debit_minor?: number | null
          duplicate_of_transaction_id?: string | null
          extracted_statement_id: string
          field_confidence?: Json
          id?: string
          is_duplicate?: boolean
          normalized_description?: string | null
          page_number?: number | null
          raw_description?: string | null
          reference?: string | null
          review_status?: string
          reviewed_at?: string | null
          row_confidence?: Database["public"]["Enums"]["confidence_level"]
          row_number: number
          running_balance_minor?: number | null
          signed_amount_minor?: number | null
          suggested_category_id?: string | null
          suggested_counterparty_id?: string | null
          transaction_date?: string | null
          updated_at?: string
          user_id: string
          value_date?: string | null
        }
        Update: {
          bounding_box?: Json | null
          confirmed_financial_transaction_id?: string | null
          created_at?: string
          credit_minor?: number | null
          currency?: string | null
          debit_minor?: number | null
          duplicate_of_transaction_id?: string | null
          extracted_statement_id?: string
          field_confidence?: Json
          id?: string
          is_duplicate?: boolean
          normalized_description?: string | null
          page_number?: number | null
          raw_description?: string | null
          reference?: string | null
          review_status?: string
          reviewed_at?: string | null
          row_confidence?: Database["public"]["Enums"]["confidence_level"]
          row_number?: number
          running_balance_minor?: number | null
          signed_amount_minor?: number | null
          suggested_category_id?: string | null
          suggested_counterparty_id?: string | null
          transaction_date?: string | null
          updated_at?: string
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_transactions_confirmed_financial_transaction_id_fkey"
            columns: ["confirmed_financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_transactions_duplicate_of_transaction_id_fkey"
            columns: ["duplicate_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_transactions_extracted_statement_id_fkey"
            columns: ["extracted_statement_id"]
            isOneToOne: false
            referencedRelation: "extracted_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_transactions_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_transactions_suggested_counterparty_id_fkey"
            columns: ["suggested_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string
          engine: string
          error_message: string | null
          id: string
          import_profile_id: string | null
          pages_processed: number
          started_at: string | null
          status: Database["public"]["Enums"]["extraction_job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id: string
          engine: string
          error_message?: string | null
          id?: string
          import_profile_id?: string | null
          pages_processed?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["extraction_job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string
          engine?: string
          error_message?: string | null
          id?: string
          import_profile_id?: string | null
          pages_processed?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["extraction_job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_import_profile_id_fkey"
            columns: ["import_profile_id"]
            isOneToOne: false
            referencedRelation: "import_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          amount_minor: number
          category_id: string | null
          counterparty_id: string | null
          created_at: string
          created_by_device_id: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          destination_account_id: string | null
          exchange_rate: number | null
          id: string
          investment_transaction_id: string | null
          is_imported: boolean
          is_reconciled: boolean
          loan_id: string | null
          location: string | null
          notes: string | null
          npr_equivalent_minor: number | null
          payment_method: string | null
          posting_date: string
          reference: string | null
          source_document_id: string | null
          source_extracted_transaction_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          account_id?: string | null
          amount_minor: number
          category_id?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by_device_id?: string | null
          currency: string
          deleted_at?: string | null
          description?: string | null
          destination_account_id?: string | null
          exchange_rate?: number | null
          id?: string
          investment_transaction_id?: string | null
          is_imported?: boolean
          is_reconciled?: boolean
          loan_id?: string | null
          location?: string | null
          notes?: string | null
          npr_equivalent_minor?: number | null
          payment_method?: string | null
          posting_date?: string
          reference?: string | null
          source_document_id?: string | null
          source_extracted_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          account_id?: string | null
          amount_minor?: number
          category_id?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by_device_id?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          destination_account_id?: string | null
          exchange_rate?: number | null
          id?: string
          investment_transaction_id?: string | null
          is_imported?: boolean
          is_reconciled?: boolean
          loan_id?: string | null
          location?: string | null
          notes?: string | null
          npr_equivalent_minor?: number | null
          payment_method?: string | null
          posting_date?: string
          reference?: string | null
          source_document_id?: string | null
          source_extracted_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_created_by_device_id_fkey"
            columns: ["created_by_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_investment_txn_id_fkey"
            columns: ["investment_transaction_id"]
            isOneToOne: false
            referencedRelation: "investment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_source_extracted_txn_id_fkey"
            columns: ["source_extracted_transaction_id"]
            isOneToOne: false
            referencedRelation: "extracted_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_events: {
        Row: {
          amount_minor: number
          created_at: string
          event_date: string
          event_type: Database["public"]["Enums"]["goal_event_type"]
          financial_transaction_id: string | null
          goal_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          event_date?: string
          event_type: Database["public"]["Enums"]["goal_event_type"]
          financial_transaction_id?: string | null
          goal_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["goal_event_type"]
          financial_transaction_id?: string | null
          goal_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_events_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_entries: {
        Row: {
          count: number
          created_at: string
          entry_date: string
          habit_id: string
          id: string
          is_skipped: boolean
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          entry_date: string
          habit_id: string
          id?: string
          is_skipped?: boolean
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          entry_date?: string
          habit_id?: string
          id?: string
          is_skipped?: boolean
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          by_weekday: number[] | null
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_paused: boolean
          name: string
          paused_at: string | null
          recurrence: string
          reminder_time: string | null
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          by_weekday?: number[] | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_paused?: boolean
          name: string
          paused_at?: string | null
          recurrence?: string
          reminder_time?: string | null
          target_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          by_weekday?: number[] | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_paused?: boolean
          name?: string
          paused_at?: string | null
          recurrence?: string
          reminder_time?: string | null
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_profiles: {
        Row: {
          column_mapping: Json
          created_at: string
          date_format: string | null
          decimal_separator: string
          deleted_at: string | null
          header_row_pattern: string | null
          id: string
          institution_name: string
          is_system_provided: boolean
          profile_type: string
          thousands_separator: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          column_mapping?: Json
          created_at?: string
          date_format?: string | null
          decimal_separator?: string
          deleted_at?: string | null
          header_row_pattern?: string | null
          id?: string
          institution_name: string
          is_system_provided?: boolean
          profile_type?: string
          thousands_separator?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          date_format?: string | null
          decimal_separator?: string
          deleted_at?: string | null
          header_row_pattern?: string | null
          id?: string
          institution_name?: string
          is_system_provided?: boolean
          profile_type?: string
          thousands_separator?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_rules: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          import_profile_id: string | null
          match_field: string
          match_pattern: string
          set_category_id: string | null
          set_counterparty_id: string | null
          set_transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          times_applied: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          import_profile_id?: string | null
          match_field?: string
          match_pattern: string
          set_category_id?: string | null
          set_counterparty_id?: string | null
          set_transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          times_applied?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          import_profile_id?: string | null
          match_field?: string
          match_pattern?: string
          set_category_id?: string | null
          set_counterparty_id?: string | null
          set_transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          times_applied?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_rules_import_profile_id_fkey"
            columns: ["import_profile_id"]
            isOneToOne: false
            referencedRelation: "import_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rules_set_category_id_fkey"
            columns: ["set_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rules_set_counterparty_id_fkey"
            columns: ["set_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["investment_asset_type"]
          created_at: string
          currency: string
          current_price_minor: number | null
          deleted_at: string | null
          id: string
          institution: string | null
          is_archived: boolean
          last_valuation_date: string | null
          name: string
          quantity: number
          symbol: string | null
          tax_notes: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["investment_asset_type"]
          created_at?: string
          currency?: string
          current_price_minor?: number | null
          deleted_at?: string | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          last_valuation_date?: string | null
          name: string
          quantity?: number
          symbol?: string | null
          tax_notes?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["investment_asset_type"]
          created_at?: string
          currency?: string
          current_price_minor?: number | null
          deleted_at?: string | null
          id?: string
          institution?: string | null
          is_archived?: boolean
          last_valuation_date?: string | null
          name?: string
          quantity?: number
          symbol?: string | null
          tax_notes?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          amount_minor: number
          asset_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          fees_minor: number
          financial_transaction_id: string | null
          id: string
          notes: string | null
          price_minor: number | null
          quantity: number | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["investment_txn_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          asset_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          fees_minor?: number
          financial_transaction_id?: string | null
          id?: string
          notes?: string | null
          price_minor?: number | null
          quantity?: number | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["investment_txn_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          asset_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          fees_minor?: number
          financial_transaction_id?: string | null
          id?: string
          notes?: string | null
          price_minor?: number | null
          quantity?: number | null
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["investment_txn_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_valuations: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          price_minor: number
          source: string
          user_id: string
          valuation_date: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          price_minor: number
          source?: string
          user_id: string
          valuation_date: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          price_minor?: number
          source?: string
          user_id?: string
          valuation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_valuations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount_minor: number
          amount_transaction_currency_minor: number
          created_at: string
          currency: string
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount_minor: number
          amount_transaction_currency_minor: number
          created_at?: string
          currency: string
          id?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount_minor?: number
          amount_transaction_currency_minor?: number
          created_at?: string
          currency?: string
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_events: {
        Row: {
          amount_minor: number
          created_at: string
          deleted_at: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["loan_event_type"]
          financial_transaction_id: string | null
          id: string
          loan_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount_minor?: number
          created_at?: string
          deleted_at?: string | null
          event_date?: string
          event_type: Database["public"]["Enums"]["loan_event_type"]
          financial_transaction_id?: string | null
          id?: string
          loan_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          deleted_at?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["loan_event_type"]
          financial_transaction_id?: string | null
          id?: string
          loan_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_events_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_instalments: {
        Row: {
          amount_minor: number
          created_at: string
          due_date: string
          id: string
          loan_id: string
          paid_amount_minor: number
          paid_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          due_date: string
          id?: string
          loan_id: string
          paid_amount_minor?: number
          paid_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          due_date?: string
          id?: string
          loan_id?: string
          paid_amount_minor?: number
          paid_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_instalments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_reminders: {
        Row: {
          channel: string
          created_at: string
          id: string
          loan_id: string
          remind_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          loan_id: string
          remind_at: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          loan_id?: string
          remind_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_reminders_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          counterparty_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          direction: Database["public"]["Enums"]["loan_direction"]
          due_date: string | null
          guarantor_notes: string | null
          id: string
          interest_period: string | null
          interest_rate_percent: number | null
          interest_type: Database["public"]["Enums"]["interest_type"]
          internal_notes: string | null
          loan_date: string
          principal_minor: number
          repayment_plan: string | null
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
          user_id: string
          version: number
          written_off_minor: number
        }
        Insert: {
          counterparty_id: string
          created_at?: string
          currency: string
          deleted_at?: string | null
          direction: Database["public"]["Enums"]["loan_direction"]
          due_date?: string | null
          guarantor_notes?: string | null
          id?: string
          interest_period?: string | null
          interest_rate_percent?: number | null
          interest_type?: Database["public"]["Enums"]["interest_type"]
          internal_notes?: string | null
          loan_date: string
          principal_minor: number
          repayment_plan?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          user_id: string
          version?: number
          written_off_minor?: number
        }
        Update: {
          counterparty_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          direction?: Database["public"]["Enums"]["loan_direction"]
          due_date?: string | null
          guarantor_notes?: string | null
          id?: string
          interest_period?: string | null
          interest_rate_percent?: number | null
          interest_type?: Database["public"]["Enums"]["interest_type"]
          internal_notes?: string | null
          loan_date?: string
          principal_minor?: number
          repayment_plan?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          user_id?: string
          version?: number
          written_off_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "loans_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          created_at: string
          id: string
          linked_entity_id: string
          linked_entity_type: Database["public"]["Enums"]["linkable_entity"]
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_entity_id: string
          linked_entity_type: Database["public"]["Enums"]["linkable_entity"]
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_entity_id?: string
          linked_entity_type?: Database["public"]["Enums"]["linkable_entity"]
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          content: string
          created_at: string
          id: string
          note_id: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_id: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived_at: string | null
          content: string
          content_checklist: Json | null
          created_at: string
          deleted_at: string | null
          device_id: string | null
          folder: string | null
          id: string
          is_favorite: boolean
          is_locked: boolean
          is_pinned: boolean
          note_type: Database["public"]["Enums"]["note_type"]
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          content?: string
          content_checklist?: Json | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string | null
          folder?: string | null
          id?: string
          is_favorite?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          note_type?: Database["public"]["Enums"]["note_type"]
          title?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          content?: string
          content_checklist?: Json | null
          created_at?: string
          deleted_at?: string | null
          device_id?: string | null
          folder?: string | null
          id?: string
          is_favorite?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          note_type?: Database["public"]["Enums"]["note_type"]
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type:
            | Database["public"]["Enums"]["linkable_entity"]
            | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?:
            | Database["public"]["Enums"]["linkable_entity"]
            | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?:
            | Database["public"]["Enums"]["linkable_entity"]
            | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_currency: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          achieved_at: string | null
          archived_at: string | null
          color: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          icon: string | null
          id: string
          is_achieved: boolean
          is_emergency_fund: boolean
          linked_account_id: string | null
          name: string
          recurring_contribution_day: number | null
          recurring_contribution_minor: number | null
          target_amount_minor: number
          target_date: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          achieved_at?: string | null
          archived_at?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_achieved?: boolean
          is_emergency_fund?: boolean
          linked_account_id?: string | null
          name: string
          recurring_contribution_day?: number | null
          recurring_contribution_minor?: number | null
          target_amount_minor: number
          target_date?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          achieved_at?: string | null
          archived_at?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_achieved?: boolean
          is_emergency_fund?: boolean
          linked_account_id?: string | null
          name?: string
          recurring_contribution_day?: number | null
          recurring_contribution_minor?: number | null
          target_amount_minor?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          created_at: string
          device_id: string | null
          entity_id: string
          entity_type: string
          id: string
          local_payload: Json
          local_version: number
          resolution: string | null
          resolved_at: string | null
          server_payload: Json
          server_version: number
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          local_payload: Json
          local_version: number
          resolution?: string | null
          resolved_at?: string | null
          server_payload: Json
          server_version: number
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          local_payload?: Json
          local_version?: number
          resolution?: string | null
          resolved_at?: string | null
          server_payload?: Json
          server_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_recurrence_rules: {
        Row: {
          by_month_day: number[] | null
          by_weekday: number[] | null
          created_at: string
          deleted_at: string | null
          ends_on: string | null
          frequency: string
          id: string
          interval: number
          last_generated_date: string | null
          max_occurrences: number | null
          starts_on: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          by_month_day?: number[] | null
          by_weekday?: number[] | null
          created_at?: string
          deleted_at?: string | null
          ends_on?: string | null
          frequency: string
          id?: string
          interval?: number
          last_generated_date?: string | null
          max_occurrences?: number | null
          starts_on: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          by_month_day?: number[] | null
          by_weekday?: number[] | null
          created_at?: string
          deleted_at?: string | null
          ends_on?: string | null
          frequency?: string
          id?: string
          interval?: number
          last_generated_date?: string | null
          max_occurrences?: number | null
          starts_on?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_recurrence_rules_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          cancelled_at: string | null
          channel: string
          created_at: string
          id: string
          remind_at: string
          sent_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          id?: string
          remind_at: string
          sent_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          id?: string
          remind_at?: string
          sent_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_completed: boolean
          position: number
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          archived_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          device_id: string | null
          due_date: string | null
          due_time: string | null
          estimated_minutes: number | null
          id: string
          list_name: string | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          source: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
          version: number
          waiting_for: string | null
        }
        Insert: {
          actual_minutes?: number | null
          archived_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          id?: string
          list_name?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          source?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
          version?: number
          waiting_for?: string | null
        }
        Update: {
          actual_minutes?: number | null
          archived_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          device_id?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          id?: string
          list_name?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          source?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          waiting_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount_minor: number
          category_id: string | null
          created_at: string
          id: string
          notes: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          category_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_lock_minutes: number
          biometric_lock_enabled: boolean
          created_at: string
          dashboard_layout: Json
          date_system: Database["public"]["Enums"]["date_system"]
          delete_documents_after_extraction: boolean
          fiscal_year_start_month: number
          language: Database["public"]["Enums"]["app_language"]
          notification_preferences: Json
          pin_lock_enabled: boolean
          theme: string
          timezone: string
          updated_at: string
          user_id: string
          week_start: number
        }
        Insert: {
          auto_lock_minutes?: number
          biometric_lock_enabled?: boolean
          created_at?: string
          dashboard_layout?: Json
          date_system?: Database["public"]["Enums"]["date_system"]
          delete_documents_after_extraction?: boolean
          fiscal_year_start_month?: number
          language?: Database["public"]["Enums"]["app_language"]
          notification_preferences?: Json
          pin_lock_enabled?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
          week_start?: number
        }
        Update: {
          auto_lock_minutes?: number
          biometric_lock_enabled?: boolean
          created_at?: string
          dashboard_layout?: Json
          date_system?: Database["public"]["Enums"]["date_system"]
          delete_documents_after_extraction?: boolean
          fiscal_year_start_month?: number
          language?: Database["public"]["Enums"]["app_language"]
          notification_preferences?: Json
          pin_lock_enabled?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          week_start?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_ledger_balanced: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      current_user_id: { Args: never; Returns: string }
      recompute_account_balance: {
        Args: { p_account_id: string }
        Returns: number
      }
      recompute_goal_progress: { Args: { p_goal_id: string }; Returns: number }
      recompute_loan_outstanding: {
        Args: { p_loan_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      account_type:
        | "cash"
        | "bank"
        | "savings"
        | "current"
        | "cooperative"
        | "digital_wallet"
        | "credit_card"
        | "loan_receivable"
        | "loan_payable"
        | "investment"
        | "fixed_deposit"
        | "gold"
        | "property"
        | "other_asset"
        | "other_liability"
      app_language: "en" | "ne"
      budget_period: "monthly" | "yearly"
      confidence_level: "high" | "medium" | "low" | "missing"
      date_system: "AD" | "BS"
      document_type:
        | "bank_statement"
        | "receipt"
        | "invoice"
        | "loan_agreement"
        | "investment_statement"
        | "identity"
        | "certificate"
        | "contract"
        | "other"
      extraction_job_status:
        | "queued"
        | "processing"
        | "needs_review"
        | "reviewed"
        | "confirmed"
        | "failed"
        | "cancelled"
      goal_event_type: "contribution" | "withdrawal"
      interest_type: "none" | "simple" | "manual"
      investment_asset_type:
        | "share"
        | "mutual_fund"
        | "fixed_deposit"
        | "gold"
        | "property"
        | "business"
        | "crypto"
        | "retirement_fund"
        | "other"
      investment_txn_type:
        | "buy"
        | "sell"
        | "dividend"
        | "interest"
        | "valuation"
        | "fee"
      linkable_entity:
        | "task"
        | "note"
        | "financial_transaction"
        | "loan"
        | "investment_asset"
        | "document"
        | "calendar_event"
        | "counterparty"
      loan_direction: "lent" | "borrowed"
      loan_event_type:
        | "disbursement"
        | "repayment"
        | "interest_accrual"
        | "write_off"
        | "reminder_sent"
        | "note"
      loan_status:
        | "draft"
        | "active"
        | "partially_repaid"
        | "overdue"
        | "repaid"
        | "written_off"
        | "cancelled"
      note_type:
        | "plain"
        | "markdown"
        | "checklist"
        | "journal"
        | "study"
        | "meeting"
        | "financial"
        | "contact"
        | "document"
        | "secure"
      sync_status: "synced" | "pending" | "conflict" | "error"
      taggable_entity:
        | "task"
        | "note"
        | "financial_transaction"
        | "document"
        | "loan"
        | "investment_asset"
        | "counterparty"
        | "savings_goal"
      task_priority: "none" | "low" | "medium" | "high" | "urgent"
      task_status:
        | "inbox"
        | "planned"
        | "in_progress"
        | "waiting"
        | "completed"
        | "cancelled"
      transaction_status: "pending" | "confirmed" | "void"
      transaction_type:
        | "income"
        | "expense"
        | "transfer"
        | "cash_withdrawal"
        | "cash_deposit"
        | "money_lent"
        | "money_borrowed"
        | "repayment_received"
        | "repayment_paid"
        | "interest_received"
        | "interest_paid"
        | "investment_purchase"
        | "investment_sale"
        | "dividend"
        | "refund"
        | "fee"
        | "adjustment"
        | "remittance"
        | "wallet_topup"
        | "qr_payment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: [
        "cash",
        "bank",
        "savings",
        "current",
        "cooperative",
        "digital_wallet",
        "credit_card",
        "loan_receivable",
        "loan_payable",
        "investment",
        "fixed_deposit",
        "gold",
        "property",
        "other_asset",
        "other_liability",
      ],
      app_language: ["en", "ne"],
      budget_period: ["monthly", "yearly"],
      confidence_level: ["high", "medium", "low", "missing"],
      date_system: ["AD", "BS"],
      document_type: [
        "bank_statement",
        "receipt",
        "invoice",
        "loan_agreement",
        "investment_statement",
        "identity",
        "certificate",
        "contract",
        "other",
      ],
      extraction_job_status: [
        "queued",
        "processing",
        "needs_review",
        "reviewed",
        "confirmed",
        "failed",
        "cancelled",
      ],
      goal_event_type: ["contribution", "withdrawal"],
      interest_type: ["none", "simple", "manual"],
      investment_asset_type: [
        "share",
        "mutual_fund",
        "fixed_deposit",
        "gold",
        "property",
        "business",
        "crypto",
        "retirement_fund",
        "other",
      ],
      investment_txn_type: [
        "buy",
        "sell",
        "dividend",
        "interest",
        "valuation",
        "fee",
      ],
      linkable_entity: [
        "task",
        "note",
        "financial_transaction",
        "loan",
        "investment_asset",
        "document",
        "calendar_event",
        "counterparty",
      ],
      loan_direction: ["lent", "borrowed"],
      loan_event_type: [
        "disbursement",
        "repayment",
        "interest_accrual",
        "write_off",
        "reminder_sent",
        "note",
      ],
      loan_status: [
        "draft",
        "active",
        "partially_repaid",
        "overdue",
        "repaid",
        "written_off",
        "cancelled",
      ],
      note_type: [
        "plain",
        "markdown",
        "checklist",
        "journal",
        "study",
        "meeting",
        "financial",
        "contact",
        "document",
        "secure",
      ],
      sync_status: ["synced", "pending", "conflict", "error"],
      taggable_entity: [
        "task",
        "note",
        "financial_transaction",
        "document",
        "loan",
        "investment_asset",
        "counterparty",
        "savings_goal",
      ],
      task_priority: ["none", "low", "medium", "high", "urgent"],
      task_status: [
        "inbox",
        "planned",
        "in_progress",
        "waiting",
        "completed",
        "cancelled",
      ],
      transaction_status: ["pending", "confirmed", "void"],
      transaction_type: [
        "income",
        "expense",
        "transfer",
        "cash_withdrawal",
        "cash_deposit",
        "money_lent",
        "money_borrowed",
        "repayment_received",
        "repayment_paid",
        "interest_received",
        "interest_paid",
        "investment_purchase",
        "investment_sale",
        "dividend",
        "refund",
        "fee",
        "adjustment",
        "remittance",
        "wallet_topup",
        "qr_payment",
      ],
    },
  },
} as const

// ---------------------------------------------------------------------------
// Convenience aliases for the generated Postgres enums, so feature code can
// import { AccountType } rather than indexing into Database every time.
// ---------------------------------------------------------------------------

export type AccountType = Database['public']['Enums']['account_type'];
export type AppLanguage = Database['public']['Enums']['app_language'];
export type BudgetPeriod = Database['public']['Enums']['budget_period'];
export type ConfidenceLevel = Database['public']['Enums']['confidence_level'];
export type DateSystem = Database['public']['Enums']['date_system'];
export type DocumentType = Database['public']['Enums']['document_type'];
export type ExtractionJobStatus = Database['public']['Enums']['extraction_job_status'];
export type GoalEventType = Database['public']['Enums']['goal_event_type'];
export type InterestType = Database['public']['Enums']['interest_type'];
export type InvestmentAssetType = Database['public']['Enums']['investment_asset_type'];
export type InvestmentTxnType = Database['public']['Enums']['investment_txn_type'];
export type LinkableEntity = Database['public']['Enums']['linkable_entity'];
export type LoanDirection = Database['public']['Enums']['loan_direction'];
export type LoanEventType = Database['public']['Enums']['loan_event_type'];
export type LoanStatus = Database['public']['Enums']['loan_status'];
export type NoteType = Database['public']['Enums']['note_type'];
export type SyncStatus = Database['public']['Enums']['sync_status'];
export type TaggableEntity = Database['public']['Enums']['taggable_entity'];
export type TaskPriority = Database['public']['Enums']['task_priority'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type TransactionStatus = Database['public']['Enums']['transaction_status'];
export type TransactionType = Database['public']['Enums']['transaction_type'];
