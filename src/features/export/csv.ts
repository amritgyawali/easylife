import { fromMinorUnits } from '@/utils/money';
import type { TransactionRow } from '@/features/finance/transactions-api';

/**
 * CSV serialisation, kept pure so the escaping rules are unit-testable
 * without a file system or a browser download.
 *
 * The one job that actually matters here is escaping: a description like
 * `Coffee, tea, "special"` or an address with a newline must survive a
 * round-trip through Excel/Numbers/LibreOffice unchanged. The rules below
 * are RFC 4180 — quote any field containing a comma, quote, CR or LF, and
 * double every embedded quote — which all three of those programs read
 * correctly. Line endings are CRLF for the same reason.
 */

const FIELD_SEPARATOR = ',';
const ROW_SEPARATOR = '\r\n';

export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvCell;
}

/** Escapes a single cell per RFC 4180. */
export function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '';
  const text = typeof cell === 'string' ? cell : String(cell);

  const needsQuoting =
    text.includes(FIELD_SEPARATOR) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    // A leading `=`/`+`/`-`/`@` is how a spreadsheet detects a formula; quoting
    // it keeps an imported description from being executed as one (CSV injection).
    /^[=+\-@]/.test(text);

  if (!needsQuoting) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Builds a full CSV document (header row + data rows) from typed columns. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const headerLine = columns.map((column) => escapeCsvCell(column.header)).join(FIELD_SEPARATOR);
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(FIELD_SEPARATOR)
  );
  // A trailing newline after the final row is what most tools expect; without
  // it some importers silently drop the last line.
  return [headerLine, ...dataLines].join(ROW_SEPARATOR) + ROW_SEPARATOR;
}

/**
 * Transactions in the human-friendly shape someone would actually want in a
 * spreadsheet: dates and decimal amounts, not minor-unit integers or foreign
 * keys. Amounts stay as a plain decimal string (no currency symbol, no
 * grouping) so the column is numeric in a spreadsheet; the currency is its
 * own column.
 */
export interface TransactionCsvLookups {
  accountName?: (id: string | null) => string | null;
  categoryName?: (id: string | null) => string | null;
  counterpartyName?: (id: string | null) => string | null;
}

export function transactionsToCsv(
  transactions: readonly TransactionRow[],
  lookups: TransactionCsvLookups = {}
): string {
  const columns: CsvColumn<TransactionRow>[] = [
    { header: 'Date', value: (t) => t.transaction_date },
    { header: 'Type', value: (t) => t.transaction_type },
    { header: 'Amount', value: (t) => fromMinorUnits(t.amount_minor, t.currency) },
    { header: 'Currency', value: (t) => t.currency },
    { header: 'Account', value: (t) => lookups.accountName?.(t.account_id) ?? t.account_id },
    {
      header: 'Category',
      value: (t) => lookups.categoryName?.(t.category_id) ?? t.category_id ?? '',
    },
    {
      header: 'Counterparty',
      value: (t) => lookups.counterpartyName?.(t.counterparty_id) ?? t.counterparty_id ?? '',
    },
    { header: 'Description', value: (t) => t.description ?? '' },
    { header: 'Reference', value: (t) => t.reference ?? '' },
    { header: 'Notes', value: (t) => t.notes ?? '' },
    { header: 'Status', value: (t) => t.status },
    { header: 'Imported', value: (t) => (t.is_imported ? 'yes' : 'no') },
  ];

  return toCsv(transactions, columns);
}
