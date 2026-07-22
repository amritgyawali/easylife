import { convertMinorUnits, convertTotals, findRate, type ExchangeRate } from '@/features/finance/currency';
import { AppError } from '@/utils/errors';

const RATES: ExchangeRate[] = [
  { from_currency: 'NPR', to_currency: 'AUD', rate: 0.0115, as_of_date: '2026-07-01' },
  { from_currency: 'NPR', to_currency: 'AUD', rate: 0.0118, as_of_date: '2026-07-20' },
  { from_currency: 'USD', to_currency: 'NPR', rate: 133.5, as_of_date: '2026-07-15' },
];

describe('convertMinorUnits', () => {
  it('returns the amount unchanged for the same currency', () => {
    expect(convertMinorUnits(123_456, 'NPR', 'NPR', 999)).toBe(123_456);
  });

  it('converts between two 2dp currencies', () => {
    // NPR 1,000.00 at 0.0118 -> AUD 11.80
    expect(convertMinorUnits(100_000, 'NPR', 'AUD', 0.0118)).toBe(1_180);
  });

  it('preserves the sign of a negative amount', () => {
    expect(convertMinorUnits(-100_000, 'NPR', 'AUD', 0.0118)).toBe(-1_180);
  });

  // Rounding must be symmetric, or a debit and its matching credit could
  // convert to amounts that don't cancel.
  it('rounds a negative the same distance as its positive twin', () => {
    const positive = convertMinorUnits(12_345, 'NPR', 'AUD', 0.0115);
    const negative = convertMinorUnits(-12_345, 'NPR', 'AUD', 0.0115);
    expect(negative).toBe(-positive);
  });

  it('rejects a zero or negative rate rather than producing nonsense', () => {
    expect(() => convertMinorUnits(1_000, 'NPR', 'AUD', 0)).toThrow(AppError);
    expect(() => convertMinorUnits(1_000, 'NPR', 'AUD', -1)).toThrow(AppError);
  });
});

describe('findRate', () => {
  it('uses the most recent rate on or before the date', () => {
    expect(findRate(RATES, 'NPR', 'AUD', '2026-07-23')?.rate).toBe(0.0118);
    expect(findRate(RATES, 'NPR', 'AUD', '2026-07-10')?.rate).toBe(0.0115);
  });

  it('reports which date the rate came from', () => {
    expect(findRate(RATES, 'NPR', 'AUD', '2026-07-23')?.asOf).toBe('2026-07-20');
  });

  // Recording one direction should be enough; making the user enter both
  // would guarantee they eventually disagree.
  it('inverts a stored rate to answer the reverse pair', () => {
    const found = findRate(RATES, 'NPR', 'USD', '2026-07-23');
    expect(found?.rate).toBeCloseTo(1 / 133.5);
  });

  it('is 1 for the same currency', () => {
    expect(findRate(RATES, 'NPR', 'NPR', '2026-07-23')?.rate).toBe(1);
  });

  // Assuming 1:1 for an unknown pair would silently corrupt every total that
  // used it, so a missing rate must be visible.
  it('returns null rather than guessing when no rate exists', () => {
    expect(findRate(RATES, 'NPR', 'EUR', '2026-07-23')).toBeNull();
  });

  it('returns null when every recorded rate is after the date asked about', () => {
    expect(findRate(RATES, 'NPR', 'AUD', '2026-06-01')).toBeNull();
  });
});

describe('convertTotals', () => {
  it('folds several currencies into the target', () => {
    const totals = new Map([
      ['NPR', 100_000],
      ['AUD', 5_000],
    ]);

    const result = convertTotals(totals, 'AUD', RATES, '2026-07-23');

    expect(result.totalMinor).toBe(1_180 + 5_000);
    expect(result.unconvertible).toEqual([]);
  });

  it('reports unconvertible currencies instead of dropping them silently', () => {
    const totals = new Map([
      ['NPR', 100_000],
      ['EUR', 9_999],
    ]);

    const result = convertTotals(totals, 'AUD', RATES, '2026-07-23');

    expect(result.unconvertible).toEqual(['EUR']);
    expect(result.totalMinor).toBe(1_180);
  });

  it('surfaces the oldest rate used so staleness is visible', () => {
    const totals = new Map([['NPR', 100_000]]);
    const result = convertTotals(totals, 'AUD', RATES, '2026-07-23');

    expect(result.oldestRateDate).toBe('2026-07-20');
  });

  it('does not count the target currency itself as a stale conversion', () => {
    const totals = new Map([['AUD', 5_000]]);
    const result = convertTotals(totals, 'AUD', RATES, '2026-07-23');

    expect(result.oldestRateDate).toBeNull();
    expect(result.totalMinor).toBe(5_000);
  });
});
