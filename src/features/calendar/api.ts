import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { addDays, toIsoDateInTimeZone, type IsoDate } from '@/utils/date';
import type { Database } from '@/types/database';

export type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row'];

export const calendarKeys = {
  all: (userId: string) => ['calendar', userId] as const,
  range: (userId: string, from: IsoDate, to: IsoDate) => ['calendar', userId, 'range', from, to] as const,
};

/**
 * Events overlapping a date range.
 *
 * `starts_at` is a timestamptz but the range is expressed in calendar days,
 * so the bounds are widened by a day on each side and the exact day is
 * decided client-side in the user's timezone (`eventDay` below). Filtering
 * on a naive `date(starts_at)` in SQL would use UTC days and drop or misplace
 * evening events for a UTC+05:45 user.
 */
export function useCalendarEvents(from: IsoDate, to: IsoDate) {
  const userId = useUserId();

  return useQuery({
    queryKey: calendarKeys.range(userId, from, to),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .gte('starts_at', `${addDays(from, -1)}T00:00:00Z`)
          .lte('starts_at', `${addDays(to, 1)}T23:59:59Z`)
          .order('starts_at')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

/** The calendar day an event falls on, in the user's timezone. */
export function eventDay(event: CalendarEventRow, timeZone: string): IsoDate {
  return toIsoDateInTimeZone(new Date(event.starts_at), timeZone);
}

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  /** Calendar day in the user's timezone. */
  date: IsoDate;
  /** `HH:MM`, or null for an all-day event. */
  time: string | null;
}

/**
 * Combines a calendar day and a wall-clock time into an instant.
 *
 * Built from an ISO string with no timezone suffix so the runtime interprets
 * it in the device's local zone. That is the correct behaviour for an event
 * the user is creating right now on that device; storing a zone-shifted
 * instant would move the event on their own screen.
 */
export function toInstant(date: IsoDate, time: string | null): string {
  return new Date(`${date}T${time ?? '00:00'}:00`).toISOString();
}

export function useCreateCalendarEvent() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CalendarEventInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('calendar_events').insert({
          user_id: owner,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          location: input.location?.trim() || null,
          starts_at: toInstant(input.date, input.time),
          all_day: input.time === null,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all(userId) }),
  });
}

export function useUpdateCalendarEvent() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CalendarEventInput & { id: string }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('calendar_events')
          .update({
            title: input.title.trim(),
            description: input.description?.trim() || null,
            location: input.location?.trim() || null,
            starts_at: toInstant(input.date, input.time),
            all_day: input.time === null,
          })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all(userId) }),
  });
}

export function useDeleteCalendarEvent() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase.from('calendar_events').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all(userId) }),
  });
}
