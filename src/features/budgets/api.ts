import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import { toMinorUnits } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import type { BudgetPeriod } from '@/types/database';
import { useTransactions, type TransactionRow } from '@/features/finance/transactions-api';
import {
  budgetItemProgress,
  budgetPeriodRange,
  budgetTotals,
  type BudgetItemRow,
  type BudgetRow,
} from '@/features/budgets/progress';

export type { BudgetItemRow, BudgetRow } from '@/features/budgets/progress';

export const budgetKeys = {
  all: (userId: string) => ['budgets', userId] as const,
  list: (userId: string) => ['budgets', userId, 'list'] as const,
  items: (userId: string) => ['budgets', userId, 'items'] as const,
};

export function useBudgets() {
  const userId = useUserId();

  return useQuery({
    queryKey: budgetKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('period_start', { ascending: false })
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export function useBudgetItems() {
  const userId = useUserId();

  return useQuery({
    queryKey: budgetKeys.items(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(await supabase.from('budget_items').select('*').eq('user_id', userId));
    },
    enabled: userId !== 'anonymous',
  });
}

/** Every budget with its line items and how much of each has actually been spent. */
export function useBudgetsWithProgress() {
  const budgetsQuery = useBudgets();
  const itemsQuery = useBudgetItems();
  const transactionsQuery = useTransactions();

  const data = useMemo(() => {
    const itemsByBudget = new Map<string, BudgetItemRow[]>();
    for (const item of itemsQuery.data ?? []) {
      itemsByBudget.set(item.budget_id, [...(itemsByBudget.get(item.budget_id) ?? []), item]);
    }

    return (budgetsQuery.data ?? []).map((budget) => {
      const items = itemsByBudget.get(budget.id) ?? [];
      const itemProgress = budgetItemProgress(items, transactionsQuery.data ?? [], budget);
      return { budget, itemProgress, totals: budgetTotals(itemProgress) };
    });
  }, [budgetsQuery.data, itemsQuery.data, transactionsQuery.data]);

  return {
    data,
    isLoading: budgetsQuery.isLoading || itemsQuery.isLoading || transactionsQuery.isLoading,
    isRefetching: budgetsQuery.isRefetching || itemsQuery.isRefetching || transactionsQuery.isRefetching,
    error: budgetsQuery.error ?? itemsQuery.error ?? transactionsQuery.error,
    refetch: () => {
      void budgetsQuery.refetch();
      void itemsQuery.refetch();
      void transactionsQuery.refetch();
    },
  };
}

export interface BudgetInput {
  name: string;
  period: BudgetPeriod;
  periodStart: IsoDate;
  currency: string;
  rolloverEnabled: boolean;
  /** Copies line items (and, if rollover is on, unspent amounts) from a prior budget. */
  copyFromBudgetId?: string | null;
}

export function useCreateBudget() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BudgetInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const insert = await supabase
        .from('budgets')
        .insert({
          user_id: owner,
          name: input.name.trim(),
          period: input.period,
          period_start: input.periodStart,
          currency: input.currency,
          rollover_enabled: input.rolloverEnabled,
        })
        .select('*')
        .single();

      if (insert.error) {
        // unique (user_id, period, period_start) — a second budget for the
        // same month/year is a duplicate, not a new plan.
        if (insert.error.code === '23505') {
          throw new AppError('validation_failed', 'A budget for this period already exists.');
        }
        throw new AppError('unknown', insert.error.message, insert.error);
      }

      const budget = insert.data as BudgetRow;

      if (input.copyFromBudgetId) {
        await copyBudgetItems(supabase, owner, input.copyFromBudgetId, budget);
      }

      return budget;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
  });
}

/**
 * Best-effort: the new budget already exists by the time this runs, so a
 * failure here shouldn't surface as the create having failed — it just means
 * the user adds their categories fresh instead of starting from last period.
 */
async function copyBudgetItems(
  supabase: ReturnType<typeof getSupabaseClient>,
  owner: string,
  sourceBudgetId: string,
  newBudget: BudgetRow
): Promise<void> {
  const [sourceBudgetResult, sourceItemsResult] = await Promise.all([
    supabase.from('budgets').select('*').eq('id', sourceBudgetId).single(),
    supabase.from('budget_items').select('*').eq('budget_id', sourceBudgetId),
  ]);

  const sourceItems = sourceItemsResult.data as BudgetItemRow[] | null;
  if (sourceBudgetResult.error || sourceItemsResult.error || !sourceItems?.length) return;

  const sourceBudget = sourceBudgetResult.data as BudgetRow;
  const range = budgetPeriodRange(sourceBudget);

  const transactionsResult = await supabase
    .from('financial_transactions')
    .select('*')
    .eq('user_id', owner)
    .is('deleted_at', null)
    .gte('transaction_date', range.from)
    .lte('transaction_date', range.to);

  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const progress = budgetItemProgress(sourceItems, transactions, sourceBudget);

  await supabase.from('budget_items').insert(
    progress.map(({ item, remainingMinor }) => ({
      user_id: owner,
      budget_id: newBudget.id,
      category_id: item.category_id,
      planned_amount_minor: item.planned_amount_minor,
      carried_over_minor: newBudget.rollover_enabled ? Math.max(0, remainingMinor) : 0,
    }))
  );
}

export function useDeleteBudget() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase.from('budgets').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
  });
}

export interface BudgetItemInput {
  budgetId: string;
  categoryId: string;
  plannedAmount: string;
  currency: string;
}

/** Adds a category to a budget, or updates its planned amount if it's already on there. */
export function useSaveBudgetItem() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BudgetItemInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const plannedMinor = toMinorUnits(input.plannedAmount, input.currency);
      if (plannedMinor < 0) throw new AppError('validation_failed', 'Enter an amount of zero or more.');

      unwrapVoid(
        await supabase.from('budget_items').upsert(
          {
            user_id: owner,
            budget_id: input.budgetId,
            category_id: input.categoryId,
            planned_amount_minor: plannedMinor,
          },
          { onConflict: 'budget_id,category_id' }
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
  });
}

export function useDeleteBudgetItem() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('budget_items').delete().eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all(userId) }),
  });
}
