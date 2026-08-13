import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { List } from '@/components/ui/List';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/forms/SearchInput';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { useToday } from '@/hooks/useToday';
import { useLayout } from '@/hooks/useCompactLayout';
import { useTasks, useToggleTaskComplete, type TaskRow } from '@/features/tasks/api';
import { groupTasks, isOpen } from '@/features/tasks/grouping';
import { TaskListItem } from '@/features/tasks/TaskListItem';
import { TaskFormSheet } from '@/features/tasks/TaskFormSheet';

type Filter = 'open' | 'done';

/**
 * The planner: every open task grouped into overdue / today / next 7 days /
 * later, with a text filter and a completed-tasks view.
 */
export default function TasksScreen() {
  const { today } = useToday();
  const { compact } = useLayout();
  const { data: tasks, isLoading, error, refetch, isRefetching } = useTasks();
  const toggleComplete = useToggleTaskComplete();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!tasks) return [];
    if (!needle) return tasks;
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(needle) ||
        (task.description?.toLowerCase().includes(needle) ?? false)
    );
  }, [tasks, query]);

  const sections = useMemo(() => groupTasks(matching, today), [matching, today]);
  const completed = useMemo(
    () =>
      matching
        .filter((task) => !isOpen(task))
        .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
        .slice(0, 100),
    [matching]
  );

  const openCount = useMemo(() => matching.filter(isOpen).length, [matching]);

  function openSheet(task: TaskRow | null) {
    setEditing(task);
    setSheetOpen(true);
  }

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="Planner"
            subtitle={
              openCount > 0 ? `${openCount} open ${openCount === 1 ? 'task' : 'tasks'}` : 'Nothing open'
            }
            action={<Button label="Add task" size="sm" icon="add" onPress={() => openSheet(null)} />}
          />
          {/* Filters share one row on desktop; a phone gets them stacked so
              neither the search box nor the toggle is squeezed to nothing. */}
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <SearchInput value={query} onChangeText={setQuery} placeholder="Search tasks" />
            </View>
            <View style={{ width: compact ? undefined : 240 }}>
              <OptionGroup
                variant="segmented"
                options={[
                  { value: 'open', label: 'To do' },
                  { value: 'done', label: 'Completed' },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </View>
          </View>
        </>
      }
    >
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : filter === 'done' ? (
        completed.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing completed yet"
            description="Finished tasks will collect here."
          />
        ) : (
          <List>
            {completed.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                today={today}
                onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                onPress={() => openSheet(task)}
              />
            ))}
          </List>
        )
      ) : sections.length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title={query ? 'No matching tasks' : 'Your list is clear'}
          description={query ? 'Try a different search.' : 'Add the first thing you need to get done.'}
          actionLabel={query ? undefined : 'Add task'}
          onAction={query ? undefined : () => openSheet(null)}
        />
      ) : (
        sections.map((section) => (
          <View key={section.bucket} style={{ gap: spacing.sm }}>
            <SectionHeader title={section.title} count={section.tasks.length} />
            <List>
              {section.tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                  onPress={() => openSheet(task)}
                />
              ))}
            </List>
          </View>
        ))
      )}

      <TaskFormSheet visible={sheetOpen} task={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
