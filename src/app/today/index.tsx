import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { List, ListRow } from '@/components/ui/List';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Stat, StatRow } from '@/components/ui/Stat';
import { ThemedText } from '@/components/ui/ThemedText';
import { Checkbox } from '@/components/ui/Checkbox';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
import { useToday } from '@/hooks/useToday';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useProfile } from '@/features/auth/useProfile';
import { formatInstantTime, formatIsoDate } from '@/utils/date';
import { useTasks, useToggleTaskComplete, type TaskRow } from '@/features/tasks/api';
import { completedOn, tasksDueToday } from '@/features/tasks/grouping';
import { TaskListItem } from '@/features/tasks/TaskListItem';
import { TaskFormSheet } from '@/features/tasks/TaskFormSheet';
import { eventDay, useCalendarEvents } from '@/features/calendar/api';
import { useCheckInHabit, useHabitEntries, useHabits } from '@/features/habits/api';
import { indexEntriesByDate, isCompleted, isScheduledOn } from '@/features/habits/streaks';

/**
 * The daily driver: today's agenda, the tasks due (including anything
 * overdue), and today's habit check-ins — everything that needs a decision
 * today, and nothing that doesn't.
 */
export default function TodayScreen() {
  const router = useRouter();
  const { today, timeZone } = useToday();
  const { data: profile } = useProfile();

  const tasksQuery = useTasks();
  const eventsQuery = useCalendarEvents(today, today);
  const habitsQuery = useHabits();
  const habitEntriesQuery = useHabitEntries(today);
  const toggleComplete = useToggleTaskComplete();
  const checkIn = useCheckInHabit();

  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const dueToday = useMemo(() => tasksDueToday(tasksQuery.data ?? [], today), [tasksQuery.data, today]);
  const doneToday = useMemo(() => completedOn(tasksQuery.data ?? [], today), [tasksQuery.data, today]);

  const todaysEvents = useMemo(
    () => (eventsQuery.data ?? []).filter((event) => eventDay(event, timeZone) === today),
    [eventsQuery.data, timeZone, today]
  );

  const entriesByDate = useMemo(() => {
    const byHabit = new Map<string, ReturnType<typeof indexEntriesByDate>>();
    for (const habit of habitsQuery.data ?? []) {
      byHabit.set(
        habit.id,
        indexEntriesByDate(
          (habitEntriesQuery.data ?? [])
            .filter((entry) => entry.habit_id === habit.id)
            .map((entry) => ({
              entry_date: entry.entry_date,
              count: entry.count,
              is_skipped: entry.is_skipped,
            }))
        )
      );
    }
    return byHabit;
  }, [habitsQuery.data, habitEntriesQuery.data]);

  const habitsDueToday = useMemo(
    () =>
      (habitsQuery.data ?? []).filter((habit) =>
        isScheduledOn(
          {
            recurrence: habit.recurrence as 'daily' | 'weekly' | 'custom',
            by_weekday: habit.by_weekday,
            target_count: habit.target_count,
          },
          today
        )
      ),
    [habitsQuery.data, today]
  );

  const habitsDone = habitsDueToday.filter((habit) =>
    isCompleted(entriesByDate.get(habit.id)?.get(today), habit.target_count)
  ).length;

  const isLoading = tasksQuery.isLoading || eventsQuery.isLoading || habitsQuery.isLoading;
  const error = tasksQuery.error ?? eventsQuery.error ?? habitsQuery.error;

  function refetch() {
    void tasksQuery.refetch();
    void eventsQuery.refetch();
    void habitsQuery.refetch();
    void habitEntriesQuery.refetch();
  }

  const firstName = profile?.profile.full_name?.split(' ')[0];

  return (
    <Screen
      onRefresh={refetch}
      refreshing={tasksQuery.isRefetching}
      header={
        <ScreenHeader
          eyebrow={formatIsoDate(today)}
          title={firstName ? `Hello, ${firstName}` : 'Today'}
          subtitle={
            dueToday.length === 0
              ? 'Nothing due today.'
              : `${dueToday.length} ${dueToday.length === 1 ? 'task' : 'tasks'} due`
          }
          action={
            <Button label="Add task" size="sm" icon="add" onPress={() => setSheetOpen(true)} />
          }
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <Card>
            <StatRow>
              <Stat label="Due today" value={String(dueToday.length)} icon="checkbox-outline" />
              <Stat
                label="Completed"
                value={String(doneToday.length)}
                tone="positive"
                icon="checkmark-done-outline"
              />
              <Stat label="Events" value={String(todaysEvents.length)} icon="calendar-outline" />
              {habitsDueToday.length > 0 ? (
                <Stat
                  label="Habits"
                  value={`${habitsDone}/${habitsDueToday.length}`}
                  icon="repeat-outline"
                />
              ) : null}
            </StatRow>
          </Card>

          {todaysEvents.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title="Agenda"
                count={todaysEvents.length}
                action={
                  <Button
                    label="Calendar"
                    size="sm"
                    variant="ghost"
                    icon="arrow-forward"
                    iconPosition="trailing"
                    onPress={() => router.push('/calendar')}
                  />
                }
              />
              <List>
                {todaysEvents.map((event) => (
                  <ListRow
                    key={event.id}
                    icon="calendar-outline"
                    iconTone="primary"
                    title={event.title}
                    meta={
                      <Badge
                        icon={event.all_day ? 'sunny-outline' : 'time-outline'}
                        label={event.all_day ? 'All day' : formatInstantTime(event.starts_at, timeZone)}
                        tone="primary"
                      />
                    }
                  />
                ))}
              </List>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <SectionHeader
              title="Tasks"
              count={dueToday.length}
              action={
                <Button
                  label="See all"
                  size="sm"
                  variant="ghost"
                  icon="arrow-forward"
                  iconPosition="trailing"
                  onPress={() => router.push('/tasks')}
                />
              }
            />
            {dueToday.length === 0 ? (
              <EmptyState
                icon="checkmark-done-outline"
                title="Nothing due today"
                description={
                  doneToday.length > 0
                    ? `You've already finished ${doneToday.length} today.`
                    : 'Add something you want to get done.'
                }
                actionLabel="Add task"
                onAction={() => setSheetOpen(true)}
              />
            ) : (
              <List>
                {dueToday.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    today={today}
                    hideDueDate
                    onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                    onPress={() => {
                      setEditing(task);
                      setSheetOpen(true);
                    }}
                  />
                ))}
              </List>
            )}
          </View>

          {habitsDueToday.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title="Habits"
                count={`${habitsDone}/${habitsDueToday.length}`}
                action={
                  <Button
                    label="See all"
                    size="sm"
                    variant="ghost"
                    icon="arrow-forward"
                    iconPosition="trailing"
                    onPress={() => router.push('/habits')}
                  />
                }
              />
              <List>
                {habitsDueToday.map((habit) => {
                  const done = isCompleted(entriesByDate.get(habit.id)?.get(today), habit.target_count);
                  return (
                    <HabitCheckRow
                      key={habit.id}
                      name={habit.name}
                      done={done}
                      onToggle={(checked) =>
                        checkIn.mutate({
                          habitId: habit.id,
                          date: today,
                          count: checked ? habit.target_count : 0,
                        })
                      }
                    />
                  );
                })}
              </List>
            </View>
          ) : null}
        </>
      )}

      <TaskFormSheet
        visible={sheetOpen}
        task={editing}
        defaultDueDate={today}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

/**
 * A habit check-in row. The whole row toggles — on a phone, aiming for a 22px
 * box to tick off "drink water" is needless precision.
 */
function HabitCheckRow({
  name,
  done,
  onToggle,
}: {
  name: string;
  done: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const theme = useTheme();
  const compact = useCompactLayout();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`Check in "${name}" for today`}
      onPress={() => onToggle(!done)}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            gap: spacing.sm,
            minHeight: minTouchTarget + spacing.sm,
            paddingHorizontal: compact ? spacing.sm : spacing.md,
            paddingRight: compact ? spacing.md : spacing.lg,
            backgroundColor: pressed || hovered ? theme.colors.surfaceHover : 'transparent',
          },
          transition(),
          clickable(),
          focusRing(theme.colors.focus, focused, -2),
        ];
      }}
    >
      <View pointerEvents="none">
        <Checkbox checked={done} onChange={onToggle} accessibilityLabel={name} />
      </View>
      <ThemedText
        variant="body"
        weight="medium"
        tone={done ? 'muted' : 'default'}
        style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}
      >
        {name}
      </ThemedText>
      {done ? <Ionicons name="flame" size={16} color={theme.colors.positive} /> : null}
    </Pressable>
  );
}
