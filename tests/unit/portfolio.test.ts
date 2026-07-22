import {
  averageCostMinor,
  holdingQuantity,
  netInvestedMinor,
  portfolioTotals,
  realisedIncomeMinor,
  valueAsset,
  type AssetLike,
  type InvestmentTransactionLike,
} from '@/features/investments/portfolio';

function txn(
  txn_type: InvestmentTransactionLike['txn_type'],
  amount_minor: number,
  extras: Partial<InvestmentTransactionLike> = {}
): InvestmentTransactionLike {
  return { txn_type, txn_date: '2026-07-01', quantity: null, amount_minor, fees_minor: 0, ...extras };
}

function asset(overrides: Partial<AssetLike> = {}): AssetLike {
  return { quantity: 0, currency: 'NPR', current_price_minor: null, last_valuation_date: null, ...overrides };
}

describe('holdingQuantity', () => {
  it('is buys minus sells', () => {
    const transactions = [
      txn('buy', 100_000, { quantity: 100 }),
      txn('buy', 50_000, { quantity: 50 }),
      txn('sell', 30_000, { quantity: 30 }),
    ];

    expect(holdingQuantity(transactions)).toBe(120);
  });

  it('ignores dividends, which change no holding', () => {
    expect(holdingQuantity([txn('buy', 100_000, { quantity: 10 }), txn('dividend', 5_000)])).toBe(10);
  });

  it('ignores soft-deleted transactions', () => {
    expect(holdingQuantity([txn('buy', 100_000, { quantity: 10, deleted_at: '2026-07-02' })])).toBe(0);
  });
});

describe('netInvestedMinor', () => {
  it('adds fees to the cost of a buy', () => {
    expect(netInvestedMinor([txn('buy', 100_000, { quantity: 10, fees_minor: 500 })])).toBe(100_500);
  });

  it('subtracts fees from the proceeds of a sell', () => {
    const transactions = [
      txn('buy', 100_000, { quantity: 10 }),
      txn('sell', 60_000, { quantity: 5, fees_minor: 500 }),
    ];

    // 100,000 in, then 59,500 back out of pocket.
    expect(netInvestedMinor(transactions)).toBe(40_500);
  });

  // A dividend is a return *on* the investment, not a change to what was
  // put in — folding it into cost basis would understate the return.
  it('leaves dividends out of the cost basis', () => {
    expect(netInvestedMinor([txn('buy', 100_000, { quantity: 10 }), txn('dividend', 5_000)])).toBe(100_000);
  });

  it('counts standalone fees as invested cost', () => {
    expect(netInvestedMinor([txn('fee', 1_000)])).toBe(1_000);
  });
});

describe('realisedIncomeMinor', () => {
  it('sums dividends and interest only', () => {
    const transactions = [
      txn('dividend', 5_000),
      txn('interest', 2_000),
      txn('buy', 100_000, { quantity: 1 }),
    ];
    expect(realisedIncomeMinor(transactions)).toBe(7_000);
  });
});

describe('averageCostMinor', () => {
  it('is net invested over units held', () => {
    expect(averageCostMinor([txn('buy', 100_000, { quantity: 100 })])).toBe(1_000);
  });

  it('is null when nothing is held', () => {
    expect(averageCostMinor([])).toBeNull();
    expect(
      averageCostMinor([txn('buy', 100_000, { quantity: 10 }), txn('sell', 120_000, { quantity: 10 })])
    ).toBeNull();
  });
});

describe('valueAsset', () => {
  const transactions = [txn('buy', 100_000, { quantity: 100 }), txn('dividend', 5_000)];

  // Inventing a market price would be worse than showing nothing.
  it('reports a null value when no price has been recorded', () => {
    const result = valueAsset(asset(), transactions);

    expect(result.currentValueMinor).toBeNull();
    expect(result.unrealisedGainMinor).toBeNull();
    expect(result.returnRate).toBeNull();
    expect(result.asOf).toBeNull();
  });

  it('values the holding at the recorded price and reports its date', () => {
    const result = valueAsset(
      asset({ current_price_minor: 1_200, last_valuation_date: '2026-07-20' }),
      transactions
    );

    expect(result.currentValueMinor).toBe(120_000);
    expect(result.unrealisedGainMinor).toBe(20_000);
    expect(result.asOf).toBe('2026-07-20');
  });

  it('includes realised income in the return rate', () => {
    const result = valueAsset(asset({ current_price_minor: 1_200 }), transactions);

    // (120,000 + 5,000 - 100,000) / 100,000
    expect(result.returnRate).toBeCloseTo(0.25);
  });

  it('reports a loss as a negative gain', () => {
    const result = valueAsset(asset({ current_price_minor: 800 }), transactions);
    expect(result.unrealisedGainMinor).toBe(-20_000);
  });
});

describe('portfolioTotals', () => {
  it('separates currencies', () => {
    const totals = portfolioTotals([
      {
        asset: asset({ current_price_minor: 1_200 }),
        transactions: [txn('buy', 100_000, { quantity: 100 })],
      },
      {
        asset: asset({ currency: 'AUD', current_price_minor: 500 }),
        transactions: [txn('buy', 4_000, { quantity: 10 })],
      },
    ]);

    expect(totals.map((row) => row.currency).sort()).toEqual(['AUD', 'NPR']);
  });

  // The count is what lets the UI say the total is incomplete rather than
  // quietly understating the portfolio.
  it('counts unvalued holdings and excludes them from the value', () => {
    const totals = portfolioTotals([
      {
        asset: asset({ current_price_minor: 1_200 }),
        transactions: [txn('buy', 100_000, { quantity: 100 })],
      },
      { asset: asset(), transactions: [txn('buy', 50_000, { quantity: 10 })] },
    ]);

    expect(totals[0]!.unvaluedAssetCount).toBe(1);
    expect(totals[0]!.currentValueMinor).toBe(120_000);
    // Cost basis still counts everything, valued or not.
    expect(totals[0]!.netInvestedMinor).toBe(150_000);
  });
});
