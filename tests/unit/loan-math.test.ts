import {
  derivedStatus,
  exposureByCounterparty,
  outstandingMinor,
  repaymentProgress,
  simpleInterestMinor,
  totalRepaidMinor,
  type LoanEventLike,
  type LoanLike,
} from '@/features/loans/loan-math';

const TODAY = '2026-07-23';

function loan(overrides: Partial<LoanLike> = {}): LoanLike {
  return { principal_minor: 100_000, due_date: null, status: 'active', ...overrides };
}

function event(
  event_type: LoanEventLike['event_type'],
  amount_minor: number,
  extras: Partial<LoanEventLike> = {}
): LoanEventLike {
  return { event_type, amount_minor, event_date: '2026-07-10', ...extras };
}

describe('outstandingMinor', () => {
  it('is the full principal before anything is repaid', () => {
    expect(outstandingMinor(loan(), [])).toBe(100_000);
  });

  it('shrinks by repayments', () => {
    expect(outstandingMinor(loan(), [event('repayment', 30_000)])).toBe(70_000);
  });

  it('shrinks by write-offs too', () => {
    expect(outstandingMinor(loan(), [event('write_off', 40_000)])).toBe(60_000);
  });

  it('grows by accrued interest', () => {
    expect(outstandingMinor(loan(), [event('interest_accrual', 5_000)])).toBe(105_000);
  });

  it('ignores non-monetary events', () => {
    expect(outstandingMinor(loan(), [event('note', 0), event('reminder_sent', 0)])).toBe(100_000);
  });

  it('ignores soft-deleted events', () => {
    expect(outstandingMinor(loan(), [event('repayment', 30_000, { deleted_at: '2026-07-11' })])).toBe(
      100_000
    );
  });

  // "Outstanding" means what is still owed; nobody means -5,000 by that.
  it('clamps at zero when overpaid', () => {
    expect(outstandingMinor(loan(), [event('repayment', 150_000)])).toBe(0);
  });
});

describe('totalRepaidMinor', () => {
  it('counts only repayments, not write-offs', () => {
    expect(totalRepaidMinor([event('repayment', 20_000), event('write_off', 10_000)])).toBe(20_000);
  });
});

describe('repaymentProgress', () => {
  it('is zero on a fresh loan and one when fully repaid', () => {
    expect(repaymentProgress(loan(), [])).toBe(0);
    expect(repaymentProgress(loan(), [event('repayment', 100_000)])).toBe(1);
  });

  it('counts a write-off as settled', () => {
    expect(repaymentProgress(loan(), [event('write_off', 50_000)])).toBe(0.5);
  });

  it('accounts for interest in the denominator', () => {
    const events = [event('interest_accrual', 100_000), event('repayment', 100_000)];
    expect(repaymentProgress(loan(), events)).toBe(0.5);
  });

  it('never exceeds one', () => {
    expect(repaymentProgress(loan(), [event('repayment', 500_000)])).toBe(1);
  });
});

describe('derivedStatus', () => {
  it('is active with nothing recorded', () => {
    expect(derivedStatus(loan(), [], TODAY)).toBe('active');
  });

  it('is partially_repaid once something comes back', () => {
    expect(derivedStatus(loan(), [event('repayment', 10_000)], TODAY)).toBe('partially_repaid');
  });

  it('is repaid when the balance reaches zero', () => {
    expect(derivedStatus(loan(), [event('repayment', 100_000)], TODAY)).toBe('repaid');
  });

  it('is written_off when it was cleared without any repayment', () => {
    expect(derivedStatus(loan(), [event('write_off', 100_000)], TODAY)).toBe('written_off');
  });

  it('is overdue once the due date has passed with money still owed', () => {
    expect(derivedStatus(loan({ due_date: '2026-07-20' }), [], TODAY)).toBe('overdue');
  });

  // Matches how tasks treat due dates: the day isn't over yet.
  it('is not overdue on the due date itself', () => {
    expect(derivedStatus(loan({ due_date: TODAY }), [], TODAY)).toBe('active');
  });

  it('prefers repaid over overdue when the debt is settled late', () => {
    const settled = [event('repayment', 100_000)];
    expect(derivedStatus(loan({ due_date: '2026-07-01' }), settled, TODAY)).toBe('repaid');
  });

  // These say something about the loan's existence, not its balance, so
  // recomputing them from money would resurrect a cancelled loan.
  it.each(['cancelled', 'draft'] as const)('passes %s through untouched', (status) => {
    expect(derivedStatus(loan({ status }), [event('repayment', 100_000)], TODAY)).toBe(status);
  });
});

describe('simpleInterestMinor', () => {
  it('accrues nothing over zero or negative time', () => {
    expect(simpleInterestMinor(100_000, 2, 'monthly', TODAY, TODAY)).toBe(0);
    expect(simpleInterestMinor(100_000, 2, 'monthly', TODAY, '2026-07-01')).toBe(0);
  });

  it('accrues one period of interest over a month', () => {
    // 2% of 1,000.00 over 30 days.
    expect(simpleInterestMinor(100_000, 2, 'monthly', '2026-06-23', '2026-07-23')).toBe(2_000);
  });

  it('accrues a year of interest over a year', () => {
    expect(simpleInterestMinor(100_000, 12, 'yearly', '2025-07-23', '2026-07-23')).toBe(12_000);
  });

  it('is zero at a zero rate', () => {
    expect(simpleInterestMinor(100_000, 0, 'monthly', '2026-06-23', TODAY)).toBe(0);
  });

  it('returns whole minor units, never a fraction', () => {
    expect(Number.isInteger(simpleInterestMinor(100_003, 2.7, 'monthly', '2026-07-01', TODAY))).toBe(true);
  });
});

describe('exposureByCounterparty', () => {
  const base = { loan: loan(), events: [] as LoanEventLike[] };

  it('nets lending against borrowing for the same person', () => {
    const result = exposureByCounterparty([
      { ...base, counterparty_id: 'ram', currency: 'NPR', direction: 'lent' },
      {
        ...base,
        counterparty_id: 'ram',
        currency: 'NPR',
        direction: 'borrowed',
        loan: loan({ principal_minor: 40_000 }),
      },
    ]);

    expect(result).toEqual([
      {
        counterpartyId: 'ram',
        currency: 'NPR',
        owedToUserMinor: 100_000,
        owedByUserMinor: 40_000,
        netMinor: 60_000,
      },
    ]);
  });

  it('is negative when the user owes on balance', () => {
    const result = exposureByCounterparty([
      { ...base, counterparty_id: 'sita', currency: 'NPR', direction: 'borrowed' },
    ]);

    expect(result[0]!.netMinor).toBe(-100_000);
  });

  // Netting NPR against AUD without a rate would be meaningless.
  it('keeps currencies apart', () => {
    const result = exposureByCounterparty([
      { ...base, counterparty_id: 'ram', currency: 'NPR', direction: 'lent' },
      { ...base, counterparty_id: 'ram', currency: 'AUD', direction: 'lent' },
    ]);

    expect(result).toHaveLength(2);
  });

  it('excludes cancelled and draft loans', () => {
    const result = exposureByCounterparty([
      {
        ...base,
        counterparty_id: 'ram',
        currency: 'NPR',
        direction: 'lent',
        loan: loan({ status: 'cancelled' }),
      },
    ]);

    expect(result).toEqual([]);
  });
});
