import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import { toMinorUnits } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import type { Database, InterestType, LoanDirection } from '@/types/database';
import { getOrCreateSystemAccount } from '@/features/finance/accounts-api';
import { buildLedgerLegs, isBalanced } from '@/features/finance/ledger';
import type { LoanEventLike } from '@/features/loans/loan-math';

export type LoanRow = Database['public']['Tables']['loans']['Row'];
export type LoanEventRow = Database['public']['Tables']['loan_events']['Row'];

export const loanKeys = {
  all: (userId: string) => ['loans', userId] as const,
  list: (userId: string) => ['loans', userId, 'list'] as const,
  events: (userId: string) => ['loans', userId, 'events'] as const,
};

export function useLoans() {
  const userId = useUserId();

  return useQuery({
    queryKey: loanKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('loans')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('loan_date', { ascending: false })
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/**
 * Every loan event for the user in one query.
 *
 * Outstanding balances are derived from these client-side (see
 * `loan-math.ts`), and every screen that shows a loan needs its events, so
 * one cached fetch beats a per-loan round trip.
 */
export function useLoanEvents() {
  const userId = useUserId();

  return useQuery({
    queryKey: loanKeys.events(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('loan_events')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('event_date')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/** Loans with their events already bucketed, which is how every screen wants them. */
export function useLoansWithEvents() {
  const loansQuery = useLoans();
  const eventsQuery = useLoanEvents();

  const data = useMemo(() => {
    const byLoan = new Map<string, LoanEventRow[]>();
    for (const event of eventsQuery.data ?? []) {
      byLoan.set(event.loan_id, [...(byLoan.get(event.loan_id) ?? []), event]);
    }

    return (loansQuery.data ?? []).map((loan) => ({
      loan,
      events: (byLoan.get(loan.id) ?? []) as LoanEventLike[],
    }));
  }, [loansQuery.data, eventsQuery.data]);

  return {
    data,
    isLoading: loansQuery.isLoading || eventsQuery.isLoading,
    isRefetching: loansQuery.isRefetching || eventsQuery.isRefetching,
    error: loansQuery.error ?? eventsQuery.error,
    refetch: () => {
      void loansQuery.refetch();
      void eventsQuery.refetch();
    },
  };
}

export interface LoanInput {
  counterpartyId: string;
  direction: LoanDirection;
  /** Decimal major units as typed. */
  principal: string;
  currency: string;
  loanDate: IsoDate;
  dueDate?: IsoDate | null;
  interestType: InterestType;
  interestRatePercent?: number | null;
  interestPeriod?: 'monthly' | 'yearly' | null;
  notes?: string | null;
}

export function useCreateLoan() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoanInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const principalMinor = toMinorUnits(input.principal, input.currency);
      if (principalMinor <= 0) throw new AppError('validation_failed', 'Enter an amount greater than zero');

      // The table's own check constraint requires a rate whenever interest
      // is charged; catching it here gives a readable message instead of a
      // raw constraint violation.
      if (input.interestType !== 'none' && !input.interestRatePercent) {
        throw new AppError('validation_failed', 'Enter the interest rate, or set interest to none');
      }

      unwrapVoid(
        await supabase.from('loans').insert({
          user_id: owner,
          counterparty_id: input.counterpartyId,
          direction: input.direction,
          principal_minor: principalMinor,
          currency: input.currency,
          loan_date: input.loanDate,
          due_date: input.dueDate ?? null,
          interest_type: input.interestType,
          interest_rate_percent: input.interestType === 'none' ? null : input.interestRatePercent,
          interest_period: input.interestType === 'none' ? null : (input.interestPeriod ?? 'monthly'),
          internal_notes: input.notes?.trim() || null,
          status: 'active',
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loanKeys.all(userId) }),
  });
}

export function useUpdateLoanStatus() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LoanRow['status'] }) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('loans').update({ status }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loanKeys.all(userId) }),
  });
}

