import type { ParsedRow } from '@/features/imports/parse-statement';

/**
 * Statement-level validation.
 *
 * The point of reconciliation is to catch rows the parser missed or misread
 * *before* anything is written to the ledger. If opening + credits − debits
 * doesn't reach the closing balance, something is wrong with the extraction,
 * and the exact difference is far more useful to the user than a vague
 * warning — it often names the missing transaction outright.
 */

export type ReconciliationStatus = 'pending' | 'balanced' | 'mismatch';

export interface ReconciliationResult {
  status: ReconciliationStatus;
  /** Signed: expected closing minus computed closing. Null when unknowable. */
  differenceMinor: number | null;
  computedClosingMinor: number | null;
  totalCreditsMinor: number;
  totalDebitsMinor: number;
}

export function totals(rows: ParsedRow[]): { credits: number; debits: number } {
  let credits = 0;
  let debits = 0;

  for (const row of rows) {
    if (row.signedAmountMinor === null) continue;
    if (row.signedAmountMinor > 0) credits += row.signedAmountMinor;
    else debits += -row.signedAmountMinor;
  }

  return { credits, debits };
}

/**
 * Checks the extracted rows against the statement's own stated balances.
 *
 * Returns `pending` rather than `balanced` when either balance is missing —
 * claiming a statement reconciles when there was nothing to reconcile against
 * would be a false assurance.
 */
export function reconcile(
  rows: ParsedRow[],
  openingBalanceMinor: number | null,
  closingBalanceMinor: number | null
): ReconciliationResult {
  const { credits, debits } = totals(rows);

  if (openingBalanceMinor === null || closingBalanceMinor === null) {
    return {
      status: 'pending',
      differenceMinor: null,
      computedClosingMinor: null,
      totalCreditsMinor: credits,
      totalDebitsMinor: debits,
    };
  }

  const computedClosingMinor = openingBalanceMinor + credits - debits;
  const differenceMinor = closingBalanceMinor - computedClosingMinor;

  return {
    status: differenceMinor === 0 ? 'balanced' : 'mismatch',
    differenceMinor,
    computedClosingMinor,
    totalCreditsMinor: credits,
    totalDebitsMinor: debits,
  };
}

export interface BalanceContinuityBreak {
  rowNumber: number;
  expectedMinor: number;
  actualMinor: number;
  differenceMinor: number;
}

/**
 * Finds rows where the running balance doesn't follow from the previous one.
 *
 * This catches a missed or duplicated row precisely, which the statement-level
 * check can only detect in aggregate: a break at row 14 says the problem is
 * at row 14, not somewhere in 200 rows.
 */
export function findContinuityBreaks(rows: ParsedRow[]): BalanceContinuityBreak[] {
  const breaks: BalanceContinuityBreak[] = [];

  let previousBalance: number | null = null;

  for (const row of rows) {
    if (row.runningBalanceMinor === null || row.signedAmountMinor === null) {
      // A gap in the data breaks the chain; resume from the next known balance
      // rather than reporting every subsequent row as broken.
      previousBalance = row.runningBalanceMinor;
      continue;
    }

    if (previousBalance !== null) {
      const expected = previousBalance + row.signedAmountMinor;
      if (expected !== row.runningBalanceMinor) {
        breaks.push({
          rowNumber: row.rowNumber,
          expectedMinor: expected,
          actualMinor: row.runningBalanceMinor,
          differenceMinor: row.runningBalanceMinor - expected,
        });
      }
    }

    previousBalance = row.runningBalanceMinor;
  }

  return breaks;
}

export interface OutOfPeriodRow {
  rowNumber: number;
  date: string;
}

/** Rows dated outside the statement period, which usually means a parse error. */
export function findOutOfPeriodRows(
  rows: ParsedRow[],
  periodStart: string | null,
  periodEnd: string | null
): OutOfPeriodRow[] {
  if (!periodStart || !periodEnd) return [];

  return rows
    .filter(
      (row) => row.transactionDate && (row.transactionDate < periodStart || row.transactionDate > periodEnd)
    )
    .map((row) => ({ rowNumber: row.rowNumber, date: row.transactionDate! }));
}
