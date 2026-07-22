import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import { AppError } from '@/utils/errors';
import { toMinorUnits } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import type { Database, GoalEventType } from '@/types/database';

export type SavingsGoalRow = Database['public']['Tables']['savings_goals']['Row'];
export type GoalEventRow = Database['public']['Tables']['goal_events']['Row'];

export const goalKeys = {
  all: (userId: string) => ['goals', userId] as const,
  list: (userId: string) => ['goals', userId, 'list'] as const,
  events: (userId: string) => ['goals', userId, 'events'] as const,
};

/**
 * Progress towards a goal, derived from its events.
 *
 * Mirrors `recompute_goal_progress()` in SQL: contributions less
 * withdrawals. Derived rather than stored for the same reason as loan
 * balances — a saved total can drift from the events that produced it.
 */
export function goalProgressMinor(events: { event_type: GoalEventType; amount_minor: number }[]): number {
  return events.reduce(
    (total, event) =>
      total + (event.event_type === 'contribution' ? event.amount_minor : -event.amount_minor),
    0
  );
}

export function useSavingsGoals() {
  const userId = useUserId();

  return useQuery({
    queryKey: goalKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('savings_goals')
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

export function useGoalEvents() {
  const userId = useUserId();

  return useQuery({
    queryKey: goalKeys.events(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(await supabase.from('goal_events').select('*').eq('user_id', userId).order('event_date'));
    },
    enabled: userId !== 'anonymous',
  });
}

export function useGoalsWithProgress() {
  const goalsQuery = useSavingsGoals();
  const eventsQuery = useGoalEvents();

  const data = useMemo(() => {
    const byGoal = new Map<string, GoalEventRow[]>();
    for (const event of eventsQuery.data ?? []) {
      byGoal.set(event.goal_id, [...(byGoal.get(event.goal_id) ?? []), event]);
    }

    return (goalsQuery.data ?? []).map((goal) => {
      const events = byGoal.get(goal.id) ?? [];
      const savedMinor = goalProgressMinor(events);

      return {
        goal,
        events,
        savedMinor,
        // Clamped so an over-funded goal reads as 100% rather than 140%,
        // which would make the progress bar meaningless.
        progress: goal.target_amount_minor > 0 ? Math.min(1, savedMinor / goal.target_amount_minor) : 0,
      };
    });
  }, [goalsQuery.data, eventsQuery.data]);

  return {
    data,
    isLoading: goalsQuery.isLoading || eventsQuery.isLoading,
    isRefetching: goalsQuery.isRefetching || eventsQuery.isRefetching,
    error: goalsQuery.error ?? eventsQuery.error,
    refetch: () => {
      void goalsQuery.refetch();
      void eventsQuery.refetch();
    },
  };
}

export interface GoalInput {
  name: string;
  /** Decimal major units as typed. */
  targetAmount: string;
  currency: string;
  targetDate?: IsoDate | null;
  isEmergencyFund?: boolean;
  linkedAccountId?: string | null;
}

export function useCreateGoal() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const targetMinor = toMinorUnits(input.targetAmount, input.currency);
      if (targetMinor <= 0) throw new AppError('validation_failed', 'Enter a target greater than zero');

      unwrapVoid(
        await supabase.from('savings_goals').insert({
          user_id: owner,
          name: input.name.trim(),
          target_amount_minor: targetMinor,
          currency: input.currency,
          target_date: input.targetDate ?? null,
          is_emergency_fund: input.isEmergencyFund ?? false,
          linked_account_id: input.linkedAccountId ?? null,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.all(userId) }),
  });
}

export function useArchiveGoal() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(
        await supabase.from('savings_goals').update({ archived_at: new Date().toISOString() }).eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.all(userId) }),
  });
}

export interface GoalEventInput {
  goalId: string;
  currency: string;
  eventType: GoalEventType;
  amount: string;
  eventDate: IsoDate;
  notes?: string | null;
}

export function useRecordGoalEvent() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GoalEventInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      const amountMinor = toMinorUnits(input.amount, input.currency);
      if (amountMinor <= 0) throw new AppError('validation_failed', 'Enter an amount greater than zero');

      unwrapVoid(
        await supabase.from('goal_events').insert({
          user_id: owner,
          goal_id: input.goalId,
          event_type: input.eventType,
          amount_minor: amountMinor,
          event_date: input.eventDate,
          notes: input.notes?.trim() || null,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.all(userId) }),
  });
}
