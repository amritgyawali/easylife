import { formatMoney, fromMinorUnits, southAsianGrouping, sumMinorUnits, toMinorUnits } from '@/utils/money';

describe('toMinorUnits', () => {
  it('converts a whole-rupee amount to paisa', () => {
    expect(toMinorUnits('1250', 'NPR')).toBe(125000);
  });

  it('converts a decimal amount to minor units', () => {
    expect(toMinorUnits('1250.50', 'NPR')).toBe(125050);
  });

  it('accepts a number input', () => {
    expect(toMinorUnits(99.99, 'USD')).toBe(9999);
  });

  it('pads a short decimal fraction', () => {
    expect(toMinorUnits('10.5', 'NPR')).toBe(1050);
  });

  it('handles a leading-dot amount', () => {
    expect(toMinorUnits('.50', 'NPR')).toBe(50);
  });

  it('handles negative amounts', () => {
    expect(toMinorUnits('-500', 'NPR')).toBe(-50000);
  });

  it('handles zero', () => {
    expect(toMinorUnits('0', 'NPR')).toBe(0);
  });

  it('rejects an amount with too many decimal places', () => {
    expect(() => toMinorUnits('10.999', 'NPR')).toThrow(RangeError);
  });

  it('rejects a non-numeric amount', () => {
    expect(() => toMinorUnits('abc', 'NPR')).toThrow(RangeError);
  });

  it('rejects an empty string', () => {
    expect(() => toMinorUnits('', 'NPR')).toThrow(RangeError);
  });
});

describe('fromMinorUnits', () => {
  it('converts paisa back to a decimal rupee string', () => {
    expect(fromMinorUnits(125050, 'NPR')).toBe('1250.50');
  });

  it('round-trips through toMinorUnits', () => {
    expect(fromMinorUnits(toMinorUnits('1250.50', 'NPR'), 'NPR')).toBe('1250.50');
  });

  it('handles negative minor units', () => {
    expect(fromMinorUnits(-50000, 'NPR')).toBe('-500.00');
  });

  it('handles small amounts under one rupee', () => {
    expect(fromMinorUnits(50, 'NPR')).toBe('0.50');
  });

  it('handles zero', () => {
    expect(fromMinorUnits(0, 'NPR')).toBe('0.00');
  });
});

describe('southAsianGrouping', () => {
  it('groups a large number using lakh/crore convention', () => {
    expect(southAsianGrouping('12345678')).toBe('1,23,45,678');
  });

  it('leaves three-digit numbers ungrouped', () => {
    expect(southAsianGrouping('123')).toBe('123');
  });

  it('groups a four-digit number with one separator', () => {
    expect(southAsianGrouping('1234')).toBe('1,234');
  });

  it('groups one lakh correctly', () => {
    expect(southAsianGrouping('100000')).toBe('1,00,000');
  });

  it('preserves the negative sign', () => {
    expect(southAsianGrouping('-100000')).toBe('-1,00,000');
  });
});

describe('formatMoney', () => {
  it('formats NPR with lakh/crore grouping by default', () => {
    expect(formatMoney(12345678_00, 'NPR')).toBe('Rs 1,23,45,678.00');
  });

  it('formats USD with standard thousands grouping', () => {
    expect(formatMoney(1234567, 'USD')).toBe('$ 12,345.67');
  });

  it('shows a minus sign for negative amounts', () => {
    expect(formatMoney(-125050, 'NPR')).toBe('-Rs 1,250.50');
  });

  it('can omit the currency symbol', () => {
    expect(formatMoney(125050, 'NPR', { showCurrency: false })).toBe('1,250.50');
  });
});

describe('sumMinorUnits', () => {
  it('sums an array of minor-unit amounts', () => {
    expect(sumMinorUnits([100, 200, 300])).toBe(600);
  });

  it('handles negative amounts (e.g. a balanced ledger)', () => {
    expect(sumMinorUnits([100000, -60000, -40000])).toBe(0);
  });

  it('returns 0 for an empty array', () => {
    expect(sumMinorUnits([])).toBe(0);
  });
});
