import { monthRange, totalsByCategory, type PeriodRange } from '@/features/finance/reports';
import type { TransactionRow } from '@/features/finance/transactions-api';
import type { Database } from '@/types/database';

export type BudgetRow = Database['public']['Tables']['budgets']['Row'];
export type BudgetItemRow = Database['public']['Tables']['budget_items']['Row'];

/**
 * Budget vs. actual, kept pure like `reports.ts` so the maths is
 * unit-testable without a database.
 */

/** The calendar range one budget period covers. */
export function budgetPeriodRange(budget: Pick<BudgetRow, 'period' | 'period_start'>): PeriodRange {
  if (budget.period === 'yearly') {
    const year = budget.period_start.slice(0, 4);
    return { from: `${year}-01-01`, to: `${year}-12-31`, label: year };
  }
  return monthRange(budget.period_start);
}

export interface BudgetItemProgress {
  item: BudgetItemRow;
  /** Planned amount plus anything carried over from a prior period. */
  availableMinor: number;
  spentMinor: number;
  remainingMinor: number;
  /** 0–1+ share of the available amount spent; not clamped, so over-budget shows as > 1. */
  progress: number;
}

/** Per-category planned-vs-spent for one budget, largest overspend first is left to the caller. */
export function budgetItemProgress(
  items: BudgetItemRow[],
  transactions: TransactionRow[],
  budget: BudgetRow
): BudgetItemProgress[] {
  const range = budgetPeriodRange(budget);
  const spendByCategory = new Map(
    totalsByCategory(transactions, range, budget.currency, 'expense').map((total) => [
      total.categoryId,
      total.totalMinor,
    ])
  );

  return items.map((item) => {
    const availableMinor = item.planned_amount_minor + item.carried_over_minor;
    const spentMinor = spendByCategory.get(item.category_id) ?? 0;

    return {
      item,
      availableMinor,
      spentMinor,
      remainingMinor: availableMinor - spentMinor,
      progress: availableMinor > 0 ? spentMinor / availableMinor : spentMinor > 0 ? Infinity : 0,
    };
  });
}

export interface BudgetTotals {
  plannedMinor: number;
  spentMinor: number;
  remainingMinor: number;
}

export function budgetTotals(itemProgress: BudgetItemProgress[]): BudgetTotals {
  return itemProgress.reduce(
    (totals, entry) => ({
      plannedMinor: totals.plannedMinor + entry.availableMinor,
      spentMinor: totals.spentMinor + entry.spentMinor,
      remainingMinor: totals.remainingMinor + entry.remainingMinor,
    }),
    { plannedMinor: 0, spentMinor: 0, remainingMinor: 0 }
  );
}

/**
 * Next period's carry-over for one item, when the budget has rollover
 * enabled: unspent money (never a deficit) rolls forward automatically.
 */
export function nextCarryOverMinor(progress: BudgetItemProgress, rolloverEnabled: boolean): number {
  if (!rolloverEnabled) return 0;
  return Math.max(0, progress.remainingMinor);
}
