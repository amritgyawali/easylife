import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { minTouchTarget, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
import { formatTime, isOverdue, relativeDayLabel, type IsoDate } from '@/utils/date';
import type { TaskPriority } from '@/types/database';
import type { TaskRow } from '@/features/tasks/api';

export interface TaskListItemProps {
  task: TaskRow;
  today: IsoDate;
  onToggle: (completed: boolean) => void;
  onPress?: () => void;
  /** Hide the due-date chip on screens where every row shares one date. */
  hideDueDate?: boolean;
}

/** Priority is shown as a labelled chip, never as colour alone. */
const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  urgent: 'negative',
  high: 'warning',
  medium: 'primary',
  low: 'neutral',
  none: 'neutral',
};

/**
 * One task in a list. The checkbox is its own tap target, separate from the
 * row's — completing a task and opening it to edit are different intentions,
 * and on a phone they were previously a few pixels apart.
 */
export function TaskListItem({ task, today, onToggle, onPress, hideDueDate = false }: TaskListItemProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const completed = task.status === 'completed';
  const overdue = !completed && isOverdue(task.due_date, today);
  const dueTime = formatTime(task.due_time);

  const gutter = compact ? spacing.sm : spacing.md;

  const content = (
    <>
      {/* Claims the touch responder so ticking the box doesn't also fire the
          row's press and open the edit sheet on top of the completed task. */}
      <View onStartShouldSetResponder={() => true}>
        <Checkbox
          checked={completed}
          onChange={onToggle}
          accessibilityLabel={`Mark "${task.title}" as ${completed ? 'not done' : 'done'}`}
        />
      </View>

      <View style={{ flex: 1, gap: spacing.xs, paddingVertical: spacing.md, minWidth: 0 }}>
        <ThemedText
          variant="body"
          weight={completed ? 'regular' : 'medium'}
          tone={completed ? 'muted' : 'default'}
          style={completed ? { textDecorationLine: 'line-through' } : undefined}
        >
          {task.title}
        </ThemedText>

        {task.description ? (
          <ThemedText variant="label" tone="muted" numberOfLines={2}>
            {task.description}
          </ThemedText>
        ) : null}

        {task.priority !== 'none' || (!hideDueDate && task.due_date) || task.list_name ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs }}>
            {task.priority !== 'none' ? (
              <Badge label={task.priority} tone={PRIORITY_TONE[task.priority]} dot />
            ) : null}
            {!hideDueDate && task.due_date ? (
              <Badge
                icon={overdue ? 'alert-circle-outline' : 'calendar-outline'}
                label={`${overdue ? 'Overdue · ' : ''}${relativeDayLabel(task.due_date, today)}${
                  dueTime ? ` ${dueTime}` : ''
                }`}
                tone={overdue ? 'negative' : 'neutral'}
              />
            ) : null}
            {hideDueDate && dueTime ? <Badge icon="time-outline" label={dueTime} /> : null}
            {task.list_name ? <Badge label={task.list_name} /> : null}
          </View>
        ) : null}
      </View>
    </>
  );

  const layout = {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: gutter,
    minHeight: minTouchTarget + spacing.sm,
    paddingHorizontal: gutter,
    paddingRight: compact ? spacing.md : spacing.lg,
  };

  if (!onPress) {
    return <View style={layout}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${task.title}`}
      onPress={onPress}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          layout,
          transition(),
          clickable(),
          { backgroundColor: pressed || hovered ? theme.colors.surfaceHover : 'transparent' },
          focusRing(theme.colors.focus, focused, -2),
        ];
      }}
    >
      {content}
    </Pressable>
  );
}
