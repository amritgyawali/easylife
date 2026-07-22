import type { ConfidenceLevel } from '@/types/database';
import type { IsoDate } from '@/utils/date';
import type { DelimitedTable } from '@/features/imports/delimited';
import {
  normaliseDescription,
  parseAmountCell,
  parseDateCell,
  type AmountFormat,
  type ColumnMapping,
  type ColumnRole,
  type DateFormat,
} from '@/features/imports/normalise';

/**
 * Turning a parsed table into candidate transactions.
 *
 * Every row carries per-field and per-row confidence, because the review
 * queue's whole job is to direct attention at the rows that need it. Nothing
 * here writes to `financial_transactions` — that only ever happens as a
 * result of the user confirming a row (see `imports/api.ts`).
 */

export interface ParseOptions {
  mapping: ColumnMapping;
  currency: string;
  dateFormat?: DateFormat | string | null;
  amountFormat?: AmountFormat;
}

export interface ParsedRow {
  rowNumber: number;
  transactionDate: IsoDate | null;
  valueDate: IsoDate | null;
  rawDescription: string | null;
  normalizedDescription: string | null;
  reference: string | null;
  debitMinor: number | null;
  creditMinor: number | null;
  /** Positive for money in, negative for money out. */
  signedAmountMinor: number | null;
  runningBalanceMinor: number | null;
  fieldConfidence: Record<string, ConfidenceLevel>;
  rowConfidence: ConfidenceLevel;
  /** Human-readable reasons the row needs attention. */
  issues: string[];
}

function cellFor(row: string[], header: string[], mapping: ColumnMapping, role: ColumnRole): string | null {
  const index = header.findIndex((column) => mapping[column] === role);
  if (index === -1) return null;
  return row[index] ?? null;
}

/**
 * Reads one row into a candidate transaction.
 *
 * The debit/credit direction is the part most worth getting right: a
 * statement may use two columns, or one signed column, and reading a debit as
 * a credit turns spending into income. Where the layout can't decide, the row
 * is flagged rather than guessed.
 */
export function parseRow(
  row: string[],
  header: string[],
  rowNumber: number,
  options: ParseOptions
): ParsedRow {
  const { mapping, currency, dateFormat, amountFormat = {} } = options;

  const rawDate = cellFor(row, header, mapping, 'transaction_date');
  const rawValueDate = cellFor(row, header, mapping, 'value_date');
  const rawDescription = cellFor(row, header, mapping, 'description');
  const rawReference = cellFor(row, header, mapping, 'reference');
  const rawDebit = cellFor(row, header, mapping, 'debit');
  const rawCredit = cellFor(row, header, mapping, 'credit');
  const rawAmount = cellFor(row, header, mapping, 'amount');
  const rawBalance = cellFor(row, header, mapping, 'balance');

  const fieldConfidence: Record<string, ConfidenceLevel> = {};
  const issues: string[] = [];

  const transactionDate = rawDate ? parseDateCell(rawDate, dateFormat) : null;
  if (!rawDate) {
    fieldConfidence.transaction_date = 'missing';
    issues.push('No date column mapped');
  } else if (!transactionDate) {
    fieldConfidence.transaction_date = 'low';
    issues.push(`Could not read the date "${rawDate}"`);
  } else {
    // An unambiguous layout is trustworthy; a bare dd/mm that could be either
    // is only as good as the profile that interpreted it.
    fieldConfidence.transaction_date = dateFormat || /^\d{4}-/.test(rawDate.trim()) ? 'high' : 'medium';
  }

  const debitMinor = rawDebit ? parseAmountCell(rawDebit, currency, amountFormat) : null;
  const creditMinor = rawCredit ? parseAmountCell(rawCredit, currency, amountFormat) : null;
  const amountMinor = rawAmount ? parseAmountCell(rawAmount, currency, amountFormat) : null;

  let signedAmountMinor: number | null = null;

  if (debitMinor !== null && creditMinor !== null && debitMinor !== 0 && creditMinor !== 0) {
    // Both populated is a layout the parser has misread, not a real row.
    fieldConfidence.amount = 'low';
    issues.push('Both debit and credit have a value on this row');
    signedAmountMinor = creditMinor - Math.abs(debitMinor);
  } else if (creditMinor !== null && creditMinor !== 0) {
    signedAmountMinor = Math.abs(creditMinor);
    fieldConfidence.amount = 'high';
  } else if (debitMinor !== null && debitMinor !== 0) {
    signedAmountMinor = -Math.abs(debitMinor);
    fieldConfidence.amount = 'high';
  } else if (amountMinor !== null && amountMinor !== 0) {
    // A single signed column: the sign carries the direction.
    signedAmountMinor = amountMinor;
    fieldConfidence.amount = 'high';
  } else {
    fieldConfidence.amount = 'missing';
    issues.push('No amount could be read');
  }

  if (signedAmountMinor !== null && Math.abs(signedAmountMinor) > 100_000_000_00) {
    fieldConfidence.amount = 'low';
    issues.push('Amount looks suspiciously large');
  }

  const runningBalanceMinor = rawBalance ? parseAmountCell(rawBalance, currency, amountFormat) : null;

  const description = rawDescription?.trim() || null;
  if (!description) {
    fieldConfidence.description = 'missing';
  } else {
    fieldConfidence.description = 'high';
  }

  return {
    rowNumber,
    transactionDate,
    valueDate: rawValueDate ? parseDateCell(rawValueDate, dateFormat) : null,
    rawDescription: description,
    normalizedDescription: description ? normaliseDescription(description) : null,
    reference: rawReference?.trim() || null,
    debitMinor: debitMinor === null ? null : Math.abs(debitMinor),
    creditMinor: creditMinor === null ? null : Math.abs(creditMinor),
    signedAmountMinor,
    runningBalanceMinor,
    fieldConfidence,
    rowConfidence: worstConfidence(fieldConfidence),
    issues,
  };
}

const CONFIDENCE_ORDER: ConfidenceLevel[] = ['high', 'medium', 'low', 'missing'];

/**
 * A row is only as trustworthy as its weakest field — averaging would let a
 * confidently-read description hide an unreadable amount.
 */
export function worstConfidence(fields: Record<string, ConfidenceLevel>): ConfidenceLevel {
  return Object.values(fields).reduce<ConfidenceLevel>(
    (worst, level) => (CONFIDENCE_ORDER.indexOf(level) > CONFIDENCE_ORDER.indexOf(worst) ? level : worst),
    'high'
  );
}

export interface ParsedStatement {
  rows: ParsedRow[];
  /** Rows the parser could not make a transaction of at all. */
  unparsedCount: number;
  /** Earliest and latest dates seen, for the statement period. */
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
}

export function parseStatement(table: DelimitedTable, options: ParseOptions): ParsedStatement {
  const rows = table.rows.map((row, index) => parseRow(row, table.header, index + 1, options));

  const dates = rows
    .map((row) => row.transactionDate)
    .filter((date): date is IsoDate => date !== null)
    .sort();

  return {
    rows,
    unparsedCount: rows.filter((row) => row.signedAmountMinor === null || !row.transactionDate).length,
    periodStart: dates[0] ?? null,
    periodEnd: dates[dates.length - 1] ?? null,
  };
}
