import { useMemo, useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Section } from '@/components/ui/Section';
import { SearchInput } from '@/components/forms/SearchInput';
import { SegmentedControl } from '@/components/forms/SegmentedControl';
import { useToday } from '@/hooks/useToday';
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
            subtitle="Everything on your plate, grouped by when it's due."
            action={<Button label="Add task" icon="add" size="sm" onPress={() => openSheet(null)} />}
          />
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search tasks" />
          <SegmentedControl
            options={[
              { value: 'open', label: 'To do' },
              { value: 'done', label: 'Completed' },
            ]}
            value={filter}
            onChange={setFilter}
          />
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
          <Card padded={false}>
            {completed.map((task, index) => (
              <TaskListItem
                key={task.id}
                task={task}
                today={today}
                divider={index > 0}
                onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                onPress={() => openSheet(task)}
              />
            ))}
          </Card>
        )
      ) : sections.length === 0 ? (
        <EmptyState
          icon={query ? 'search-outline' : 'sparkles-outline'}
          title={query ? 'No matching tasks' : 'Your list is clear'}
          description={query ? 'Try a different search.' : 'Add the first thing you need to get done.'}
          actionLabel={query ? undefined : 'Add task'}
          onAction={query ? undefined : () => openSheet(null)}
        />
      ) : (
        sections.map((section) => (
          <Section key={section.bucket} title={section.title} count={section.tasks.length}>
            <Card padded={false}>
              {section.tasks.map((task, index) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  today={today}
                  divider={index > 0}
                  onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                  onPress={() => openSheet(task)}
                />
              ))}
            </Card>
          </Section>
        ))
      )}

      <TaskFormSheet visible={sheetOpen} task={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
