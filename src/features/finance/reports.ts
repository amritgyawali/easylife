import type { IsoDate } from '@/utils/date';
import type { TransactionRow } from '@/features/finance/transactions-api';

/**
 * Reporting aggregations, kept pure so the money maths is unit-testable
 * without a database or a rendered chart.
 *
 * Two rules run through all of it:
 *   - Transfers are always excluded. Moving 10,000 from savings to cash is
 *     not income and not spending; counting it would double the month's
 *     apparent activity out of thin air.
 *   - Amounts are only ever combined within one currency. Without live
 *     exchange rates (Phase 4), a single blended total would be a confident
 *     number that means nothing.
 */

export interface PeriodRange {
  from: IsoDate;
  to: IsoDate;
  label: string;
}

/** The calendar month `date` falls in, as an inclusive range. */
export function monthRange(date: IsoDate): PeriodRange {
  const [year, month] = date.split('-').map(Number);
  const start = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  const end = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { from: start, to: end, label: monthLabel(year!, month!) };
}

/** The month `monthsBack` months before the month containing `date`. */
export function shiftMonth(date: IsoDate, monthsBack: number): IsoDate {
  const [year, month] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1 - monthsBack, 1));
  return shifted.toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function inRange(transaction: TransactionRow, range: PeriodRange): boolean {
  return transaction.transaction_date >= range.from && transaction.transaction_date <= range.to;
}

/** Income, expense and the difference for one currency over one range. */
export interface PeriodSummary {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  transactionCount: number;
}

export function summarise(transactions: TransactionRow[], range: PeriodRange): PeriodSummary[] {
  const byCurrency = new Map<string, PeriodSummary>();

  for (const transaction of transactions) {
    if (transaction.transaction_type === 'transfer') continue;
    if (!inRange(transaction, range)) continue;

    const summary = byCurrency.get(transaction.currency) ?? {
      currency: transaction.currency,
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      transactionCount: 0,
    };

    if (transaction.transaction_type === 'income') summary.incomeMinor += transaction.amount_minor;
    else summary.expenseMinor += transaction.amount_minor;

    summary.netMinor = summary.incomeMinor - summary.expenseMinor;
    summary.transactionCount += 1;
    byCurrency.set(transaction.currency, summary);
  }

  return [...byCurrency.values()];
}

export interface CategoryTotal {
  categoryId: string | null;
  currency: string;
  totalMinor: number;
  transactionCount: number;
  /** 0–1 share of the period's total for that currency. */
  share: number;
}

/**
 * Spending (or income) per category for one currency, largest first.
 *
 * Uncategorised transactions get a `null` id rather than being dropped —
 * hiding them would make the percentages add up to less than the money
 * actually spent, which is exactly the kind of quiet inaccuracy a finance
 * report must not have.
 */
export function totalsByCategory(
  transactions: TransactionRow[],
  range: PeriodRange,
  currency: string,
  kind: 'income' | 'expense'
): CategoryTotal[] {
  const totals = new Map<string | null, { totalMinor: number; transactionCount: number }>();
  let grandTotal = 0;

  for (const transaction of transactions) {
    if (transaction.transaction_type !== kind) continue;
    if (transaction.currency !== currency) continue;
    if (!inRange(transaction, range)) continue;

    const key = transaction.category_id;
    const current = totals.get(key) ?? { totalMinor: 0, transactionCount: 0 };
    current.totalMinor += transaction.amount_minor;
    current.transactionCount += 1;
    totals.set(key, current);
    grandTotal += transaction.amount_minor;
  }

  return [...totals.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      currency,
      totalMinor: value.totalMinor,
      transactionCount: value.transactionCount,
      share: grandTotal === 0 ? 0 : value.totalMinor / grandTotal,
    }))
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

/** Month-by-month income/expense for a trend view, oldest first. */
export function monthlyTrend(
  transactions: TransactionRow[],
  today: IsoDate,
  currency: string,
  months: number
): (PeriodSummary & { label: string })[] {
  return Array.from({ length: months }, (_, index) => {
    const range = monthRange(shiftMonth(today, months - 1 - index));
    const summary = summarise(transactions, range).find((row) => row.currency === currency);

    return {
      label: range.label,
      currency,
      incomeMinor: summary?.incomeMinor ?? 0,
      expenseMinor: summary?.expenseMinor ?? 0,
      netMinor: summary?.netMinor ?? 0,
      transactionCount: summary?.transactionCount ?? 0,
    };
  });
}
