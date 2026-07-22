import { isIsoDate, type IsoDate } from '@/utils/date';
import { minorUnitsFor } from '@/utils/money';

/**
 * Turning one raw cell of a bank export into a value the ledger can hold.
 *
 * Every function here reports failure as `null` rather than guessing. A
 * mis-parsed date or a decimal separator read the wrong way round would
 * produce a plausible-looking transaction that is silently wrong, which in a
 * finance app is far worse than an unparsed row the user is asked about.
 */

/** Column meanings an `import_profiles.column_mapping` can assign. */
export type ColumnRole =
  | 'transaction_date'
  | 'value_date'
  | 'description'
  | 'reference'
  | 'debit'
  | 'credit'
  | 'amount'
  | 'balance'
  | 'ignore';

export type ColumnMapping = Record<string, ColumnRole>;

/** Header names commonly seen in Nepali bank, wallet and cooperative exports. */
const HEADER_HINTS: { role: ColumnRole; patterns: string[] }[] = [
  { role: 'transaction_date', patterns: ['txn date', 'transaction date', 'date', 'miti'] },
  { role: 'value_date', patterns: ['value date', 'posting date', 'post date'] },
  { role: 'description', patterns: ['description', 'particulars', 'narration', 'details', 'remarks'] },
  { role: 'reference', patterns: ['reference', 'ref', 'cheque', 'voucher', 'transaction id', 'txn id'] },
  { role: 'debit', patterns: ['debit', 'withdrawal', 'dr', 'paid out', 'outflow'] },
  { role: 'credit', patterns: ['credit', 'deposit', 'cr', 'paid in', 'inflow'] },
  { role: 'amount', patterns: ['amount', 'value'] },
  { role: 'balance', patterns: ['balance', 'running balance', 'closing balance'] },
];

/**
 * Best-guess mapping from header names to column roles.
 *
 * Only a starting point: the review screen shows the guess and lets the user
 * correct it before anything is parsed, and the corrected mapping is what
 * gets saved as an `import_profiles` row for next time. Longest pattern wins
 * so "value date" isn't captured by the bare "date" rule.
 */
export function guessColumnMapping(header: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const taken = new Set<ColumnRole>();

  for (const column of header) {
    const name = column.toLowerCase().trim();
    if (name === '') continue;

    let bestRole: ColumnRole = 'ignore';
    let bestLength = 0;

    for (const hint of HEADER_HINTS) {
      // A role that can only appear once shouldn't be claimed twice.
      if (taken.has(hint.role) && hint.role !== 'ignore') continue;

      for (const pattern of hint.patterns) {
        if (name.includes(pattern) && pattern.length > bestLength) {
          bestRole = hint.role;
          bestLength = pattern.length;
        }
      }
    }

    mapping[column] = bestRole;
    if (bestRole !== 'ignore') taken.add(bestRole);
  }

  return mapping;
}

/** Date layouts seen in the wild, tried in the order most likely to be right. */
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MMM-YYYY';

const MONTH_ABBREVIATIONS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function buildIsoDate(year: number, month: number, day: number): IsoDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2200) return null;

  const candidate = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
  // Rejects impossible days like 31 February, which the range check above
  // lets through.
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== day) return null;

  return candidate;
}

/**
 * Parses a date cell into an ISO calendar date.
 *
 * When `format` is given (from the import profile) it is used as-is —
 * `03/04/2026` is genuinely ambiguous, and only the profile knows whether a
 * given bank means 3 April or 4 March. With no profile, unambiguous layouts
 * are detected and `DD/MM/YYYY` is assumed for the rest, which is the
 * convention in Nepal.
 */