export function useDeleteLoan() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('loans').update({ deleted_at: new Date().toISOString() }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loanKeys.all(userId) }),
  });
}

export interface LoanEventInput {
  loanId: string;
  loanCurrency: string;
  eventType: 'repayment' | 'interest_accrual' | 'write_off' | 'note';
  /** Decimal major units; ignored for a `note`. */
  amount: string;
  eventDate: IsoDate;
  notes?: string | null;
  /**
   * When set, the repayment also posts a real transaction against this
   * account so the money movement shows up in the ledger, not just the loan.
   */
  accountId?: string | null;
  /** 'lent' means a repayment is money coming back *in*. */
  direction: LoanDirection;
}

/**
 * Records a loan event, optionally posting the matching cash movement.
 *
 * A repayment is two facts: the debt shrank, and money moved. Recording only
 * the first leaves the loan correct but the account balance wrong, so when an
 * account is chosen this writes a balanced ledger transaction too and links
 * it to the event via `financial_transaction_id`.
 */
export function useRecordLoanEvent() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoanEventInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const amountMinor =
        input.eventType === 'note' ? 0 : toMinorUnits(input.amount || '0', input.loanCurrency);

      if (input.eventType !== 'note' && amountMinor <= 0) {
        throw new AppError('validation_failed', 'Enter an amount greater than zero');
      }

      let transactionId: string | null = null;

      if (input.accountId && input.eventType === 'repayment') {
        // Getting money back from someone you lent to is income to the
        // account; repaying something you borrowed is money leaving it.
        const kind = input.direction === 'lent' ? 'income' : 'expense';
        const systemAccountId = await getOrCreateSystemAccount(owner, input.loanCurrency);

        const legs = buildLedgerLegs({
          kind,
          amountMinor,
          currency: input.loanCurrency,
          accountId: input.accountId,
          systemAccountId,
        });

        if (!isBalanced(legs)) {
          throw new AppError('validation_failed', 'Ledger entries for this repayment do not balance');
        }

        transactionId = randomUUID();

        unwrapVoid(
          await supabase.from('financial_transactions').insert({
            id: transactionId,
            user_id: owner,
            transaction_type: input.direction === 'lent' ? 'repayment_received' : 'repayment_paid',
            transaction_date: input.eventDate,
            amount_minor: amountMinor,
            currency: input.loanCurrency,
            account_id: input.accountId,
            loan_id: input.loanId,
            description: input.notes?.trim() || 'Loan repayment',
            status: 'confirmed',
          })
        );

        const entriesResult = await supabase.from('ledger_entries').insert(
          legs.map((leg) => ({
            user_id: owner,
            transaction_id: transactionId!,
            account_id: leg.accountId,
            amount_minor: leg.amountMinor,
            currency: leg.currency,
            amount_transaction_currency_minor: leg.amountTransactionCurrencyMinor,
          }))
        );

        if (entriesResult.error) {
          // Roll the header back by hand — PostgREST gives us no transaction.
          await supabase.from('financial_transactions').delete().eq('id', transactionId);
          throw new AppError('validation_failed', entriesResult.error.message, entriesResult.error);
        }
      }

      const eventResult = await supabase.from('loan_events').insert({
        user_id: owner,
        loan_id: input.loanId,
        event_type: input.eventType,
        amount_minor: amountMinor,
        event_date: input.eventDate,
        financial_transaction_id: transactionId,
        notes: input.notes?.trim() || null,
      });

      if (eventResult.error) {
        // Undo the cash movement too, so the ledger can't end up recording a
        // repayment the loan never heard about.
        if (transactionId) {
          await supabase.from('ledger_entries').delete().eq('transaction_id', transactionId);
          await supabase.from('financial_transactions').delete().eq('id', transactionId);
        }
        throw new AppError('validation_failed', eventResult.error.message, eventResult.error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loanKeys.all(userId) });
      void queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
      void queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
    },
  });
}
