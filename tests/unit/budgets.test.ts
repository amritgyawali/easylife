import { budgetItemProgress, budgetPeriodRange, budgetTotals } from '@/features/budgets/progress';
import type { BudgetItemRow, BudgetRow } from '@/features/budgets/progress';
import type { TransactionRow } from '@/features/finance/transactions-api';

function budget(overrides: Partial<BudgetRow> = {}): BudgetRow {
  return {
    id: 'budget-1',
    user_id: 'user',
    name: 'July',
    period: 'monthly',
    period_start: '2026-07-01',
    currency: 'NPR',
    rollover_enabled: false,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function item(overrides: Partial<BudgetItemRow> = {}): BudgetItemRow {
  return {
    id: 'item-1',
    user_id: 'user',
    budget_id: 'budget-1',
    category_id: 'food',
    planned_amount_minor: 100_000,
    carried_over_minor: 0,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

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
    category_id: 'food',
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

describe('budgetPeriodRange', () => {
  it('spans the calendar month for a monthly budget', () => {
    expect(budgetPeriodRange(budget())).toEqual({ from: '2026-07-01', to: '2026-07-31', label: 'July 2026' });
  });

  it('spans the whole year for a yearly budget', () => {
    expect(budgetPeriodRange(budget({ period: 'yearly', period_start: '2026-01-01' }))).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
      label: '2026',
    });
  });
});

describe('budgetItemProgress', () => {
  it('sums spend within the period against the planned amount', () => {
    const [progress] = budgetItemProgress(
      [item({ planned_amount_minor: 100_000 })],
      [transaction({ amount_minor: 30_000 }), transaction({ amount_minor: 20_000 })],
      budget()
    );

    expect(progress!.spentMinor).toBe(50_000);
    expect(progress!.availableMinor).toBe(100_000);
    expect(progress!.remainingMinor).toBe(50_000);
    expect(progress!.progress).toBeCloseTo(0.5);
  });

  it('adds carried-over money to what is available', () => {
    const [progress] = budgetItemProgress(
      [item({ planned_amount_minor: 100_000, carried_over_minor: 20_000 })],
      [],
      budget()
    );

    expect(progress!.availableMinor).toBe(120_000);
    expect(progress!.remainingMinor).toBe(120_000);
  });

  it('reports over 100% progress without clamping when overspent', () => {
    const [progress] = budgetItemProgress(
      [item({ planned_amount_minor: 100_000 })],
      [transaction({ amount_minor: 150_000 })],
      budget()
    );

    expect(progress!.remainingMinor).toBe(-50_000);
    expect(progress!.progress).toBeCloseTo(1.5);
  });

  it('ignores spend in a different category, currency or outside the period', () => {
    const [progress] = budgetItemProgress(
      [item({ category_id: 'food', planned_amount_minor: 100_000 })],
      [
        transaction({ category_id: 'rent', amount_minor: 40_000 }),
        transaction({ category_id: 'food', currency: 'AUD', amount_minor: 40_000 }),
        transaction({ category_id: 'food', transaction_date: '2026-06-30', amount_minor: 40_000 }),
        transaction({ category_id: 'food', transaction_type: 'income', amount_minor: 40_000 }),
      ],
      budget()
    );

    expect(progress!.spentMinor).toBe(0);
  });
});

describe('budgetTotals', () => {
  it('adds up every line item', () => {
    const progress = budgetItemProgress(
      [item({ category_id: 'food', planned_amount_minor: 100_000 }), item({ id: 'item-2', category_id: 'rent', planned_amount_minor: 200_000 })],
      [transaction({ category_id: 'food', amount_minor: 30_000 }), transaction({ category_id: 'rent', amount_minor: 250_000 })],
      budget()
    );

    expect(budgetTotals(progress)).toEqual({
      plannedMinor: 300_000,
      spentMinor: 280_000,
      remainingMinor: 20_000,
    });
  });
});
