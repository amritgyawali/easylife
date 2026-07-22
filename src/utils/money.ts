import { CURRENCY_MINOR_UNITS } from '@/constants/app';

/**
 * All monetary amounts in this application are integer minor units (e.g.
 * paisa for NPR), never floating point. This module is the single place
 * that converts between a human-entered decimal string/number and the
 * integer minor-unit representation stored in the database, and back again
 * for display. See DATABASE.md "Money as integers" for the rationale.
 */

export function minorUnitsFor(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/**
 * Converts a decimal major-unit amount (e.g. 1250.5) into integer minor
 * units (e.g. 125050 for a 2-decimal currency). Accepts a string to avoid
 * floating point round-trip errors from caller-side arithmetic.
 */
export function toMinorUnits(amount: string | number, currency: string): number {
  const decimals = minorUnitsFor(currency);
  const str = typeof amount === 'number' ? amount.toString() : amount.trim();

  if (str === '' || Number.isNaN(Number(str))) {
    throw new RangeError(`Invalid monetary amount: "${amount}"`);
  }

  const negative = str.startsWith('-');
  const unsigned = negative ? str.slice(1) : str;
  const [wholePart = '0', fractionPartRaw = ''] = unsigned.split('.');

  if (fractionPartRaw.length > decimals) {
    throw new RangeError(
      `Amount "${amount}" has more than ${decimals} decimal places for currency ${currency}`
    );
  }

  const fractionPart = fractionPartRaw.padEnd(decimals, '0');
  const wholeDigits = wholePart === '' ? '0' : wholePart;
  const minorUnits = BigInt(wholeDigits) * 10n ** BigInt(decimals) + BigInt(fractionPart || '0');

  const signed = negative ? -minorUnits : minorUnits;

  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`Amount "${amount}" exceeds safe integer range`);
  }

  return Number(signed);
}

/** Converts integer minor units back into a decimal major-unit string, e.g. 125050 -> "1250.50". */
export function fromMinorUnits(minorUnits: number, currency: string): string {
  const decimals = minorUnitsFor(currency);
  const negative = minorUnits < 0;
  const abs = Math.abs(minorUnits)
    .toString()
    .padStart(decimals + 1, '0');
  const whole = abs.slice(0, abs.length - decimals) || '0';
  const fraction = decimals > 0 ? abs.slice(abs.length - decimals) : '';
  const value = decimals > 0 ? `${whole}.${fraction}` : whole;
  return negative ? `-${value}` : value;
}

/**
 * South Asian ("lakh/crore") digit grouping for the integer part of a
 * number: the last 3 digits form one group, then every 2 digits after that.
 * e.g. 12345678 -> "1,23,45,678".
 */
export function southAsianGrouping(integerDigits: string): string {
  const negative = integerDigits.startsWith('-');
  const digits = negative ? integerDigits.slice(1) : integerDigits;

  if (digits.length <= 3) return (negative ? '-' : '') + digits;

  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const groups: string[] = [];
  for (let i = rest.length; i > 0; i -= 2) {
    groups.unshift(rest.slice(Math.max(0, i - 2), i));
  }

  return (negative ? '-' : '') + [...groups, lastThree].join(',');
}

export interface FormatMoneyOptions {
  /** Show the ISO currency code/symbol prefix. Default true. */
  showCurrency?: boolean;
  /** Use South Asian (lakh/crore) grouping. Defaults to true for NPR/INR, false otherwise. */
  southAsianDigitGrouping?: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: 'Rs',
  INR: '₹',
  USD: '$',
  AUD: 'A$',
};

/** Formats integer minor units into a display string, e.g. 125050 NPR -> "Rs 1,250.50". */
export function formatMoney(minorUnits: number, currency: string, options: FormatMoneyOptions = {}): string {
  const decimals = minorUnitsFor(currency);
  const negative = minorUnits < 0;
  const decimalStr = fromMinorUnits(Math.abs(minorUnits), currency);
  const [wholePart = '0', fractionPart = ''] = decimalStr.split('.');

  const useSouthAsian = options.southAsianDigitGrouping ?? ['NPR', 'INR'].includes(currency.toUpperCase());

  const groupedWhole = useSouthAsian
    ? southAsianGrouping(wholePart)
    : wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const amountStr = decimals > 0 ? `${groupedWhole}.${fractionPart}` : groupedWhole;
  const signPrefix = negative ? '-' : '';
  const showCurrency = options.showCurrency ?? true;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();

  return showCurrency ? `${signPrefix}${symbol} ${amountStr}` : `${signPrefix}${amountStr}`;
}

/** Sums an array of minor-unit amounts safely (all inputs must share one currency). */
export function sumMinorUnits(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
