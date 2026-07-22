import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { addDays, type IsoDate } from '@/utils/date';
import type { Database } from '@/types/database';

export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitEntryRow = Database['public']['Tables']['habit_entries']['Row'];

export type HabitRecurrence = 'daily' | 'weekly' | 'custom';

export const habitKeys = {
  all: (userId: string) => ['habits', userId] as const,
  list: (userId: string) => ['habits', userId, 'list'] as const,
  entries: (userId: string, from: IsoDate, to: IsoDate) => ['habits', userId, 'entries', from, to] as const,
};

/** How far back check-ins are loaded — enough to draw a streak and a 30-day rate. */
export const HABIT_HISTORY_DAYS = 90;

export function useHabits() {
  const userId = useUserId();

  return useQuery({
    queryKey: habitKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .is('archived_at', null)
          .order('created_at')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/**
 * Check-ins over a bounded window rather than the whole history.
 *
 * Streaks are computed on the client from these rows (see `streaks.ts`), so
 * the window has to be wide enough for a believable streak but small enough
 * that the query stays cheap — 90 days is both.
 */
export function useHabitEntries(today: IsoDate, days: number = HABIT_HISTORY_DAYS) {
  const userId = useUserId();
  const from = addDays(today, -days);

  return useQuery({
    queryKey: habitKeys.entries(userId, from, today),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('habit_entries')
          .select('*')
          .eq('user_id', userId)
          .gte('entry_date', from)
          .lte('entry_date', today)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface HabitInput {
  name: string;
  description?: string | null;
  recurrence: HabitRecurrence;
  byWeekday: number[] | null;
  targetCount: number;
}

export function useCreateHabit() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: HabitInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('habits').insert({
          user_id: owner,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          recurrence: input.recurrence,
          by_weekday: input.byWeekday,
          target_count: input.targetCount,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all(userId) }),
  });
}

export function useUpdateHabit() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: HabitInput & { id: string }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('habits')
          .update({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            recurrence: input.recurrence,
            by_weekday: input.byWeekday,
            target_count: input.targetCount,
          })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all(userId) }),
  });
}

export function useDeleteHabit() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('habits').update({ deleted_at: new Date().toISOString() }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all(userId) }),
  });
}

export interface CheckInInput {
  habitId: string;
  date: IsoDate;
  count: number;
  isSkipped?: boolean;
}

/**
 * Records (or clears) a check-in for one habit on one day.
 *
 * Upsert on `(habit_id, entry_date)` because a day has exactly one check-in
 * row — tapping the same day twice must correct the existing row, never
 * accumulate duplicates. A count of 0 with no skip removes the row entirely
 * so an accidental tap leaves no trace in the history.
 */
export function useCheckInHabit() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CheckInInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      if (input.count <= 0 && !input.isSkipped) {
        unwrapVoid(
          await supabase
            .from('habit_entries')
            .delete()
            .eq('habit_id', input.habitId)
            .eq('entry_date', input.date)
        );
        return;
      }

      unwrapVoid(
        await supabase.from('habit_entries').upsert(
          {
            user_id: owner,
            habit_id: input.habitId,
            entry_date: input.date,
            count: input.count,
            is_skipped: input.isSkipped ?? false,
          },
          { onConflict: 'habit_id,entry_date' }
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all(userId) }),
  });
}
