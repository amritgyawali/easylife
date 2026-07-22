import { useMemo } from 'react';

import { useToday } from '@/hooks/useToday';
import { useProfile } from '@/features/auth/useProfile';
import { REGIONAL_DEFAULTS } from '@/constants/app';
import { useAccountBalances } from '@/features/finance/use-balances';
import { useExchangeRates } from '@/features/finance/exchange-rates-api';
import { usePortfolio } from '@/features/investments/api';
import { portfolioTotals } from '@/features/investments/portfolio';
import { useLoansWithEvents } from '@/features/loans/api';
import { outstandingMinor } from '@/features/loans/loan-math';
import { convertNetWorth, netWorthBreakdown } from '@/features/networth/net-worth';
import type { ExchangeRate } from '@/features/finance/currency';

/**
 * Assembles net worth from every module that holds value.
 *
 * The composition lives in a pure module (`net-worth.ts`); this hook only
 * gathers the inputs. Loans in a settled state are excluded — a repaid loan
 * is no longer an asset, and a cancelled one never was.
 */
export function useNetWorth() {
  const { today } = useToday();
  const { data: profile } = useProfile();
  const balances = useAccountBalances();
  const portfolio = usePortfolio();
  const loans = useLoansWithEvents();
  const ratesQuery = useExchangeRates();

  const targetCurrency = profile?.profile.default_currency ?? REGIONAL_DEFAULTS.primaryCurrency;

  const breakdown = useMemo(() => {
    const investments = portfolioTotals(portfolio.data);
    const investmentTotals = new Map(investments.map((total) => [total.currency, total.currentValueMinor]));
    const unvaluedAssetCount = investments.reduce((sum, total) => sum + total.unvaluedAssetCount, 0);

    const lentTotals = new Map<string, number>();
    const borrowedTotals = new Map<string, number>();

    for (const { loan, events } of loans.data) {
      if (loan.status === 'cancelled' || loan.status === 'draft') continue;

      const outstanding = outstandingMinor(loan, events);
      if (outstanding === 0) continue;

      const target = loan.direction === 'lent' ? lentTotals : borrowedTotals;
      target.set(loan.currency, (target.get(loan.currency) ?? 0) + outstanding);
    }

    return netWorthBreakdown({
      accountTotals: balances.netWorthByCurrency,
      investmentTotals,
      lentTotals,
      borrowedTotals,
      unvaluedAssetCount,
    });
  }, [balances.netWorthByCurrency, portfolio.data, loans.data]);

  const converted = useMemo(
    () => convertNetWorth(breakdown, targetCurrency, (ratesQuery.data ?? []) as ExchangeRate[], today),
    [breakdown, targetCurrency, ratesQuery.data, today]
  );

  return {
    breakdown,
    converted,
    targetCurrency,
    isLoading: balances.isLoading || portfolio.isLoading || loans.isLoading,
    error: balances.error ?? portfolio.error ?? loans.error,
    refetch: () => {
      balances.refetch();
      portfolio.refetch();
      loans.refetch();
      void ratesQuery.refetch();
    },
  };
}