export function parseDateCell(raw: string, format?: DateFormat | string | null): IsoDate | null {
  const value = raw.trim();
  if (value === '') return null;
  if (isIsoDate(value)) return value;

  // 12-Jul-2026 and similar.
  const named = /^(\d{1,2})[-\s/]([A-Za-z]{3,})[-\s/](\d{2,4})$/.exec(value);
  if (named) {
    const month = MONTH_ABBREVIATIONS[named[2]!.slice(0, 3).toLowerCase()];
    if (month) {
      const year = Number(named[3]);
      return buildIsoDate(year < 100 ? 2000 + year : year, month, Number(named[1]));
    }
  }

  const numeric = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/.exec(value);
  if (!numeric) return null;

  const [, first, second, third] = numeric;
  const a = Number(first);
  const b = Number(second);
  const c = Number(third);

  // A 4-digit leading group can only be a year.
  if (first!.length === 4) return buildIsoDate(a, b, c);

  const year = third!.length === 4 ? c : c < 100 ? 2000 + c : c;

  if (format === 'MM/DD/YYYY') return buildIsoDate(year, a, b);
  if (format === 'DD/MM/YYYY') return buildIsoDate(year, b, a);

  // No profile: a value above 12 in the first position can only be a day.
  if (a > 12) return buildIsoDate(year, b, a);
  if (b > 12) return buildIsoDate(year, a, b);

  // Genuinely ambiguous — day-first is the convention here.
  return buildIsoDate(year, b, a);
}

export interface AmountFormat {
  decimalSeparator?: string | null;
  thousandsSeparator?: string | null;
}

/**
 * Parses an amount cell into integer minor units.
 *
 * Handles the separators, currency symbols and accounting-style negatives
 * (`(1,234.00)`) that statement exports use, plus trailing `Dr`/`Cr` markers.
 * Returns null on anything it cannot read rather than falling back to zero —
 * a silent zero would post a transaction that balances but means nothing.
 */
export function parseAmountCell(raw: string, currency: string, format: AmountFormat = {}): number | null {
  let value = raw.trim();
  if (value === '') return null;

  let negative = false;

  // Accounting notation: parentheses mean negative.
  if (/^\(.*\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }

  // Trailing or leading Dr/Cr markers.
  const drCr = /(^|\s)(dr|cr)\b/i.exec(value);
  if (drCr) {
    if (drCr[2]!.toLowerCase() === 'dr') negative = true;
    value = value.replace(/(^|\s)(dr|cr)\b/i, '');
  }

  if (value.trim().startsWith('-')) {
    negative = true;
    value = value.replace('-', '');
  }

  // Strip currency symbols, codes and spaces, keeping only digits and separators.
  value = value.replace(/[^\d.,'\s-]/g, '').replace(/[\s']/g, '');

  const decimalSeparator = format.decimalSeparator || inferDecimalSeparator(value);
  const thousandsSeparator = format.thousandsSeparator || (decimalSeparator === ',' ? '.' : ',');

  if (thousandsSeparator) value = value.split(thousandsSeparator).join('');
  if (decimalSeparator !== '.') value = value.split(decimalSeparator).join('.');

  if (value === '' || value === '.') return null;
  if (!/^\d*\.?\d*$/.test(value)) return null;

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;

  const decimals = minorUnitsFor(currency);
  const minor = Math.round(asNumber * 10 ** decimals);

  return negative ? -minor : minor;
}

/**
 * Works out which separator is the decimal point when the profile is silent.
 *
 * The rightmost separator followed by exactly two digits is the decimal one;
 * a group of exactly three digits after a separator is a thousands group.
 */
function inferDecimalSeparator(value: string): string {
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma === -1) return '.';
  if (lastDot === -1) {
    // A single comma with a 3-digit tail is far more likely 1,234 than 1.234.
    return value.length - lastComma - 1 === 3 ? '.' : ',';
  }

  return lastComma > lastDot ? ',' : '.';
}

/**
 * Cleans a raw statement description for matching and display.
 *
 * Strips the transaction ids, terminal codes and filler words banks pad
 * descriptions with, so "POS PURCHASE 4512 BHATBHATENI SUPERMARKET
 * REF:998812" becomes something a fuzzy match can actually work with.
 */
const FILLER_WORDS = [
  'pos',
  'purchase',
  'payment',
  'transfer',
  'txn',
  'transaction',
  'ref',
  'reference',
  'atm',
  'withdrawal',
  'deposit',
  'charge',
  'chg',
  'nps',
  'ips',
  'connectips',
  'fonepay',
  'mobile',
  'banking',
  'inward',
  'outward',
];

export function normaliseDescription(raw: string): string {
  const withoutIds = raw
    .toLowerCase()
    // Long digit runs are ids, not names.
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/\bref[:\s-]*\w+/g, ' ')
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, ' ');

  const words = withoutIds.split(/\s+/).filter((word) => word.length > 1 && !FILLER_WORDS.includes(word));

  return words.join(' ').trim();
}
