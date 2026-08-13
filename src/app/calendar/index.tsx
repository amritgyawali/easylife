import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { List, ListRow } from '@/components/ui/List';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { useToday } from '@/hooks/useToday';
import {
  addDays,
  eachDayInRange,
  formatInstantTime,
  relativeDayLabel,
  startOfWeek,
  type IsoDate,
} from '@/utils/date';
import { eventDay, useCalendarEvents, type CalendarEventRow } from '@/features/calendar/api';
import { CalendarEventFormSheet } from '@/features/calendar/CalendarEventFormSheet';
import { useTasks, useToggleTaskComplete, type TaskRow } from '@/features/tasks/api';
import { isOpen } from '@/features/tasks/grouping';
import { TaskListItem } from '@/features/tasks/TaskListItem';

/** Weeks shown from the start of the current week. */
const WEEKS_AHEAD = 3;

/**
 * An agenda view rather than a month grid: on a phone a month grid shows
 * dots you have to tap to read, while an agenda answers "what is coming up"
 * directly. Tasks with a due date appear alongside events, because from the
 * user's side both are just things happening on a day.
 */
export default function CalendarScreen() {
  const { today, timeZone, weekStart } = useToday();

  const from = startOfWeek(today, weekStart);
  const to = addDays(from, WEEKS_AHEAD * 7 - 1);

  const eventsQuery = useCalendarEvents(from, to);
  const tasksQuery = useTasks();
  const toggleComplete = useToggleTaskComplete();

  const [selectedDate, setSelectedDate] = useState<IsoDate | undefined>(undefined);
  const [editing, setEditing] = useState<CalendarEventRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const events = eventsQuery.data;
  const tasks = tasksQuery.data;

  const days = useMemo(() => {
    const eventsByDay = new Map<IsoDate, CalendarEventRow[]>();
    for (const event of events ?? []) {
      const day = eventDay(event, timeZone);
      eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event]);
    }

    const tasksByDay = new Map<IsoDate, TaskRow[]>();
    for (const task of (tasks ?? []).filter(isOpen)) {
      if (!task.due_date) continue;
      tasksByDay.set(task.due_date, [...(tasksByDay.get(task.due_date) ?? []), task]);
    }

    return (
      eachDayInRange(from, to)
        .map((date) => ({
          date,
          events: eventsByDay.get(date) ?? [],
          tasks: tasksByDay.get(date) ?? [],
        }))
        // Past days in the current week are only worth showing if something is
        // still on them; otherwise the agenda opens on stale, empty rows.
        .filter((day) => day.date >= today || day.events.length > 0 || day.tasks.length > 0)
    );
  }, [events, tasks, timeZone, from, to, today]);

  const isLoading = eventsQuery.isLoading || tasksQuery.isLoading;
  const error = eventsQuery.error ?? tasksQuery.error;

  function refetch() {
    void eventsQuery.refetch();
    void tasksQuery.refetch();
  }

  function openSheet(event: CalendarEventRow | null, date?: IsoDate) {
    setEditing(event);
    setSelectedDate(date);
    setSheetOpen(true);
  }

  return (
    <Screen
      onRefresh={refetch}
      refreshing={eventsQuery.isRefetching}
      header={
        <ScreenHeader
          eyebrow="Overview"
          title="Calendar"
          subtitle={`Events and due tasks for the next ${WEEKS_AHEAD} weeks.`}
          action={<Button label="Add event" size="sm" icon="add" onPress={() => openSheet(null, today)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : days.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Nothing scheduled"
          description="Add an event, or give a task a due date and it will show up here."
          actionLabel="Add event"
          onAction={() => openSheet(null, today)}
        />
      ) : (
        days.map((day) => (
          <View key={day.date} style={{ gap: spacing.sm }}>
            <SectionHeader
              title={relativeDayLabel(day.date, today)}
              description={day.date}
              action={
                <Button
                  label="Add"
                  size="sm"
                  variant="ghost"
                  icon="add"
                  onPress={() => openSheet(null, day.date)}
                />
              }
            />

            {day.events.length === 0 && day.tasks.length === 0 ? (
              <ThemedText variant="caption" tone="subtle" style={{ paddingBottom: spacing.xs }}>
                Nothing scheduled.
              </ThemedText>
            ) : (
              <List>
                {day.events.map((event) => (
                  <ListRow
                    key={event.id}
                    icon="calendar-outline"
                    iconTone="primary"
                    title={event.title}
                    onPress={() => openSheet(event)}
                    accessibilityLabel={`Edit event ${event.title}`}
                    chevron
                    meta={
                      <>
                        <Badge
                          icon={event.all_day ? 'sunny-outline' : 'time-outline'}
                          label={event.all_day ? 'All day' : formatInstantTime(event.starts_at, timeZone)}
                          tone="primary"
                        />
                        {event.location ? <Badge icon="location-outline" label={event.location} /> : null}
                      </>
                    }
                  />
                ))}

                {day.tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    today={today}
                    hideDueDate
                    onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                  />
                ))}
              </List>
            )}
          </View>
        ))
      )}

      <CalendarEventFormSheet
        visible={sheetOpen}
        event={editing}
        defaultDate={selectedDate}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
