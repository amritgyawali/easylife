import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import type { Database } from '@/types/database';
import { getOrCreateSystemAccount } from '@/features/finance/accounts-api';
import { buildLedgerLegs, isBalanced } from '@/features/finance/ledger';
import { normaliseDescription } from '@/features/imports/normalise';
import type { ParsedRow } from '@/features/imports/parse-statement';
import type { ReconciliationResult } from '@/features/imports/reconcile';
import type { DuplicateMatch } from '@/features/imports/duplicates';

export type ExtractionJobRow = Database['public']['Tables']['extraction_jobs']['Row'];
export type ExtractedStatementRow = Database['public']['Tables']['extracted_statements']['Row'];
export type ExtractedTransactionRow = Database['public']['Tables']['extracted_transactions']['Row'];
export type ImportProfileRow = Database['public']['Tables']['import_profiles']['Row'];

export const importKeys = {
  all: (userId: string) => ['imports', userId] as const,
  jobs: (userId: string) => ['imports', userId, 'jobs'] as const,
  statements: (userId: string) => ['imports', userId, 'statements'] as const,
  rows: (userId: string, statementId: string) => ['imports', userId, 'rows', statementId] as const,
  profiles: (userId: string) => ['imports', userId, 'profiles'] as const,
};

export function useExtractionJobs() {
  const userId = useUserId();

  return useQuery({
    queryKey: importKeys.jobs(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('extraction_jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export function useExtractedStatements() {
  const userId = useUserId();

  return useQuery({
    queryKey: importKeys.statements(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('extracted_statements')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export function useExtractedRows(statementId: string | null) {
  const userId = useUserId();

  return useQuery({
    queryKey: importKeys.rows(userId, statementId ?? 'none'),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('extracted_transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('extracted_statement_id', statementId!)
          .order('row_number')
      );
    },
    enabled: userId !== 'anonymous' && Boolean(statementId),
  });
}

export function useImportProfiles() {
  const userId = useUserId();

  return useQuery({
    queryKey: importKeys.profiles(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('import_profiles')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('institution_name')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface SaveExtractionInput {
  documentId: string;
  engine: ExtractionJobRow['engine'];
  institution: string | null;
  accountId: string | null;
  currency: string;
  openingBalanceMinor: number | null;
  closingBalanceMinor: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  rows: ParsedRow[];
  reconciliation: ReconciliationResult;
  duplicates: DuplicateMatch[];
  /** Per-row suggestions the user has not yet confirmed. */
  suggestions: Record<number, { counterpartyId: string | null; categoryId: string | null }>;
}

/**
 * Persists one extraction: job, statement header, and every candidate row.
 *
 * Everything lands in the `extracted_*` staging tables and *nothing* touches
 * `financial_transactions`. That separation is the core safety property of
 * the whole import pipeline — a real ledger row is only ever created by
 * `useConfirmExtractedRow` below, in direct response to a user action.
 */
export function useSaveExtraction() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveExtractionInput): Promise<string> => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const jobId = randomUUID();
      const statementId = randomUUID();

      unwrapVoid(
        await supabase.from('extraction_jobs').insert({
          id: jobId,
          user_id: owner,
          document_id: input.documentId,
          engine: input.engine,
          // The rows still need a human decision, which is exactly what
          // 'needs_review' means — not 'confirmed'.
          status: 'needs_review',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          pages_processed: 1,
        })
      );

      unwrapVoid(
        await supabase.from('extracted_statements').insert({
          id: statementId,
          user_id: owner,
          extraction_job_id: jobId,
          institution: input.institution,
          account_id: input.accountId,
          currency: input.currency,
          statement_start: input.periodStart,
          statement_end: input.periodEnd,
          opening_balance_minor: input.openingBalanceMinor,
          closing_balance_minor: input.closingBalanceMinor,
          reconciliation_diff_minor: input.reconciliation.differenceMinor,
          reconciliation_status: input.reconciliation.status,
        })
      );

      const duplicateByRow = new Map(input.duplicates.map((match) => [match.rowNumber, match]));

      const rowsResult = await supabase.from('extracted_transactions').insert(
        input.rows.map((row) => {
          const duplicate = duplicateByRow.get(row.rowNumber);
          const suggestion = input.suggestions[row.rowNumber];

          return {
            user_id: owner,
            extracted_statement_id: statementId,
            row_number: row.rowNumber,
            transaction_date: row.transactionDate,
            value_date: row.valueDate,
            raw_description: row.rawDescription,
            normalized_description: row.normalizedDescription,
            reference: row.reference,
            debit_minor: row.debitMinor,
            credit_minor: row.creditMinor,
            signed_amount_minor: row.signedAmountMinor,
            running_balance_minor: row.runningBalanceMinor,
            currency: input.currency,
            suggested_counterparty_id: suggestion?.counterpartyId ?? null,
            suggested_category_id: suggestion?.categoryId ?? null,
            field_confidence: row.fieldConfidence,
            row_confidence: row.rowConfidence,
            is_duplicate: Boolean(duplicate),
            duplicate_of_transaction_id: duplicate?.transactionId ?? null,
            review_status: 'pending',
          };
        })
      );

      if (rowsResult.error) {
        // Cascades to the statement and its rows, so a half-saved import
        // never shows up in the review queue.
        await supabase.from('extraction_jobs').delete().eq('id', jobId);
        throw new AppError('unknown', rowsResult.error.message, rowsResult.error);
      }

      unwrapVoid(
        await supabase
          .from('documents')
          .update({ extraction_status: 'needs_review' })
          .eq('id', input.documentId)
      );

      return statementId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.all(userId) });
      void queryClient.invalidateQueries({ queryKey: ['documents', userId] });
    },
  });
}

export interface ConfirmRowInput {
  row: ExtractedTransactionRow;
  accountId: string;
  categoryId: string | null;
  counterpartyId: string | null;
  /** When set, a confirmed alias is saved so this description resolves next time. */
  saveAlias: boolean;
}

/**
 * Turns one reviewed row into a real, balanced ledger transaction.
 *
 * This is the only path from the staging tables into `financial_transactions`,
 * and it only runs from an explicit user action — step 15 of the pipeline
 * design. The extracted row keeps a pointer to what it produced
 * (`confirmed_financial_transaction_id`) so the import stays auditable.
 */
export function useConfirmExtractedRow() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmRowInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const { row } = input;

      if (row.signed_amount_minor === null || row.signed_amount_minor === 0) {
        throw new AppError('validation_failed', 'This row has no usable amount');
      }
      if (!row.transaction_date) {
        throw new AppError('validation_failed', 'This row has no date');
      }

      const currency = row.currency ?? 'NPR';
      const isIncome = row.signed_amount_minor > 0;
      const amountMinor = Math.abs(row.signed_amount_minor);

      const systemAccountId = await getOrCreateSystemAccount(owner, currency);

      const legs = buildLedgerLegs({
        kind: isIncome ? 'income' : 'expense',
        amountMinor,
        currency,
        accountId: input.accountId,
        systemAccountId,
      });

      if (!isBalanced(legs)) {
        throw new AppError('validation_failed', 'Ledger entries for this row do not balance');
      }

      const transactionId = randomUUID();

      unwrapVoid(
        await supabase.from('financial_transactions').insert({
          id: transactionId,
          user_id: owner,
          transaction_type: isIncome ? 'income' : 'expense',
          transaction_date: row.transaction_date,
          amount_minor: amountMinor,
          currency,
          account_id: input.accountId,
          category_id: input.categoryId,
          counterparty_id: input.counterpartyId,
          description: row.raw_description,
          reference: row.reference,
          // Marks the row's provenance, which reports and the audit trail use
          // to distinguish imported money from hand-entered money.
          is_imported: true,
          source_extracted_transaction_id: row.id,
          status: 'confirmed',
        })
      );

      const entriesResult = await supabase.from('ledger_entries').insert(
        legs.map((leg) => ({
          user_id: owner,
          transaction_id: transactionId,
          account_id: leg.accountId,
          amount_minor: leg.amountMinor,
          currency: leg.currency,
          amount_transaction_currency_minor: leg.amountTransactionCurrencyMinor,
        }))
      );

      if (entriesResult.error) {
        await supabase.from('financial_transactions').delete().eq('id', transactionId);
        throw new AppError('validation_failed', entriesResult.error.message, entriesResult.error);
      }

      unwrapVoid(
        await supabase
          .from('extracted_transactions')
          .update({
            review_status: 'confirmed',
            confirmed_financial_transaction_id: transactionId,
            reviewed_at: new Date().toISOString(),
            suggested_category_id: input.categoryId,
            suggested_counterparty_id: input.counterpartyId,
          })
          .eq('id', row.id)
      );

      // Only written once the user has confirmed the match, so the app never
      // teaches itself an association the user didn't agree to.
      if (input.saveAlias && input.counterpartyId && row.raw_description) {
        await supabase.from('counterparty_aliases').insert({
          user_id: owner,
          counterparty_id: input.counterpartyId,
          alias: row.raw_description,
          // Stored normalised as well as raw so the next import matches on the
          // same cleaned form the matcher compares against, rather than having
          // to re-derive it and risk the two drifting apart.
          normalized_alias: normaliseDescription(row.raw_description),
          source: 'import_confirmed',
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.all(userId) });
      void queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      void queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
    },
  });
}

export function useRejectExtractedRow() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rowId: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase
          .from('extracted_transactions')
          .update({ review_status: 'rejected', reviewed_at: new Date().toISOString() })
          .eq('id', rowId)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: importKeys.all(userId) }),
  });
}

export interface SaveImportProfileInput {
  institutionName: string;
  columnMapping: Record<string, string>;
  dateFormat: string | null;
  decimalSeparator: string;
  thousandsSeparator: string | null;
  headerRowPattern: string | null;
}

/**
 * Saves a corrected column mapping so the same bank's next export parses
 * without re-teaching the app — the "add a profile, not a parser" rule from
 * OCR_PIPELINE.md.
 */
export function useSaveImportProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveImportProfileInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('import_profiles').insert({
          user_id: owner,
          institution_name: input.institutionName.trim(),
          profile_type: 'bank_statement',
          column_mapping: input.columnMapping,
          date_format: input.dateFormat,
          decimal_separator: input.decimalSeparator,
          thousands_separator: input.thousandsSeparator,
          header_row_pattern: input.headerRowPattern,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: importKeys.profiles(userId) }),
  });
}
