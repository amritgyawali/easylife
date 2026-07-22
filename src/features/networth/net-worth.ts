import type { IsoDate } from '@/utils/date';
import { convertTotals, type ExchangeRate } from '@/features/finance/currency';

/**
 * Net worth across every asset class, kept pure so the composition is
 * testable without a database.
 *
 * Three components, each derived elsewhere and only combined here:
 *   - account balances (from `ledger_entries`),
 *   - investment holdings (from valuations, where one exists),
 *   - net lending position (money lent out is an asset, money borrowed a
 *     liability).
 *
 * Nothing is estimated. A holding with no recorded price and a currency with
 * no recorded exchange rate are both reported as *excluded*, so the headline
 * figure is always a number the underlying data actually supports.
 */

export interface NetWorthInput {
  /** Balances of accounts flagged `include_in_net_worth`, per currency. */
  accountTotals: Map<string, number>;
  /** Valued investment holdings, per currency. */
  investmentTotals: Map<string, number>;
  /** Outstanding money lent to others (an asset), per currency. */
  lentTotals: Map<string, number>;
  /** Outstanding money borrowed from others (a liability), per currency. */
  borrowedTotals: Map<string, number>;
  /** Holdings excluded because no price has ever been recorded. */
  unvaluedAssetCount: number;
}

export interface NetWorthComponent {
  label: string;
  totalsByCurrency: Map<string, number>;
}

export interface NetWorthBreakdown {
  /** Per currency, before any conversion. Always exact. */
  totalsByCurrency: Map<string, number>;
  components: NetWorthComponent[];
  unvaluedAssetCount: number;
}

function addInto(target: Map<string, number>, source: Map<string, number>, sign: 1 | -1): void {
  for (const [currency, amount] of source) {
    target.set(currency, (target.get(currency) ?? 0) + sign * amount);
  }
}

export function netWorthBreakdown(input: NetWorthInput): NetWorthBreakdown {
  const totalsByCurrency = new Map<string, number>();

  addInto(totalsByCurrency, input.accountTotals, 1);
  addInto(totalsByCurrency, input.investmentTotals, 1);
  addInto(totalsByCurrency, input.lentTotals, 1);
  addInto(totalsByCurrency, input.borrowedTotals, -1);

  return {
    totalsByCurrency,
    components: [
      { label: 'Accounts', totalsByCurrency: input.accountTotals },
      { label: 'Investments', totalsByCurrency: input.investmentTotals },
      { label: 'Lent out', totalsByCurrency: input.lentTotals },
      { label: 'Borrowed', totalsByCurrency: input.borrowedTotals },
    ],
    unvaluedAssetCount: input.unvaluedAssetCount,
  };
}

export interface ConvertedNetWorth {
  currency: string;
  totalMinor: number;
  /** Currencies left out because no rate was recorded. */
  unconvertible: string[];
  oldestRateDate: IsoDate | null;
  unvaluedAssetCount: number;
}

/**
 * Folds the per-currency breakdown into one headline figure.
 *
 * Kept separate from `netWorthBreakdown` so the exact per-currency numbers
 * are always available even when conversion is impossible — the UI falls back
 * to listing currencies rather than showing nothing.
 */
export function convertNetWorth(
  breakdown: NetWorthBreakdown,
  targetCurrency: string,
  rates: ExchangeRate[],
  onDate: IsoDate
): ConvertedNetWorth {
  const converted = convertTotals(breakdown.totalsByCurrency, targetCurrency, rates, onDate);

  return {
    currency: converted.currency,
    totalMinor: converted.totalMinor,
    unconvertible: converted.unconvertible,
    oldestRateDate: converted.oldestRateDate,
    unvaluedAssetCount: breakdown.unvaluedAssetCount,
  };
}
