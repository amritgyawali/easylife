import {
  monthRange,
  monthlyTrend,
  shiftMonth,
  summarise,
  totalsByCategory,
} from '@/features/finance/reports';
import type { TransactionRow } from '@/features/finance/transactions-api';

function transaction(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    id: 'txn',
    user_id: 'user',
    transaction_type: 'expense',
    transaction_date: '2026-07-10',
    posting_date: '2026-07-10',
    amount_minor: 10_000,
    currency: 'NPR',
    exchange_rate: null,
    npr_equivalent_minor: null,
    account_id: 'account-1',
    destination_account_id: null,
    category_id: null,
    counterparty_id: null,
    payment_method: null,
    description: null,
    reference: null,
    notes: null,
    location: null,
    is_imported: false,
    status: 'confirmed',
    is_reconciled: false,
    source_document_id: null,
    source_extracted_transaction_id: null,
    loan_id: null,
    investment_transaction_id: null,
    created_by_device_id: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    deleted_at: null,
    version: 1,
    ...overrides,
  };
}

describe('monthRange', () => {
  it('spans the whole calendar month', () => {
    expect(monthRange('2026-07-15')).toEqual({ from: '2026-07-01', to: '2026-07-31', label: 'July 2026' });
  });

  it('handles a 30-day month', () => {
    expect(monthRange('2026-06-15').to).toBe('2026-06-30');
  });

  it('handles February in a leap year', () => {
    expect(monthRange('2028-02-10').to).toBe('2028-02-29');
  });
});

describe('shiftMonth', () => {
  it('crosses a year boundary', () => {
    expect(monthRange(shiftMonth('2026-01-15', 1)).label).toBe('December 2025');
  });
});

describe('summarise', () => {
  const range = monthRange('2026-07-15');

  it('separates income from expense and nets them', () => {
    const summaries = summarise(
      [
        transaction({ transaction_type: 'income', amount_minor: 100_000 }),
        transaction({ transaction_type: 'expense', amount_minor: 30_000 }),
      ],
      range
    );

    expect(summaries).toEqual([
      { currency: 'NPR', incomeMinor: 100_000, expenseMinor: 30_000, netMinor: 70_000, transactionCount: 2 },
    ]);
  });

  // Moving money between your own accounts is neither income nor spending;
  // counting it would double the month's apparent activity.
  it('excludes transfers entirely', () => {
    const summaries = summarise(
      [transaction({ transaction_type: 'transfer', amount_minor: 500_000 })],
      range
    );

    expect(summaries).toEqual([]);
  });

  it('excludes transactions outside the range', () => {
    const summaries = summarise([transaction({ transaction_date: '2026-06-30' })], range);
    expect(summaries).toEqual([]);
  });

  // Without live exchange rates, blending currencies would produce a
  // confident number that means nothing.
  it('keeps currencies separate', () => {
    const summaries = summarise(
      [
        transaction({ currency: 'NPR', amount_minor: 10_000 }),
        transaction({ currency: 'AUD', amount_minor: 5_000 }),
      ],
      range
    );

    expect(summaries).toHaveLength(2);
    expect(summaries.map((row) => row.currency).sort()).toEqual(['AUD', 'NPR']);
  });
});

describe('totalsByCategory', () => {
  const range = monthRange('2026-07-15');

  it('groups by category, largest first, with shares summing to one', () => {
    const totals = totalsByCategory(
      [
        transaction({ category_id: 'food', amount_minor: 30_000 }),
        transaction({ category_id: 'food', amount_minor: 10_000 }),
        transaction({ category_id: 'rent', amount_minor: 60_000 }),
      ],
      range,
      'NPR',
      'expense'
    );

    expect(totals.map((row) => row.categoryId)).toEqual(['rent', 'food']);
    expect(totals[0]!.totalMinor).toBe(60_000);
    expect(totals[1]!.transactionCount).toBe(2);
    expect(totals.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1);
  });

  // Dropping uncategorised spending would make the percentages add up to
  // less than the money actually spent.
  it('keeps uncategorised spending as its own null-id row', () => {
    const totals = totalsByCategory(
      [transaction({ category_id: null, amount_minor: 20_000 })],
      range,
      'NPR',
      'expense'
    );

    expect(totals).toHaveLength(1);
    expect(totals[0]!.categoryId).toBeNull();
    expect(totals[0]!.share).toBe(1);
  });

  it('ignores the other currency and the other direction', () => {
    const totals = totalsByCategory(
      [
        transaction({ currency: 'AUD', category_id: 'food' }),
        transaction({ transaction_type: 'income', category_id: 'salary' }),
      ],
      range,
      'NPR',
      'expense'
    );

    expect(totals).toEqual([]);
  });
});

describe('monthlyTrend', () => {
  it('returns one row per month, oldest first, zero-filled where there is nothing', () => {
    const trend = monthlyTrend([transaction({ transaction_date: '2026-07-10' })], '2026-07-23', 'NPR', 3);

    expect(trend.map((row) => row.label)).toEqual(['May 2026', 'June 2026', 'July 2026']);
    expect(trend[0]!.expenseMinor).toBe(0);
    expect(trend[2]!.expenseMinor).toBe(10_000);
  });
});
