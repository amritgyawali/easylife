import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { toMinorUnits } from '@/utils/money';
import type { AccountType, Database } from '@/types/database';

export type AccountRow = Database['public']['Tables']['accounts']['Row'];

export const accountKeys = {
  all: (userId: string) => ['accounts', userId] as const,
  list: (userId: string) => ['accounts', userId, 'list'] as const,
  balances: (userId: string) => ['accounts', userId, 'balances'] as const,
};

/** Account types offered when creating an account by hand. */
export const SELECTABLE_ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'savings', label: 'Savings' },
  { value: 'digital_wallet', label: 'Wallet' },
  { value: 'cooperative', label: 'Co-operative' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'fixed_deposit', label: 'Fixed deposit' },
  { value: 'other_asset', label: 'Other asset' },
  { value: 'other_liability', label: 'Other liability' },
];

/**
 * All accounts, including the hidden per-currency system accounts.
 *
 * The system rows are fetched rather than filtered in SQL because posting a
 * transaction needs their ids; every user-facing list uses `useAccounts()`
 * below, which excludes them.
 */
export function useAllAccounts() {
  const userId = useUserId();

  return useQuery({
    queryKey: accountKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/** Real, user-owned accounts — never the ledger's internal clearing accounts. */
export function useAccounts() {
  const query = useAllAccounts();

  const data = useMemo(() => query.data?.filter((account) => !account.is_system), [query.data]);

  return { ...query, data };
}

export interface AccountInput {
  name: string;
  accountType: AccountType;
  currency: string;
  /** Decimal major units as typed by the user, e.g. "1250.50". */
  openingBalance: string;
  institution?: string | null;
  includeInNetWorth?: boolean;
}

export function useCreateAccount() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('accounts').insert({
          user_id: owner,
          name: input.name.trim(),
          account_type: input.accountType,
          currency: input.currency,
          opening_balance_minor: toMinorUnits(input.openingBalance || '0', input.currency),
          institution: input.institution?.trim() || null,
          include_in_net_worth: input.includeInNetWorth ?? true,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all(userId) }),
  });
}

export function useUpdateAccount() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: AccountInput & { id: string }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('accounts')
          .update({
            name: input.name.trim(),
            account_type: input.accountType,
            currency: input.currency,
            opening_balance_minor: toMinorUnits(input.openingBalance || '0', input.currency),
            institution: input.institution?.trim() || null,
            include_in_net_worth: input.includeInNetWorth ?? true,
          })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all(userId) }),
  });
}

export function useArchiveAccount() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      // Archived, not deleted: an account with posted transactions cannot be
      // removed without orphaning ledger history (the FK is `on delete
      // restrict`), and that history is the point of a ledger.
      unwrapVoid(
        await supabase
          .from('accounts')
          .update({ archived_at: new Date().toISOString(), is_active: false })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all(userId) }),
  });
}

/**
 * Finds — creating on first use — the clearing account that carries the
 * income/expense side of this currency's ledger entries.
 *
 * Created lazily rather than at sign-up because most users only ever transact
 * in one currency, and an empty "Income & Expenses (AUD)" row for a currency
 * they never touch is clutter in the data even if it's hidden in the UI. The
 * partial unique index in `0014_system_accounts.sql` makes the race between
 * two devices doing this at once safe.
 */
export async function getOrCreateSystemAccount(userId: string, currency: string): Promise<string> {
  const supabase = getSupabaseClient();

  const existing = unwrap(
    await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('currency', currency)
      .eq('is_system', true)
      .is('deleted_at', null)
      .limit(1)
  );

  if (existing.length > 0) return existing[0]!.id;

  // The id is generated here rather than read back from the insert: it
  // avoids a second round-trip, and client-generated UUIDs are what the
  // offline engine will need anyway (see OFFLINE_SYNC.md).
  const id = randomUUID();

  unwrapVoid(
    await supabase.from('accounts').insert({
      id,
      user_id: userId,
      name: `Income & Expenses (${currency})`,
      account_type: 'other_liability',
      currency,
      is_system: true,
      include_in_net_worth: false,
      is_active: false,
    })
  );

  return id;
}
