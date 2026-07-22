import {
  accountBalance,
  buildLedgerLegs,
  isBalanced,
  signedAmountForAccount,
} from '@/features/finance/ledger';
import { AppError } from '@/utils/errors';

const ACCOUNT = 'account-1';
const DESTINATION = 'account-2';
const SYSTEM = 'system-npr';

describe('buildLedgerLegs', () => {
  it('posts an expense as money out of the account and into the clearing account', () => {
    const legs = buildLedgerLegs({
      kind: 'expense',
      amountMinor: 50_000,
      accountId: ACCOUNT,
      systemAccountId: SYSTEM,
    });

    expect(legs).toEqual([
      { accountId: ACCOUNT, amountMinor: -50_000 },
      { accountId: SYSTEM, amountMinor: 50_000 },
    ]);
  });

  it('posts income as money into the account', () => {
    const legs = buildLedgerLegs({
      kind: 'income',
      amountMinor: 120_000,
      accountId: ACCOUNT,
      systemAccountId: SYSTEM,
    });

    expect(legs[0]).toEqual({ accountId: ACCOUNT, amountMinor: 120_000 });
  });

  it('moves a transfer between two real accounts and never touches the clearing account', () => {
    const legs = buildLedgerLegs({
      kind: 'transfer',
      amountMinor: 10_000,
      accountId: ACCOUNT,
      destinationAccountId: DESTINATION,
      systemAccountId: null,
    });

    expect(legs).toEqual([
      { accountId: ACCOUNT, amountMinor: -10_000 },
      { accountId: DESTINATION, amountMinor: 10_000 },
    ]);
  });

  // The database enforces this too (assert_ledger_balanced), so a regression
  // here would surface as a failed write rather than corrupt data — but it
  // would still be a broken feature.
  it.each(['income', 'expense', 'transfer'] as const)('always balances to zero for %s', (kind) => {
    const legs = buildLedgerLegs({
      kind,
      amountMinor: 77_777,
      accountId: ACCOUNT,
      destinationAccountId: DESTINATION,
      systemAccountId: SYSTEM,
    });

    expect(isBalanced(legs)).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    expect(() =>
      buildLedgerLegs({ kind: 'expense', amountMinor: 0, accountId: ACCOUNT, systemAccountId: SYSTEM })
    ).toThrow(AppError);
    expect(() =>
      buildLedgerLegs({ kind: 'expense', amountMinor: -1, accountId: ACCOUNT, systemAccountId: SYSTEM })
    ).toThrow(AppError);
  });

  it('rejects a non-integer amount, which would never be valid minor units', () => {
    expect(() =>
      buildLedgerLegs({ kind: 'income', amountMinor: 10.5, accountId: ACCOUNT, systemAccountId: SYSTEM })
    ).toThrow(AppError);
  });

  it('rejects a transfer with a missing or self-referencing destination', () => {
    expect(() =>
      buildLedgerLegs({
        kind: 'transfer',
        amountMinor: 1_000,
        accountId: ACCOUNT,
        destinationAccountId: null,
        systemAccountId: null,
      })
    ).toThrow(AppError);

    expect(() =>
      buildLedgerLegs({
        kind: 'transfer',
        amountMinor: 1_000,
        accountId: ACCOUNT,
        destinationAccountId: ACCOUNT,
        systemAccountId: null,
      })
    ).toThrow(AppError);
  });

  it('rejects income or expense with no clearing account to balance against', () => {
    expect(() =>
      buildLedgerLegs({
        kind: 'expense',
        amountMinor: 1_000,
        accountId: ACCOUNT,
        systemAccountId: null,
      })
    ).toThrow(AppError);
  });
});

describe('accountBalance', () => {
  it('adds every entry to the opening balance', () => {
    const legs = [
      { accountId: ACCOUNT, amountMinor: -50_000 },
      { accountId: ACCOUNT, amountMinor: 120_000 },
    ];

    expect(accountBalance(100_000, legs)).toBe(170_000);
  });

  it('returns the opening balance when nothing has been posted', () => {
    expect(accountBalance(25_000, [])).toBe(25_000);
  });

  it('can go negative, which is correct for a credit card or overdraft', () => {
    expect(accountBalance(0, [{ accountId: ACCOUNT, amountMinor: -5_000 }])).toBe(-5_000);
  });
});

describe('signedAmountForAccount', () => {
  const legs = [
    { accountId: ACCOUNT, amountMinor: -10_000 },
    { accountId: DESTINATION, amountMinor: 10_000 },
  ];

  it('reports the transfer as an outflow from the source account', () => {
    expect(signedAmountForAccount(legs, ACCOUNT)).toBe(-10_000);
  });

  it('reports the same transfer as an inflow to the destination', () => {
    expect(signedAmountForAccount(legs, DESTINATION)).toBe(10_000);
  });

  it('returns null for an account the transaction never touched', () => {
    expect(signedAmountForAccount(legs, 'unrelated')).toBeNull();
  });
});
