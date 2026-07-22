import { useMemo, useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToday } from '@/hooks/useToday';
import {
  useCheckInHabit,
  useHabitEntries,
  useHabits,
  type HabitEntryRow,
  type HabitRow,
} from '@/features/habits/api';
import { HabitCard } from '@/features/habits/HabitCard';
import { HabitFormSheet } from '@/features/habits/HabitFormSheet';

export default function HabitsScreen() {
  const { today } = useToday();
  const habitsQuery = useHabits();
  const entriesQuery = useHabitEntries(today);
  const checkIn = useCheckInHabit();

  const [editing, setEditing] = useState<HabitRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Bucketed once per fetch so each card doesn't re-scan the full entry list.
  const entries = entriesQuery.data;
  const entriesByHabit = useMemo(() => {
    const map = new Map<string, HabitEntryRow[]>();
    for (const entry of entries ?? []) {
      const bucket = map.get(entry.habit_id) ?? [];
      bucket.push(entry);
      map.set(entry.habit_id, bucket);
    }
    return map;
  }, [entries]);

  const isLoading = habitsQuery.isLoading || entriesQuery.isLoading;
  const error = habitsQuery.error ?? entriesQuery.error;

  function refetch() {
    void habitsQuery.refetch();
    void entriesQuery.refetch();
  }

  function openSheet(habit: HabitRow | null) {
    setEditing(habit);
    setSheetOpen(true);
  }

  return (
    <Screen
      onRefresh={refetch}
      refreshing={habitsQuery.isRefetching}
      header={
        <ScreenHeader
          title="Habits"
          subtitle="Check in for today, or tap any day in the last week to correct it."
          action={<Button label="Add habit" size="sm" onPress={() => openSheet(null)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (habitsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Track something you want to do regularly. Streaks here are a plain counter — nothing is scored or shamed."
          actionLabel="Add habit"
          onAction={() => openSheet(null)}
        />
      ) : (
        habitsQuery.data?.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            entries={entriesByHabit.get(habit.id) ?? []}
            today={today}
            onCheckIn={(date, count) => checkIn.mutate({ habitId: habit.id, date, count })}
            onEdit={() => openSheet(habit)}
          />
        ))
      )}

      <HabitFormSheet visible={sheetOpen} habit={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
