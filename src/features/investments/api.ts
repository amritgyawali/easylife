import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import { toMinorUnits } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import type { Database, InvestmentAssetType, InvestmentTxnType } from '@/types/database';
import type { InvestmentTransactionLike } from '@/features/investments/portfolio';

export type InvestmentAssetRow = Database['public']['Tables']['investment_assets']['Row'];
export type InvestmentTransactionRow = Database['public']['Tables']['investment_transactions']['Row'];

export const investmentKeys = {
  all: (userId: string) => ['investments', userId] as const,
  assets: (userId: string) => ['investments', userId, 'assets'] as const,
  transactions: (userId: string) => ['investments', userId, 'transactions'] as const,
};

export const SELECTABLE_ASSET_TYPES: { value: InvestmentAssetType; label: string }[] = [
  { value: 'share', label: 'Shares' },
  { value: 'mutual_fund', label: 'Mutual fund' },
  { value: 'fixed_deposit', label: 'Fixed deposit' },
  { value: 'gold', label: 'Gold' },
  { value: 'property', label: 'Property' },
  { value: 'business', label: 'Business' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'retirement_fund', label: 'Retirement fund' },
  { value: 'other', label: 'Other' },
];

export function useInvestmentAssets() {
  const userId = useUserId();

  return useQuery({
    queryKey: investmentKeys.assets(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('investment_assets')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .eq('is_archived', false)
          .order('name')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export function useInvestmentTransactions() {
  const userId = useUserId();

  return useQuery({
    queryKey: investmentKeys.transactions(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('investment_transactions')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('txn_date')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/** Assets with their transactions bucketed, which is how the portfolio maths wants them. */
export function usePortfolio() {
  const assetsQuery = useInvestmentAssets();
  const transactionsQuery = useInvestmentTransactions();

  const data = useMemo(() => {
    const byAsset = new Map<string, InvestmentTransactionRow[]>();
    for (const txn of transactionsQuery.data ?? []) {
      byAsset.set(txn.asset_id, [...(byAsset.get(txn.asset_id) ?? []), txn]);
    }

    return (assetsQuery.data ?? []).map((asset) => ({
      asset,
      transactions: (byAsset.get(asset.id) ?? []) as InvestmentTransactionLike[],
    }));
  }, [assetsQuery.data, transactionsQuery.data]);

  return {
    data,
    isLoading: assetsQuery.isLoading || transactionsQuery.isLoading,
    isRefetching: assetsQuery.isRefetching || transactionsQuery.isRefetching,
    error: assetsQuery.error ?? transactionsQuery.error,
    refetch: () => {
      void assetsQuery.refetch();
      void transactionsQuery.refetch();
    },
  };
}

export interface AssetInput {
  name: string;
  assetType: InvestmentAssetType;
  symbol?: string | null;
  institution?: string | null;
  currency: string;
}

export function useCreateAsset() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssetInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('investment_assets').insert({
          user_id: owner,
          name: input.name.trim(),
          asset_type: input.assetType,
          symbol: input.symbol?.trim() || null,
          institution: input.institution?.trim() || null,
          currency: input.currency,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all(userId) }),
  });
}

export function useArchiveAsset() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      // Archived, not deleted — the transaction history is the record of
      // what was actually bought and sold, and it outlives the holding.
      unwrapVoid(await supabase.from('investment_assets').update({ is_archived: true }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all(userId) }),
  });
}

export interface InvestmentTransactionInput {
  assetId: string;
  currency: string;
  txnType: InvestmentTxnType;
  txnDate: IsoDate;
  /** Units bought or sold; not meaningful for dividends, interest or fees. */
  quantity?: string | null;
  /** Total consideration in decimal major units. */
  amount: string;
  fees?: string | null;
  notes?: string | null;
}

export function useRecordInvestmentTransaction() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InvestmentTransactionInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const amountMinor = toMinorUnits(input.amount || '0', input.currency);
      const feesMinor = toMinorUnits(input.fees || '0', input.currency);
      const quantity = input.quantity ? Number(input.quantity) : null;

      if (amountMinor < 0) throw new AppError('validation_failed', 'Amount cannot be negative');
      if (quantity !== null && !Number.isFinite(quantity)) {
        throw new AppError('validation_failed', 'Enter a valid quantity');
      }
      if ((input.txnType === 'buy' || input.txnType === 'sell') && !quantity) {
        throw new AppError('validation_failed', 'A buy or sell needs a quantity');
      }

      unwrapVoid(
        await supabase.from('investment_transactions').insert({
          user_id: owner,
          asset_id: input.assetId,
          txn_type: input.txnType,
          txn_date: input.txnDate,
          quantity,
          amount_minor: amountMinor,
          fees_minor: feesMinor,
          currency: input.currency,
          notes: input.notes?.trim() || null,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all(userId) }),
  });
}

export interface ValuationInput {
  assetId: string;
  currency: string;
  /** Price per unit, decimal major units. */
  price: string;
  valuationDate: IsoDate;
}

/**
 * Records a manual price and mirrors it onto the asset.
 *
 * `investment_valuations` keeps the history; `investment_assets.current_price_minor`
 * plus `last_valuation_date` are the denormalised latest, which is what the
 * portfolio maths reads and what lets the UI state how stale a price is.
 */
export function useRecordValuation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ValuationInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const priceMinor = toMinorUnits(input.price, input.currency);
      if (priceMinor < 0) throw new AppError('validation_failed', 'Price cannot be negative');

      unwrapVoid(
        await supabase.from('investment_valuations').upsert(
          {
            user_id: owner,
            asset_id: input.assetId,
            valuation_date: input.valuationDate,
            price_minor: priceMinor,
            source: 'manual',
          },
          { onConflict: 'asset_id,valuation_date' }
        )
      );

      unwrapVoid(
        await supabase
          .from('investment_assets')
          .update({ current_price_minor: priceMinor, last_valuation_date: input.valuationDate })
          .eq('id', input.assetId)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all(userId) }),
  });
}
