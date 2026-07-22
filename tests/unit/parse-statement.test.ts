import { parseDelimited } from '@/features/imports/delimited';
import { guessColumnMapping } from '@/features/imports/normalise';
import { parseRow, parseStatement, worstConfidence } from '@/features/imports/parse-statement';
import { findContinuityBreaks, findOutOfPeriodRows, reconcile } from '@/features/imports/reconcile';
import { findDuplicates, findInternalDuplicates } from '@/features/imports/duplicates';

const HEADER = ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'];
const MAPPING = guessColumnMapping(HEADER);
const OPTIONS = { mapping: MAPPING, currency: 'NPR' };

describe('parseRow', () => {
  it('reads a debit as money out', () => {
    const row = parseRow(['2026-07-01', 'Tea', '50.00', '', '950.00'], HEADER, 1, OPTIONS);

    expect(row.signedAmountMinor).toBe(-5_000);
    expect(row.debitMinor).toBe(5_000);
    expect(row.runningBalanceMinor).toBe(95_000);
  });

  it('reads a credit as money in', () => {
    const row = parseRow(['2026-07-01', 'Salary', '', '5000.00', '5950.00'], HEADER, 1, OPTIONS);
    expect(row.signedAmountMinor).toBe(500_000);
  });

  it('takes the sign from a single amount column', () => {
    const header = ['Date', 'Description', 'Amount'];
    const row = parseRow(['2026-07-01', 'Tea', '-50.00'], header, 1, {
      ...OPTIONS,
      mapping: guessColumnMapping(header),
    });

    expect(row.signedAmountMinor).toBe(-5_000);
  });

  // Both columns populated means the layout was misread, not a real row.
  it('flags a row with both a debit and a credit', () => {
    const row = parseRow(['2026-07-01', 'Odd', '50.00', '20.00', ''], HEADER, 1, OPTIONS);

    expect(row.rowConfidence).toBe('low');
    expect(row.issues.join(' ')).toContain('Both debit and credit');
  });

  it('marks a missing amount rather than assuming zero', () => {
    const row = parseRow(['2026-07-01', 'Nothing', '', '', ''], HEADER, 1, OPTIONS);

    expect(row.signedAmountMinor).toBeNull();
    expect(row.fieldConfidence.amount).toBe('missing');
  });

  it('flags an unreadable date', () => {
    const row = parseRow(['whenever', 'Tea', '50.00', '', ''], HEADER, 1, OPTIONS);

    expect(row.transactionDate).toBeNull();
    expect(row.fieldConfidence.transaction_date).toBe('low');
  });

  it('is more confident about a date when the profile states its format', () => {
    const ambiguous = parseRow(['03/04/2026', 'Tea', '50.00', '', ''], HEADER, 1, OPTIONS);
    const stated = parseRow(['03/04/2026', 'Tea', '50.00', '', ''], HEADER, 1, {
      ...OPTIONS,
      dateFormat: 'DD/MM/YYYY',
    });

    expect(ambiguous.fieldConfidence.transaction_date).toBe('medium');
    expect(stated.fieldConfidence.transaction_date).toBe('high');
  });

  it('normalises the description for matching', () => {
    const row = parseRow(
      ['2026-07-01', 'POS PURCHASE 998812 BHATBHATENI', '50.00', '', ''],
      HEADER,
      1,
      OPTIONS
    );

    expect(row.normalizedDescription).toBe('bhatbhateni');
  });
});

describe('worstConfidence', () => {
  // Averaging would let a confidently-read description hide an unreadable
  // amount, which is exactly the row that needs attention.
  it('takes the weakest field, not the average', () => {
    expect(worstConfidence({ a: 'high', b: 'high', c: 'missing' })).toBe('missing');
    expect(worstConfidence({ a: 'high', b: 'medium' })).toBe('medium');
    expect(worstConfidence({ a: 'high' })).toBe('high');
  });
});

describe('parseStatement', () => {
  const csv = [
    'Date,Particulars,Debit,Credit,Balance',
    '2026-07-01,Opening tea,50.00,,950.00',
    '2026-07-05,Salary,,5000.00,5950.00',
    '2026-07-10,Rent,2000.00,,3950.00',
  ].join('\n');

  const statement = parseStatement(parseDelimited(csv), OPTIONS);

  it('parses every row', () => {
    expect(statement.rows).toHaveLength(3);
    expect(statement.unparsedCount).toBe(0);
  });

  it('derives the statement period from the dates seen', () => {
    expect(statement.periodStart).toBe('2026-07-01');
    expect(statement.periodEnd).toBe('2026-07-10');
  });
});

describe('reconcile', () => {
  const rows = parseStatement(
    parseDelimited(
      [
        'Date,Particulars,Debit,Credit,Balance',
        '2026-07-01,Tea,50.00,,950.00',
        '2026-07-05,Salary,,5000.00,5950.00',
      ].join('\n')
    ),
    OPTIONS
  ).rows;

  it('balances when the arithmetic works out', () => {
    // 1000.00 opening - 50.00 + 5000.00 = 5950.00
    const result = reconcile(rows, 100_000, 595_000);

    expect(result.status).toBe('balanced');
    expect(result.differenceMinor).toBe(0);
  });

  it('reports the exact difference on a mismatch', () => {
    const result = reconcile(rows, 100_000, 600_000);

    expect(result.status).toBe('mismatch');
    expect(result.differenceMinor).toBe(5_000);
  });

  // Claiming a statement reconciles when there was nothing to reconcile
  // against would be a false assurance.
  it('stays pending when a balance is missing', () => {
    expect(reconcile(rows, null, 595_000).status).toBe('pending');
    expect(reconcile(rows, 100_000, null).status).toBe('pending');
  });

  it('totals credits and debits separately', () => {
    const result = reconcile(rows, 100_000, 595_000);

    expect(result.totalCreditsMinor).toBe(500_000);
    expect(result.totalDebitsMinor).toBe(5_000);
  });
});

