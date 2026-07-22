import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import type { Database } from '@/types/database';

export type CategoryRow = Database['public']['Tables']['categories']['Row'];

/** `categories.kind` is a text column, not an enum — these are its values. */
export type CategoryKind = 'income' | 'expense' | 'transfer';

export const categoryKeys = {
  all: (userId: string) => ['categories', userId] as const,
  list: (userId: string) => ['categories', userId, 'list'] as const,
};

export function useCategories() {
  const userId = useUserId();

  return useQuery({
    queryKey: categoryKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .is('archived_at', null)
          .order('kind')
          .order('name')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
}

export function useCreateCategory() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('categories')
          .insert({ user_id: owner, name: input.name.trim(), kind: input.kind })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) }),
  });
}

export function useUpdateCategory() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase.from('categories').update({ name: input.name.trim(), kind: input.kind }).eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) }),
  });
}

export function useArchiveCategory() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      // Archived rather than deleted so historical transactions keep the
      // category they were filed under — the FK is `on delete set null`, and
      // silently un-categorising past spending would corrupt every report.
      unwrapVoid(
        await supabase.from('categories').update({ archived_at: new Date().toISOString() }).eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) }),
  });
}

/**
 * Categories every personal-finance setup needs, offered as a one-tap
 * starting point on an empty Categories screen. Seeded from the client rather
 * than a SQL trigger so the list can be edited without a migration, and so a
 * user who wants their own taxonomy simply never taps the button.
 */
export const STARTER_CATEGORIES: CategoryInput[] = [
  { name: 'Salary', kind: 'income' },
  { name: 'Business income', kind: 'income' },
  { name: 'Gifts received', kind: 'income' },
  { name: 'Groceries', kind: 'expense' },
  { name: 'Eating out', kind: 'expense' },
  { name: 'Transport', kind: 'expense' },
  { name: 'Rent', kind: 'expense' },
  { name: 'Utilities', kind: 'expense' },
  { name: 'Mobile & internet', kind: 'expense' },
  { name: 'Health', kind: 'expense' },
  { name: 'Education', kind: 'expense' },
  { name: 'Household', kind: 'expense' },
  { name: 'Festivals & gifts', kind: 'expense' },
  { name: 'Other', kind: 'expense' },
];

export function useSeedStarterCategories() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('categories').insert(
          STARTER_CATEGORIES.map((category) => ({
            user_id: owner,
            name: category.name,
            kind: category.kind,
            is_system: true,
          }))
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) }),
  });
}
