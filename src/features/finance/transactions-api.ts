import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import { toMinorUnits } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import type { Database, TransactionType } from '@/types/database';
import { getOrCreateSystemAccount, type AccountRow } from '@/features/finance/accounts-api';
import { convertMinorUnits } from '@/features/finance/currency';
import {
  buildLedgerLegs,
  isBalanced,
  TRANSACTION_TYPE_FOR_KIND,
  type LedgerTransactionKind,
} from '@/features/finance/ledger';

export type TransactionRow = Database['public']['Tables']['financial_transactions']['Row'];
export type LedgerEntryRow = Database['public']['Tables']['ledger_entries']['Row'];

export const transactionKeys = {
  all: (userId: string) => ['transactions', userId] as const,
  list: (userId: string) => ['transactions', userId, 'list'] as const,
  entries: (userId: string) => ['transactions', userId, 'entries'] as const,
};

/** Most recent transactions loaded for the list, reports and balances. */
const TRANSACTION_LIMIT = 500;

export function useTransactions() {
  const userId = useUserId();

  return useQuery({
    queryKey: transactionKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('financial_transactions')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(TRANSACTION_LIMIT)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/**
 * Every ledger entry for the user, used to derive account balances.
 *
 * `account_balance_snapshots` exists as a cache but has no client-facing
 * write policy (see DATABASE.md), so the app computes balances from the
 * entries themselves rather than reading a cache it can never refresh.
 */
export function useLedgerEntries() {
  const userId = useUserId();

  return useQuery({
    queryKey: transactionKeys.entries(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('ledger_entries')
          .select('id,transaction_id,account_id,amount_minor,currency')
          .eq('user_id', userId)
      ) as unknown as Pick<
        LedgerEntryRow,
        'id' | 'transaction_id' | 'account_id' | 'amount_minor' | 'currency'
      >[];
    },
    enabled: userId !== 'anonymous',
  });
}

export interface TransactionInput {
  kind: LedgerTransactionKind;
  /** Decimal major units as typed, e.g. "1250.50". */
  amount: string;
  date: IsoDate;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  counterpartyId?: string | null;
  description?: string | null;
  notes?: string | null;
  /**
   * Units of the destination currency per one unit of the source currency.
   * Required only for a transfer whose two accounts use different
   * currencies; ignored otherwise.
   */
  exchangeRate?: number | null;
  /** Set when the transaction is created by the loans or investments module. */
  loanId?: string | null;
  transactionType?: TransactionType;
}

/**
 * Posts a transaction and its balanced ledger entries.
 *
 * Written as header-then-entries rather than one atomic call because
 * PostgREST has no multi-statement transaction: if the entry insert fails,
 * the header is rolled back by hand below, so a half-posted transaction
 * never survives. The database's own deferred balance trigger is the final
 * word — `isBalanced` here is a fast local check that produces a readable
 * error instead of a raw constraint violation.
 */
export function useCreateTransaction() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, accounts }: { input: TransactionInput; accounts: AccountRow[] }) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const account = accounts.find((row) => row.id === input.accountId);
      if (!account) throw new AppError('validation_failed', 'Choose an account');

      // The source account's currency is the transaction's accounting
      // currency, and the currency the zero-sum invariant is checked in.
      const currency = account.currency;

      const amountMinor = toMinorUnits(input.amount, currency);
      if (amountMinor <= 0) throw new AppError('validation_failed', 'Enter an amount greater than zero');

      let destinationCurrency: string | null = null;
      let destinationAmountMinor: number | null = null;
      let exchangeRate: number | null = null;

      if (input.kind === 'transfer') {
        const destination = accounts.find((row) => row.id === input.destinationAccountId);
        if (!destination) throw new AppError('validation_failed', 'Choose an account to transfer into');

        destinationCurrency = destination.currency;

        if (destination.currency === currency) {
          destinationAmountMinor = amountMinor;
        } else {
          // Crossing currencies is only unambiguous with a rate: the two
          // accounts must each move by an amount in their own currency, and
          // nothing else in the data says how those two amounts relate.
          if (!input.exchangeRate || input.exchangeRate <= 0) {
            throw new AppError(
              'validation_failed',
              'Enter the exchange rate to transfer between different currencies'
            );
          }
          exchangeRate = input.exchangeRate;
          destinationAmountMinor = convertMinorUnits(
            amountMinor,
            currency,
            destination.currency,
            input.exchangeRate
          );
        }
      }

      // A transfer is real-account to real-account, so it needs no clearing leg.
      const systemAccountId =
        input.kind === 'transfer' ? null : await getOrCreateSystemAccount(owner, currency);

      const legs = buildLedgerLegs({
        kind: input.kind,
        amountMinor,
        currency,
        accountId: input.accountId,
        destinationAccountId: input.destinationAccountId,
        destinationCurrency,
        destinationAmountMinor,
        systemAccountId,
      });

      if (!isBalanced(legs)) {
        throw new AppError('validation_failed', 'Ledger entries for this transaction do not balance');
      }

      // Generated here rather than read back from the insert, so the entries
      // below can reference it without a second round-trip. Client-generated
      // UUIDs are also what the offline engine will need (OFFLINE_SYNC.md).
      const transactionId = randomUUID();

      unwrapVoid(
        await supabase.from('financial_transactions').insert({
          id: transactionId,
          user_id: owner,
          transaction_type: input.transactionType ?? TRANSACTION_TYPE_FOR_KIND[input.kind],
          transaction_date: input.date,
          amount_minor: amountMinor,
          currency,
          exchange_rate: exchangeRate,
          account_id: input.accountId,
          destination_account_id: input.kind === 'transfer' ? input.destinationAccountId : null,
          category_id: input.categoryId ?? null,
          counterparty_id: input.counterpartyId ?? null,
          loan_id: input.loanId ?? null,
          description: input.description?.trim() || null,
          notes: input.notes?.trim() || null,
          status: 'confirmed',
        })
      );

      const entriesResult = await supabase.from('ledger_entries').insert(
        legs.map((leg) => ({
          user_id: owner,
          transaction_id: transactionId,
          account_id: leg.accountId,
          // Native to the account, so balances stay in the account's own
          // currency; the accounting-currency column is what must balance.
          amount_minor: leg.amountMinor,
          currency: leg.currency,
          amount_transaction_currency_minor: leg.amountTransactionCurrencyMinor,
        }))
      );

      if (entriesResult.error) {
        // Undo the header so the ledger never holds a transaction with no
        // entries, which would read as a real transaction worth nothing.
        await supabase.from('financial_transactions').delete().eq('id', transactionId);
        throw new AppError('validation_failed', entriesResult.error.message, entriesResult.error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) });
      void queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
    },
  });
}

/**
 * Soft-deletes a transaction and hard-deletes its entries.
 *
 * The entries have to go: `recompute_account_balance` filters on
 * `deleted_at is null` on the header, but the app derives balances from the
 * entries directly, and leaving them would keep a deleted transaction
 * affecting every balance.
 */
export function useDeleteTransaction() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('financial_transactions')
          .update({ deleted_at: new Date().toISOString(), status: 'void' })
          .eq('id', id)
      );
      unwrapVoid(await supabase.from('ledger_entries').delete().eq('transaction_id', id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) });
      void queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
    },
  });
}