describe('findContinuityBreaks', () => {
  // A break names the exact row, which the statement-level check can't do.
  it('finds the row where the running balance stops following', () => {
    const rows = parseStatement(
      parseDelimited(
        [
          'Date,Particulars,Debit,Credit,Balance',
          '2026-07-01,Tea,50.00,,950.00',
          '2026-07-02,Snack,50.00,,700.00',
        ].join('\n')
      ),
      OPTIONS
    ).rows;

    const breaks = findContinuityBreaks(rows);

    expect(breaks).toHaveLength(1);
    expect(breaks[0]!.rowNumber).toBe(2);
    expect(breaks[0]!.expectedMinor).toBe(90_000);
    expect(breaks[0]!.differenceMinor).toBe(-20_000);
  });

  it('reports nothing when the chain holds', () => {
    const rows = parseStatement(
      parseDelimited(
        [
          'Date,Particulars,Debit,Credit,Balance',
          '2026-07-01,Tea,50.00,,950.00',
          '2026-07-02,Snack,50.00,,900.00',
        ].join('\n')
      ),
      OPTIONS
    ).rows;

    expect(findContinuityBreaks(rows)).toEqual([]);
  });
});

describe('findOutOfPeriodRows', () => {
  it('flags a date outside the stated period', () => {
    const rows = parseStatement(
      parseDelimited(['Date,Particulars,Debit,Credit,Balance', '2025-01-01,Old,50.00,,'].join('\n')),
      OPTIONS
    ).rows;

    expect(findOutOfPeriodRows(rows, '2026-07-01', '2026-07-31')).toHaveLength(1);
  });

  it('reports nothing when no period is known', () => {
    expect(findOutOfPeriodRows([], null, null)).toEqual([]);
  });
});

describe('findDuplicates', () => {
  const rows = parseStatement(
    parseDelimited(
      [
        'Date,Particulars,Reference,Debit,Credit',
        '2026-07-01,Tea,REF123,50.00,',
        '2026-07-05,Rent,,2000.00,',
      ].join('\n')
    ),
    { ...OPTIONS, mapping: guessColumnMapping(['Date', 'Particulars', 'Reference', 'Debit', 'Credit']) }
  ).rows;

  it('matches decisively on a shared reference', () => {
    const matches = findDuplicates(rows, [
      {
        id: 'txn-1',
        transaction_date: '2026-06-28',
        amount_minor: 5_000,
        transaction_type: 'expense',
        description: 'Tea',
        reference: 'REF123',
      },
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.strength).toBe('exact');
  });

  it('matches on amount within a couple of days', () => {
    const matches = findDuplicates(rows, [
      {
        id: 'txn-2',
        transaction_date: '2026-07-06',
        amount_minor: 200_000,
        transaction_type: 'expense',
        description: 'Rent',
        reference: null,
      },
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0]!.strength).toBe('likely');
  });

  it('does not match beyond the date tolerance', () => {
    const matches = findDuplicates(rows, [
      {
        id: 'txn-3',
        transaction_date: '2026-08-01',
        amount_minor: 200_000,
        transaction_type: 'expense',
        description: 'Rent',
        reference: null,
      },
    ]);

    expect(matches).toEqual([]);
  });

  // Two genuinely identical payments must not both point at one ledger row —
  // the second is real money that would otherwise be dropped.
  it('claims each existing transaction only once', () => {
    const twice = parseStatement(
      parseDelimited(
        ['Date,Particulars,Debit,Credit', '2026-07-05,Bus fare,50.00,', '2026-07-05,Bus fare,50.00,'].join(
          '\n'
        )
      ),
      { ...OPTIONS, mapping: guessColumnMapping(['Date', 'Particulars', 'Debit', 'Credit']) }
    ).rows;

    const matches = findDuplicates(twice, [
      {
        id: 'txn-4',
        transaction_date: '2026-07-05',
        amount_minor: 5_000,
        transaction_type: 'expense',
        description: 'Bus fare',
        reference: null,
      },
    ]);

    expect(matches).toHaveLength(1);
  });
});

describe('findInternalDuplicates', () => {
  it('groups rows that repeat within the same import', () => {
    const rows = parseStatement(
      parseDelimited(
        [
          'Date,Particulars,Debit,Credit',
          '2026-07-05,Rent,2000.00,',
          '2026-07-05,Rent,2000.00,',
          '2026-07-06,Tea,50.00,',
        ].join('\n')
      ),
      { ...OPTIONS, mapping: guessColumnMapping(['Date', 'Particulars', 'Debit', 'Credit']) }
    ).rows;

    expect(findInternalDuplicates(rows)).toEqual([[1, 2]]);
  });
});
