import { minorUnitsFor } from '@/utils/money';
import { AppError } from '@/utils/errors';
import type { IsoDate } from '@/utils/date';

/**
 * Currency conversion, kept pure so the arithmetic is unit-testable without
 * a database.
 *
 * There is no paid FX feed in this project. Rates are rows the user (or a
 * later import) records in `exchange_rates`, and every converted figure in
 * the UI is labelled with the rate's date — a stale rate presented as
 * current is worse than no conversion at all.
 */

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  /** Units of `to_currency` per one unit of `from_currency`. */
  rate: number;
  as_of_date: IsoDate;
}

/**
 * Converts an integer minor-unit amount between currencies.
 *
 * Scales for a difference in decimal places between the two currencies
 * rather than assuming both are 2dp, and rounds half-away-from-zero so a
 * converted amount is never asymmetric between a debit and its matching
 * credit.
 */
export function convertMinorUnits(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amountMinor;
  if (!(rate > 0)) {
    throw new AppError('validation_failed', `Exchange rate must be greater than zero, got ${rate}`);
  }

  const scale = 10 ** (minorUnitsFor(toCurrency) - minorUnitsFor(fromCurrency));
  const converted = amountMinor * rate * scale;

  return converted < 0 ? -Math.round(-converted) : Math.round(converted);
}

/**
 * Best available rate for a pair on or before `onDate`.
 *
 * Looks for a direct rate first, then an inverted one (a stored NPR→AUD row
 * answers an AUD→NPR question), so the user only has to record each pair
 * once. Returns null rather than guessing 1:1 — silently treating unknown
 * currencies as equal would quietly corrupt every total that used it.
 */
export function findRate(
  rates: ExchangeRate[],
  fromCurrency: string,
  toCurrency: string,
  onDate: IsoDate
): { rate: number; asOf: IsoDate } | null {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return { rate: 1, asOf: onDate };

  const usable = rates
    .filter((row) => row.as_of_date <= onDate)
    .sort((a, b) => b.as_of_date.localeCompare(a.as_of_date));

  const direct = usable.find(
    (row) => row.from_currency.toUpperCase() === from && row.to_currency.toUpperCase() === to
  );
  if (direct) return { rate: direct.rate, asOf: direct.as_of_date };

  const inverse = usable.find(
    (row) => row.from_currency.toUpperCase() === to && row.to_currency.toUpperCase() === from
  );
  if (inverse && inverse.rate > 0) return { rate: 1 / inverse.rate, asOf: inverse.as_of_date };

  return null;
}

export interface ConvertedTotal {
  currency: string;
  totalMinor: number;
  /** Currencies that had no usable rate and are therefore missing from the total. */
  unconvertible: string[];
  /** Oldest rate date used, so the UI can say how stale the figure is. */
  oldestRateDate: IsoDate | null;
}

/**
 * Folds per-currency totals into one currency.
 *
 * Anything with no usable rate is reported in `unconvertible` instead of
 * being dropped or assumed 1:1, so the UI can show an honest "plus X in
 * AUD, no rate recorded" rather than a total that quietly omits money.
 */
export function convertTotals(
  totalsByCurrency: Map<string, number>,
  targetCurrency: string,
  rates: ExchangeRate[],
  onDate: IsoDate
): ConvertedTotal {
  let totalMinor = 0;
  const unconvertible: string[] = [];
  let oldestRateDate: IsoDate | null = null;

  for (const [currency, amount] of totalsByCurrency) {
    const found = findRate(rates, currency, targetCurrency, onDate);

    if (!found) {
      unconvertible.push(currency);
      continue;
    }

    totalMinor += convertMinorUnits(amount, currency, targetCurrency, found.rate);

    if (currency.toUpperCase() !== targetCurrency.toUpperCase()) {
      if (!oldestRateDate || found.asOf < oldestRateDate) oldestRateDate = found.asOf;
    }
  }

  return { currency: targetCurrency, totalMinor, unconvertible, oldestRateDate };
}
