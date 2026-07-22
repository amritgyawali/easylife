import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import type { Database } from '@/types/database';

export type CounterpartyRow = Database['public']['Tables']['counterparties']['Row'];

/** `counterparties.kind` is a text column — these are the values in use. */
export type CounterpartyKind = 'person' | 'business' | 'institution';

export const counterpartyKeys = {
  all: (userId: string) => ['counterparties', userId] as const,
  list: (userId: string) => ['counterparties', userId, 'list'] as const,
};

export function useCounterparties() {
  const userId = useUserId();

  return useQuery({
    queryKey: counterpartyKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('counterparties')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .eq('is_archived', false)
          .order('display_name')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface CounterpartyInput {
  displayName: string;
  kind: CounterpartyKind;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export function useCreateCounterparty() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CounterpartyInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('counterparties').insert({
          user_id: owner,
          display_name: input.displayName.trim(),
          kind: input.kind,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          notes: input.notes?.trim() || null,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: counterpartyKeys.all(userId) }),
  });
}

export function useUpdateCounterparty() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CounterpartyInput & { id: string }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('counterparties')
          .update({
            display_name: input.displayName.trim(),
            kind: input.kind,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            notes: input.notes?.trim() || null,
          })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: counterpartyKeys.all(userId) }),
  });
}

export function useArchiveCounterparty() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('counterparties').update({ is_archived: true }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: counterpartyKeys.all(userId) }),
  });
}
