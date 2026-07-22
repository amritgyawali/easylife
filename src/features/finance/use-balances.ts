import { useMemo } from 'react';

import { useAccounts, type AccountRow } from '@/features/finance/accounts-api';
import { useLedgerEntries } from '@/features/finance/transactions-api';

export interface AccountWithBalance {
  account: AccountRow;
  /** Opening balance plus every ledger entry against the account. */
  balanceMinor: number;
}

/**
 * Every visible account with its derived balance, plus net worth per currency.
 *
 * Balances are computed from `ledger_entries` rather than read from
 * `account_balance_snapshots`: that table is a cache with no client write
 * policy (see DATABASE.md), so reading it would show a number the app can
 * never keep current.
 */
export function useAccountBalances() {
  const accountsQuery = useAccounts();
  const entriesQuery = useLedgerEntries();

  const accounts = useMemo<AccountWithBalance[]>(() => {
    const totals = new Map<string, number>();
    for (const entry of entriesQuery.data ?? []) {
      totals.set(entry.account_id, (totals.get(entry.account_id) ?? 0) + entry.amount_minor);
    }

    return (accountsQuery.data ?? []).map((account) => ({
      account,
      balanceMinor: account.opening_balance_minor + (totals.get(account.id) ?? 0),
    }));
  }, [accountsQuery.data, entriesQuery.data]);

  /**
   * Totals are kept per currency rather than summed into one number: without
   * live exchange rates (Phase 4), adding NPR to AUD would produce a
   * confident-looking figure that means nothing.
   */
  const netWorthByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const { account, balanceMinor } of accounts) {
      if (!account.include_in_net_worth) continue;
      totals.set(account.currency, (totals.get(account.currency) ?? 0) + balanceMinor);
    }
    return totals;
  }, [accounts]);

  return {
    accounts,
    netWorthByCurrency,
    isLoading: accountsQuery.isLoading || entriesQuery.isLoading,
    isRefetching: accountsQuery.isRefetching || entriesQuery.isRefetching,
    error: accountsQuery.error ?? entriesQuery.error,
    refetch: () => {
      void accountsQuery.refetch();
      void entriesQuery.refetch();
    },
  };
}
