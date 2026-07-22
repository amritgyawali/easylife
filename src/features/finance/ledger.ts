import { AppError } from '@/utils/errors';
import type { TransactionType } from '@/types/database';

/**
 * Double-entry leg construction, kept pure and database-free so the rule that
 * every posted transaction balances to zero is unit-testable without a
 * Supabase round-trip.
 *
 * The invariant this file exists to satisfy is enforced in Postgres, not just
 * here (`assert_ledger_balanced` in `0008_ledger.sql`): for any transaction
 * with `status = 'confirmed'`, the sum of its entries must be exactly zero.
 * Getting it wrong doesn't corrupt data — it raises, and the write fails.
 *
 * Sign convention: an entry is positive when value flows **into** the account
 * and negative when it flows out, so an account's balance is simply its
 * opening balance plus the sum of its entries.
 */

/** The three transaction shapes the manual entry form can post. */
export type LedgerTransactionKind = 'income' | 'expense' | 'transfer';

export interface LedgerLeg {
  accountId: string;
  /** Signed minor units, native to the account's currency. */
  amountMinor: number;
}

export interface BuildLegsInput {
  kind: LedgerTransactionKind;
  /** Always positive — direction is expressed by `kind`, not by the sign. */
  amountMinor: number;
  /** The asset/liability account money leaves from or arrives in. */
  accountId: string;
  /** Required for a transfer: the account money arrives in. */
  destinationAccountId?: string | null;
  /**
   * Per-currency clearing account standing in for the income/expense side of
   * the entry. See `0014_system_accounts.sql` for why it exists. Not needed
   * for a transfer, where both legs are real accounts.
   */
  systemAccountId: string | null;
}

/**
 * Builds the balanced pair of entries for one transaction.
 *
 * Income and expense are two-legged against the system clearing account
 * rather than one-legged, because a single entry can never sum to zero and
 * the database would reject it.
 */
export function buildLedgerLegs(input: BuildLegsInput): LedgerLeg[] {
  const { kind, amountMinor, accountId, destinationAccountId, systemAccountId } = input;

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new AppError(
      'validation_failed',
      'Transaction amount must be a positive whole number of minor units'
    );
  }

  switch (kind) {
    case 'expense':
      return [
        { accountId, amountMinor: -amountMinor },
        { accountId: requireSystemAccount(systemAccountId), amountMinor },
      ];

    case 'income':
      return [
        { accountId, amountMinor },
        { accountId: requireSystemAccount(systemAccountId), amountMinor: -amountMinor },
      ];

    case 'transfer': {
      if (!destinationAccountId) {
        throw new AppError('validation_failed', 'A transfer needs a destination account');
      }
      if (destinationAccountId === accountId) {
        throw new AppError('validation_failed', 'A transfer needs two different accounts');
      }
      return [
        { accountId, amountMinor: -amountMinor },
        { accountId: destinationAccountId, amountMinor },
      ];
    }
  }
}

function requireSystemAccount(systemAccountId: string | null): string {
  if (!systemAccountId) {
    throw new AppError('validation_failed', 'Income and expense need a clearing account to balance against');
  }
  return systemAccountId;
}

/** True when a set of legs satisfies the database's zero-sum invariant. */
export function isBalanced(legs: LedgerLeg[]): boolean {
  return legs.reduce((total, leg) => total + leg.amountMinor, 0) === 0;
}

/** The `transaction_type` enum value stored on the header row for each kind. */
export const TRANSACTION_TYPE_FOR_KIND: Record<LedgerTransactionKind, TransactionType> = {
  income: 'income',
  expense: 'expense',
  transfer: 'transfer',
};

/**
 * An account's current balance: its opening balance plus every confirmed
 * entry against it.
 *
 * Mirrors `recompute_account_balance()` in SQL deliberately — the cached
 * `account_balance_snapshots` table has no client write policy, so the app
 * derives balances itself rather than reading a cache it isn't allowed to
 * refresh.
 */
export function accountBalance(openingBalanceMinor: number, legs: LedgerLeg[]): number {
  return legs.reduce((total, leg) => total + leg.amountMinor, openingBalanceMinor);
}

/**
 * Signs a transaction's amount from the perspective of one account, for
 * display in that account's history.
 *
 * Returns null for a transaction that doesn't touch the account at all.
 */
export function signedAmountForAccount(legs: LedgerLeg[], accountId: string): number | null {
  const relevant = legs.filter((leg) => leg.accountId === accountId);
  if (relevant.length === 0) return null;
  return relevant.reduce((total, leg) => total + leg.amountMinor, 0);
}
