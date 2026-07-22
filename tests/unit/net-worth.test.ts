import { convertNetWorth, netWorthBreakdown } from '@/features/networth/net-worth';
import type { ExchangeRate } from '@/features/finance/currency';

const RATES: ExchangeRate[] = [
  { from_currency: 'AUD', to_currency: 'NPR', rate: 87, as_of_date: '2026-07-20' },
];

function input(overrides: Partial<Parameters<typeof netWorthBreakdown>[0]> = {}) {
  return {
    accountTotals: new Map<string, number>(),
    investmentTotals: new Map<string, number>(),
    lentTotals: new Map<string, number>(),
    borrowedTotals: new Map<string, number>(),
    unvaluedAssetCount: 0,
    ...overrides,
  };
}

describe('netWorthBreakdown', () => {
  it('adds accounts, investments and money lent, and subtracts money borrowed', () => {
    const breakdown = netWorthBreakdown(
      input({
        accountTotals: new Map([['NPR', 500_000]]),
        investmentTotals: new Map([['NPR', 200_000]]),
        lentTotals: new Map([['NPR', 100_000]]),
        borrowedTotals: new Map([['NPR', 300_000]]),
      })
    );

    expect(breakdown.totalsByCurrency.get('NPR')).toBe(500_000 + 200_000 + 100_000 - 300_000);
  });

  it('can be negative when debts exceed assets', () => {
    const breakdown = netWorthBreakdown(
      input({
        accountTotals: new Map([['NPR', 10_000]]),
        borrowedTotals: new Map([['NPR', 50_000]]),
      })
    );

    expect(breakdown.totalsByCurrency.get('NPR')).toBe(-40_000);
  });

  it('keeps each currency separate before conversion', () => {
    const breakdown = netWorthBreakdown(
      input({
        accountTotals: new Map([
          ['NPR', 500_000],
          ['AUD', 20_000],
        ]),
      })
    );

    expect(breakdown.totalsByCurrency.get('NPR')).toBe(500_000);
    expect(breakdown.totalsByCurrency.get('AUD')).toBe(20_000);
  });

  it('exposes the components so the UI can show where the money is', () => {
    const breakdown = netWorthBreakdown(input({ lentTotals: new Map([['NPR', 100_000]]) }));

    const lent = breakdown.components.find((component) => component.label === 'Lent out');
    expect(lent?.totalsByCurrency.get('NPR')).toBe(100_000);
  });
});

describe('convertNetWorth', () => {
  it('folds everything into the target currency', () => {
    const breakdown = netWorthBreakdown(
      input({
        accountTotals: new Map([
          ['NPR', 500_000],
          ['AUD', 10_000],
        ]),
      })
    );

    const converted = convertNetWorth(breakdown, 'NPR', RATES, '2026-07-23');

    expect(converted.totalMinor).toBe(500_000 + 10_000 * 87);
    expect(converted.unconvertible).toEqual([]);
  });

  // The headline figure must always be a number the data supports; a missing
  // rate has to be visible rather than absorbed.
  it('names the currencies it had to leave out', () => {
    const breakdown = netWorthBreakdown(
      input({
        accountTotals: new Map([
          ['NPR', 500_000],
          ['USD', 1_000],
        ]),
      })
    );

    const converted = convertNetWorth(breakdown, 'NPR', RATES, '2026-07-23');

    expect(converted.unconvertible).toEqual(['USD']);
    expect(converted.totalMinor).toBe(500_000);
  });

  it('carries the unvalued-holding count through so the UI can disclose it', () => {
    const breakdown = netWorthBreakdown(input({ unvaluedAssetCount: 3 }));
    expect(convertNetWorth(breakdown, 'NPR', RATES, '2026-07-23').unvaluedAssetCount).toBe(3);
  });

  it('reports the rate date used, so staleness is visible', () => {
    const breakdown = netWorthBreakdown(input({ accountTotals: new Map([['AUD', 10_000]]) }));
    expect(convertNetWorth(breakdown, 'NPR', RATES, '2026-07-23').oldestRateDate).toBe('2026-07-20');
  });
});
