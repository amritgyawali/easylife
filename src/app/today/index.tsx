import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Section } from '@/components/ui/Section';
import { Stat, StatRow } from '@/components/ui/Stat';
import { ListRow } from '@/components/ui/ListRow';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToday } from '@/hooks/useToday';
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
          title={firstName ? `Hello, ${firstName}` : 'Today'}
          subtitle={formatIsoDate(today)}
          action={<Button label="Add task" icon="add" size="sm" onPress={() => setSheetOpen(true)} />}
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
              <Stat label="Due today" value={String(dueToday.length)} icon="time-outline" />
              <Stat
                label="Completed"
                value={String(doneToday.length)}
                tone={doneToday.length > 0 ? 'positive' : 'default'}
                icon="checkmark-circle-outline"
              />
              <Stat label="Events" value={String(todaysEvents.length)} icon="calendar-outline" />
            </StatRow>
          </Card>

          {todaysEvents.length > 0 ? (
            <Section title="Agenda" count={todaysEvents.length}>
              <Card padded={false}>
                {todaysEvents.map((event, index) => (
                  <ListRow
                    key={event.id}
                    divider={index > 0}
                    icon="calendar-outline"
                    iconTone="primary"
                    title={event.title}
                    trailing={
                      <Badge
                        label={event.all_day ? 'All day' : formatInstantTime(event.starts_at, timeZone)}
                        tone="primary"
                      />
                    }
                  />
                ))}
              </Card>
            </Section>
          ) : null}

          <Section
            title="Tasks"
            count={dueToday.length}
            action={
              <Button label="See all" size="sm" variant="ghost" onPress={() => router.push('/tasks')} />
            }
          >
            <Card padded={false}>
              {dueToday.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon="checkmark-done-outline"
                  title="Nothing is due today"
                  description="Anything overdue would appear here too."
                  actionLabel="Add a task"
                  onAction={() => setSheetOpen(true)}
                />
              ) : (
                dueToday.map((task, index) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    today={today}
                    divider={index > 0}
                    onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                    onPress={() => {
                      setEditing(task);
                      setSheetOpen(true);
                    }}
                  />
                ))
              )}
            </Card>
          </Section>

          {habitsDueToday.length > 0 ? (
            <Section
              title="Habits"
              count={habitsDueToday.length}
              action={
                <Button label="See all" size="sm" variant="ghost" onPress={() => router.push('/habits')} />
              }
            >
              <Card padded={false}>
                {habitsDueToday.map((habit, index) => {
                  const done = isCompleted(entriesByDate.get(habit.id)?.get(today), habit.target_count);
                  return (
                    <ListRow
                      key={habit.id}
                      divider={index > 0}
                      title={habit.name}
                      titleStyle={done ? { opacity: 0.6 } : undefined}
                      subtitle={habit.target_count > 1 ? `Target ${habit.target_count}× today` : undefined}
                      leading={
                        <Checkbox
                          checked={done}
                          accessibilityLabel={`Check in "${habit.name}" for today`}
                          onChange={(checked) =>
                            checkIn.mutate({
                              habitId: habit.id,
                              date: today,
                              count: checked ? habit.target_count : 0,
                            })
                          }
                        />
                      }
                      trailing={
                        done ? <Badge label="Done" tone="positive" size="sm" icon="checkmark" /> : <View />
                      }
                    />
                  );
                })}
              </Card>
            </Section>
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
