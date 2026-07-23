import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import type { Database } from '@/types/database';

export type SyncConflictRow = Database['public']['Tables']['sync_conflicts']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export type ConflictChoice = 'kept_local' | 'kept_server' | 'merged';

export const syncKeys = {
  all: (userId: string) => ['sync', userId] as const,
  conflicts: (userId: string) => ['sync', userId, 'conflicts'] as const,
  notifications: (userId: string) => ['sync', userId, 'notifications'] as const,
};

/** Unresolved conflicts awaiting a human decision (see OFFLINE_SYNC.md). */
export function useSyncConflicts() {
  const userId = useUserId();

  return useQuery({
    queryKey: syncKeys.conflicts(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('sync_conflicts')
          .select('*')
          .eq('user_id', userId)
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/**
 * Records the user's choice for a conflict.
 *
 * Only the conflict log is closed out here; the winning payload is applied to
 * its own table by the caller (the sync engine / repository), because that
 * write must go through the same validation and ledger checks as any other
 * write to that table — resolving a conflict is not a licence to bypass them.
 */
export function useResolveConflict() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, choice }: { id: string; choice: ConflictChoice }) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase
          .from('sync_conflicts')
          .update({ resolution: choice, resolved_at: new Date().toISOString() })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: syncKeys.conflicts(userId) }),
  });
}

/** Recent in-app notifications, newest first. */
export function useNotifications(limit = 50) {
  const userId = useUserId();

  return useQuery({
    queryKey: syncKeys.notifications(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export function useMarkNotificationRead() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: syncKeys.notifications(userId) }),
  });
}

export function useMarkAllNotificationsRead() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('read_at', null)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: syncKeys.notifications(userId) }),
  });
}

export function unreadCount(notifications: readonly NotificationRow[]): number {
  return notifications.filter((notification) => notification.read_at === null).length;
}
