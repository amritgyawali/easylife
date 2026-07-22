import type { InvestmentTxnType } from '@/types/database';
import type { IsoDate } from '@/utils/date';

/**
 * Portfolio arithmetic, kept pure so cost basis and gain/loss are testable
 * without a database.
 *
 * There is no live price feed in this project (see `0011_investments.sql`),
 * so "current value" is only ever as good as the last valuation the user
 * recorded. Everything here therefore reports the valuation date alongside
 * the number, and returns null rather than inventing a value when no
 * valuation exists — a made-up market price is worse than a blank.
 */

export interface InvestmentTransactionLike {
  txn_type: InvestmentTxnType;
  txn_date: IsoDate;
  quantity: number | null;
  amount_minor: number;
  fees_minor: number;
  deleted_at?: string | null;
}

export interface AssetLike {
  quantity: number;
  currency: string;
  current_price_minor: number | null;
  last_valuation_date: IsoDate | null;
}

function active(transactions: InvestmentTransactionLike[]): InvestmentTransactionLike[] {
  return transactions.filter((txn) => !txn.deleted_at);
}

/**
 * Units held, derived from buys minus sells.
 *
 * Derived rather than trusting `investment_assets.quantity` so the holding
 * can never drift from its transaction history — same principle as balances
 * coming from ledger entries rather than a stored column.
 */
export function holdingQuantity(transactions: InvestmentTransactionLike[]): number {
  return active(transactions).reduce((total, txn) => {
    if (txn.txn_type === 'buy') return total + (txn.quantity ?? 0);
    if (txn.txn_type === 'sell') return total - (txn.quantity ?? 0);
    return total;
  }, 0);
}

/**
 * Net cash invested: what buying cost (including fees), less what selling
 * returned. Fees are added to the cost of a buy and subtracted from the
 * proceeds of a sell, because that is what actually left or entered the
 * user's pocket.
 */
export function netInvestedMinor(transactions: InvestmentTransactionLike[]): number {
  return active(transactions).reduce((total, txn) => {
    switch (txn.txn_type) {
      case 'buy':
        return total + txn.amount_minor + txn.fees_minor;
      case 'sell':
        return total - (txn.amount_minor - txn.fees_minor);
      case 'fee':
        return total + txn.amount_minor;
      // Dividends and interest are a return *on* the investment, not a
      // change in what was put in, so they belong in realised income below.
      default:
        return total;
    }
  }, 0);
}

/** Cash already received from the holding: dividends and interest. */
export function realisedIncomeMinor(transactions: InvestmentTransactionLike[]): number {
  return active(transactions)
    .filter((txn) => txn.txn_type === 'dividend' || txn.txn_type === 'interest')
    .reduce((total, txn) => total + txn.amount_minor, 0);
}

/**
 * Average cost per unit still held, or null when nothing is held.
 *
 * A simple average of net invested over current quantity rather than FIFO or
 * specific-lot: Nepal's informal share and gold holdings are not tracked
 * lot-by-lot, and a wrong-but-precise FIFO figure would imply a rigour the
 * input data doesn't have.
 */
export function averageCostMinor(transactions: InvestmentTransactionLike[]): number | null {
  const quantity = holdingQuantity(transactions);
  if (quantity <= 0) return null;
  return Math.round(netInvestedMinor(transactions) / quantity);
}

export interface AssetValuation {
  /** Null when no price has ever been recorded. */
  currentValueMinor: number | null;
  /** Null alongside a null value; otherwise the date the price is from. */
  asOf: IsoDate | null;
  netInvestedMinor: number;
  realisedIncomeMinor: number;
  /** Unrealised gain/loss; null when there is nothing to compare against. */
  unrealisedGainMinor: number | null;
  /** 0–1 return on net invested, null when nothing is invested or valued. */
  returnRate: number | null;
  quantity: number;
}

export function valueAsset(asset: AssetLike, transactions: InvestmentTransactionLike[]): AssetValuation {
  const quantity = holdingQuantity(transactions);
  const invested = netInvestedMinor(transactions);
  const income = realisedIncomeMinor(transactions);

  const currentValueMinor =
    asset.current_price_minor === null ? null : Math.round(asset.current_price_minor * quantity);

  const unrealisedGainMinor = currentValueMinor === null ? null : currentValueMinor - invested;

  const returnRate =
    currentValueMinor === null || invested <= 0 ? null : (currentValueMinor + income - invested) / invested;

  return {
    currentValueMinor,
    asOf: currentValueMinor === null ? null : asset.last_valuation_date,
    netInvestedMinor: invested,
    realisedIncomeMinor: income,
    unrealisedGainMinor,
    returnRate,
    quantity,
  };
}

export interface PortfolioTotal {
  currency: string;
  /** Sum of valued holdings only. */
  currentValueMinor: number;
  netInvestedMinor: number;
  unrealisedGainMinor: number;
  /** Assets with no recorded price, so the total is known to be incomplete. */
  unvaluedAssetCount: number;
}

/**
 * Portfolio totals per currency.
 *
 * Unvalued assets are counted but excluded from the value total, and the
 * count is surfaced so the UI can say "plus 2 holdings with no price
 * recorded" instead of quietly understating the portfolio.
 */
export function portfolioTotals(
  assets: { asset: AssetLike; transactions: InvestmentTransactionLike[] }[]
): PortfolioTotal[] {
  const byCurrency = new Map<string, PortfolioTotal>();

  for (const { asset, transactions } of assets) {
    const valuation = valueAsset(asset, transactions);

    const total = byCurrency.get(asset.currency) ?? {
      currency: asset.currency,
      currentValueMinor: 0,
      netInvestedMinor: 0,
      unrealisedGainMinor: 0,
      unvaluedAssetCount: 0,
    };

    total.netInvestedMinor += valuation.netInvestedMinor;

    if (valuation.currentValueMinor === null) {
      total.unvaluedAssetCount += 1;
    } else {
      total.currentValueMinor += valuation.currentValueMinor;
      total.unrealisedGainMinor += valuation.unrealisedGainMinor ?? 0;
    }

    byCurrency.set(asset.currency, total);
  }

  return [...byCurrency.values()];
}
