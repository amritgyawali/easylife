import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import type { Database } from '@/types/database';
import type { IsoDate } from '@/utils/date';

export type ExchangeRateRow = Database['public']['Tables']['exchange_rates']['Row'];

export const exchangeRateKeys = {
  all: (userId: string) => ['exchange-rates', userId] as const,
  list: (userId: string) => ['exchange-rates', userId, 'list'] as const,
};

/**
 * Every rate the user has recorded, newest first.
 *
 * The whole set is small (a handful of pairs), and conversion needs to pick
 * the most recent rate on or before a given date, so it's fetched once and
 * searched in memory by `findRate`.
 */
export function useExchangeRates() {
  const userId = useUserId();

  return useQuery({
    queryKey: exchangeRateKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('exchange_rates')
          .select('*')
          .eq('user_id', userId)
          .order('as_of_date', { ascending: false })
          .limit(200)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface ExchangeRateInput {
  fromCurrency: string;
  toCurrency: string;
  /** Units of `toCurrency` per one unit of `fromCurrency`. */
  rate: number;
  asOfDate: IsoDate;
}

export function useSaveExchangeRate() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExchangeRateInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      // Upsert on the table's own unique key so re-entering today's rate
      // corrects it rather than stacking duplicate rows for the same day.
      unwrapVoid(
        await supabase.from('exchange_rates').upsert(
          {
            user_id: owner,
            from_currency: input.fromCurrency.toUpperCase(),
            to_currency: input.toCurrency.toUpperCase(),
            rate: input.rate,
            as_of_date: input.asOfDate,
            source: 'manual',
          },
          { onConflict: 'user_id,from_currency,to_currency,as_of_date' }
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exchangeRateKeys.all(userId) }),
  });
}

export function useDeleteExchangeRate() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('exchange_rates').delete().eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exchangeRateKeys.all(userId) }),
  });
}
