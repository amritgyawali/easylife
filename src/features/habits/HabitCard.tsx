import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
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
    <Card style={{ gap: spacing.md, flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ marginLeft: -spacing.md, marginTop: -spacing.sm }}>
          <Checkbox
            checked={doneToday}
            disabled={!scheduledToday}
            accessibilityLabel={`Check in "${habit.name}" for today`}
            onChange={(checked) => onCheckIn(today, checked ? habit.target_count : 0)}
          />
        </View>

        <View style={{ flex: 1, gap: spacing.xxs, minWidth: 0 }}>
          <ThemedText variant="body" weight="semibold" numberOfLines={2}>
            {habit.name}
          </ThemedText>
          {habit.description ? (
            <ThemedText variant="caption" tone="muted" numberOfLines={2}>
              {habit.description}
            </ThemedText>
          ) : null}
        </View>

        <IconButton icon="ellipsis-horizontal" accessibilityLabel={`Edit ${habit.name}`} onPress={onEdit} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge
          label={scheduledToday ? 'Due today' : 'Not scheduled today'}
          tone={scheduledToday ? 'primary' : 'neutral'}
          dot
        />
        <Badge label={`${streak}-day streak`} icon="flame-outline" />
        {stats.rate !== null ? (
          <Badge label={`${Math.round(stats.rate * 100)}% over 30 days`} icon="stats-chart-outline" />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {strip.map((date) => (
          <DayCell
            key={date}
            date={date}
            done={isCompleted(byDate.get(date), habit.target_count)}
            skipped={byDate.get(date)?.is_skipped ?? false}
            scheduled={isScheduledOn(schedule, date)}
            isToday={date === today}
            onPress={(done) => onCheckIn(date, done ? 0 : habit.target_count)}
          />
        ))}
      </View>
    </Card>
  );
}

/** One day in the week strip — tappable to correct a missed or wrong check-in. */
function DayCell({
  date,
  done,
  skipped,
  scheduled,
  isToday,
  onPress,
}: {
  date: IsoDate;
  done: boolean;
  skipped: boolean;
  scheduled: boolean;
  isToday: boolean;
  onPress: (done: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: done, disabled: !scheduled }}
      accessibilityLabel={`${weekdayLabel(date)} ${date}: ${
        skipped ? 'skipped' : done ? 'done' : 'not done'
      }. Toggle.`}
      disabled={!scheduled}
      onPress={() => onPress(done)}
      style={(state) => {
        const { hovered, focused } = pressState(state);
        return [
          { alignItems: 'center' as const, gap: spacing.xxs, flex: 1 },
          clickable(scheduled),
          focusRing(theme.colors.focus, focused),
          { opacity: hovered && scheduled ? 0.85 : 1 },
        ];
      }}
    >
      <View
        style={[
          {
            height: 30,
            width: '100%',
            borderRadius: radius.sm,
            borderWidth: isToday ? 2 : 1,
            borderColor: done ? theme.colors.positive : isToday ? theme.colors.primary : theme.colors.border,
            backgroundColor: done
              ? theme.colors.positiveSurface
              : scheduled
                ? 'transparent'
                : theme.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          },
          transition(),
        ]}
      >
        <ThemedText variant="caption" tone={done ? 'positive' : 'subtle'} weight="semibold">
          {skipped ? '–' : done ? '✓' : ''}
        </ThemedText>
      </View>
      <ThemedText variant="caption" tone={isToday ? 'primary' : 'subtle'}>
        {weekdayLabel(date).charAt(0)}
      </ThemedText>
    </Pressable>
  );
}
