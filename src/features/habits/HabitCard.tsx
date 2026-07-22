import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { addDays, weekdayLabel, type IsoDate } from '@/utils/date';
import type { HabitEntryRow, HabitRow } from '@/features/habits/api';
import {
  completionStats,
  currentStreak,
  indexEntriesByDate,
  isCompleted,
  isScheduledOn,
  type HabitEntry,
} from '@/features/habits/streaks';

export interface HabitCardProps {
  habit: HabitRow;
  entries: HabitEntryRow[];
  today: IsoDate;
  onCheckIn: (date: IsoDate, count: number) => void;
  onEdit: () => void;
}

/** Days of history shown in the inline dot strip. */
const STRIP_DAYS = 7;

/**
 * One habit: today's check-in, a week of history, and the plain factual
 * streak/completion counters.
 *
 * Deliberately free of any praise, badge or warning copy — the product rules
 * forbid gamification and streak-shaming, so this reports numbers and stops.
 */
export function HabitCard({ habit, entries, today, onCheckIn, onEdit }: HabitCardProps) {
  const theme = useTheme();

  const schedule = {
    recurrence: habit.recurrence as 'daily' | 'weekly' | 'custom',
    by_weekday: habit.by_weekday,
    target_count: habit.target_count,
  };

  const habitEntries: HabitEntry[] = entries.map((entry) => ({
    entry_date: entry.entry_date,
    count: entry.count,
    is_skipped: entry.is_skipped,
  }));

  const byDate = indexEntriesByDate(habitEntries);
  const todayEntry = byDate.get(today);
  const doneToday = isCompleted(todayEntry, habit.target_count);
  const streak = currentStreak(schedule, habitEntries, today);
  const stats = completionStats(schedule, habitEntries, addDays(today, -29), today);
  const scheduledToday = isScheduledOn(schedule, today);

  const strip = Array.from({ length: STRIP_DAYS }, (_, index) => addDays(today, index - (STRIP_DAYS - 1)));

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ paddingTop: spacing.xxs }}>
          <Checkbox
            checked={doneToday}
            disabled={!scheduledToday}
            accessibilityLabel={`Check in "${habit.name}" for today`}
            onChange={(checked) => onCheckIn(today, checked ? habit.target_count : 0)}
          />
        </View>

        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="body" weight="semibold">
            {habit.name}
          </ThemedText>

          {habit.description ? (
            <ThemedText variant="caption" tone="muted" numberOfLines={2}>
              {habit.description}
            </ThemedText>
          ) : null}

          <ThemedText variant="caption" tone="muted">
            {scheduledToday ? 'Due today' : 'Not scheduled today'} · {streak}-day streak
            {stats.rate !== null ? ` · ${Math.round(stats.rate * 100)}% over 30 days` : ''}
          </ThemedText>

          <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
            {strip.map((date) => {
              const entry = byDate.get(date);
              const done = isCompleted(entry, habit.target_count);
              const scheduled = isScheduledOn(schedule, date);

              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: done }}
                  accessibilityLabel={`${weekdayLabel(date)} ${date}: ${
                    entry?.is_skipped ? 'skipped' : done ? 'done' : 'not done'
                  }. Toggle.`}
                  disabled={!scheduled}
                  onPress={() => onCheckIn(date, done ? 0 : habit.target_count)}
                  style={{ alignItems: 'center', gap: 2, flex: 1 }}
                >
                  <View
                    style={{
                      height: 26,
                      width: '100%',
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: done ? theme.colors.positive : theme.colors.border,
                      backgroundColor: done
                        ? theme.colors.positiveSurface
                        : scheduled
                          ? 'transparent'
                          : theme.colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText variant="caption" tone={done ? 'positive' : 'muted'}>
                      {entry?.is_skipped ? '–' : done ? '✓' : ''}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" tone="muted">
                    {weekdayLabel(date).charAt(0)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <IconButton icon="ellipsis-horizontal" accessibilityLabel={`Edit ${habit.name}`} onPress={onEdit} />
      </View>
    </Card>
  );
}
