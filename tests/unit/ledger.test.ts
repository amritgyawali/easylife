import {
  accountBalance,
  buildLedgerLegs,
  isBalanced,
  signedAmountForAccount,
  type LedgerLeg,
} from '@/features/finance/ledger';
import { AppError } from '@/utils/errors';

const ACCOUNT = 'account-1';
const DESTINATION = 'account-2';
const SYSTEM = 'system-npr';

function leg(accountId: string, amountMinor: number, currency = 'NPR'): LedgerLeg {
  return { accountId, amountMinor, currency, amountTransactionCurrencyMinor: amountMinor };
}

describe('buildLedgerLegs', () => {
  it('posts an expense as money out of the account and into the clearing account', () => {
    const legs = buildLedgerLegs({
      kind: 'expense',
      amountMinor: 50_000,
      currency: 'NPR',
      accountId: ACCOUNT,
      systemAccountId: SYSTEM,
    });

    expect(legs).toEqual([leg(ACCOUNT, -50_000), leg(SYSTEM, 50_000)]);
  });

  it('posts income as money into the account', () => {
    const legs = buildLedgerLegs({
      kind: 'income',
      amountMinor: 120_000,
      currency: 'NPR',
      accountId: ACCOUNT,
      systemAccountId: SYSTEM,
    });

    expect(legs[0]).toEqual(leg(ACCOUNT, 120_000));
  });

  it('moves a transfer between two real accounts and never touches the clearing account', () => {
    const legs = buildLedgerLegs({
      kind: 'transfer',
      amountMinor: 10_000,
      currency: 'NPR',
      accountId: ACCOUNT,
      destinationAccountId: DESTINATION,
      systemAccountId: null,
    });

    expect(legs).toEqual([leg(ACCOUNT, -10_000), leg(DESTINATION, 10_000)]);
  });

  // The database enforces this too (assert_ledger_balanced), so a regression
  // here would surface as a failed write rather than corrupt data — but it
  // would still be a broken feature.
  it.each(['income', 'expense', 'transfer'] as const)('always balances to zero for %s', (kind) => {
    const legs = buildLedgerLegs({
      kind,
      amountMinor: 77_777,
      currency: 'NPR',
      accountId: ACCOUNT,
      destinationAccountId: DESTINATION,
      systemAccountId: SYSTEM,
    });

    expect(isBalanced(legs)).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    expect(() =>
      buildLedgerLegs({
        kind: 'expense',
        amountMinor: 0,
        currency: 'NPR',
        accountId: ACCOUNT,
        systemAccountId: SYSTEM,
      })
    ).toThrow(AppError);
    expect(() =>
      buildLedgerLegs({
        kind: 'expense',
        amountMinor: -1,
        currency: 'NPR',
        accountId: ACCOUNT,
        systemAccountId: SYSTEM,
      })
    ).toThrow(AppError);
  });

  it('rejects a non-integer amount, which would never be valid minor units', () => {
    expect(() =>
      buildLedgerLegs({
        kind: 'income',
        amountMinor: 10.5,
        currency: 'NPR',
        accountId: ACCOUNT,
        systemAccountId: SYSTEM,
      })
    ).toThrow(AppError);
  });

  it('rejects a transfer with a missing or self-referencing destination', () => {
    expect(() =>
      buildLedgerLegs({
        kind: 'transfer',
        amountMinor: 1_000,
        currency: 'NPR',
        accountId: ACCOUNT,
        destinationAccountId: null,
        systemAccountId: null,
      })
    ).toThrow(AppError);

    expect(() =>
      buildLedgerLegs({
        kind: 'transfer',
        amountMinor: 1_000,
        currency: 'NPR',
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
        currency: 'NPR',
        accountId: ACCOUNT,
        systemAccountId: null,
      })
    ).toThrow(AppError);
  });
});

// This is the whole reason ledger_entries carries two amount columns: each
// account must move in its own currency while the balance check still sees
// two equal and opposite figures.
describe('buildLedgerLegs across currencies', () => {
  const legs = buildLedgerLegs({
    kind: 'transfer',
    amountMinor: 100_000, // NPR 1,000.00
    currency: 'NPR',
    accountId: ACCOUNT,
    destinationAccountId: DESTINATION,
    destinationCurrency: 'AUD',
    destinationAmountMinor: 1_150, // AUD 11.50
    systemAccountId: null,
  });

  it('debits the source in its own currency', () => {
    expect(legs[0]).toEqual({
      accountId: ACCOUNT,
      amountMinor: -100_000,
      currency: 'NPR',
      amountTransactionCurrencyMinor: -100_000,
    });
  });

  it('credits the destination in the destination currency', () => {
    expect(legs[1]).toEqual({
      accountId: DESTINATION,
      amountMinor: 1_150,
      currency: 'AUD',
      amountTransactionCurrencyMinor: 100_000,
    });
  });

  it('balances in the accounting currency even though the native amounts differ', () => {
    expect(isBalanced(legs)).toBe(true);
    expect(legs.reduce((total, row) => total + row.amountMinor, 0)).not.toBe(0);
  });

  it('rejects a non-positive converted amount', () => {
    expect(() =>
      buildLedgerLegs({
        kind: 'transfer',
        amountMinor: 100,
        currency: 'NPR',
        accountId: ACCOUNT,
        destinationAccountId: DESTINATION,
        destinationCurrency: 'AUD',
        destinationAmountMinor: 0,
        systemAccountId: null,
      })
    ).toThrow(AppError);
  });
});

describe('accountBalance', () => {
  it('adds every entry to the opening balance', () => {
    expect(accountBalance(100_000, [leg(ACCOUNT, -50_000), leg(ACCOUNT, 120_000)])).toBe(170_000);
  });

  it('returns the opening balance when nothing has been posted', () => {
    expect(accountBalance(25_000, [])).toBe(25_000);
  });

  it('can go negative, which is correct for a credit card or overdraft', () => {
    expect(accountBalance(0, [leg(ACCOUNT, -5_000)])).toBe(-5_000);
  });
});

describe('signedAmountForAccount', () => {
  const legs = [leg(ACCOUNT, -10_000), leg(DESTINATION, 10_000)];

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
