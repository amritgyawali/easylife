import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
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

export function TaskListItem({ task, today, onToggle, onPress, hideDueDate = false }: TaskListItemProps) {
  const theme = useTheme();
  const completed = task.status === 'completed';
  const overdue = !completed && isOverdue(task.due_date, today);
  const dueTime = formatTime(task.due_time);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Edit ${task.title}` : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
      })}
    >
      <View style={{ paddingTop: spacing.xxs }}>
        <Checkbox
          checked={completed}
          onChange={onToggle}
          accessibilityLabel={`Mark "${task.title}" as ${completed ? 'not done' : 'done'}`}
        />
      </View>

      <View style={{ flex: 1, gap: spacing.xs }}>
        <ThemedText
          variant="body"
          tone={completed ? 'muted' : 'default'}
          style={completed ? { textDecorationLine: 'line-through' } : undefined}
        >
          {task.title}
        </ThemedText>

        {task.description ? (
          <ThemedText variant="caption" tone="muted" numberOfLines={2}>
            {task.description}
          </ThemedText>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {task.priority !== 'none' ? (
            <Badge label={task.priority} tone={PRIORITY_TONE[task.priority]} />
          ) : null}
          {!hideDueDate && task.due_date ? (
            <Badge
              label={`${overdue ? 'Overdue · ' : ''}${relativeDayLabel(task.due_date, today)}${
                dueTime ? ` ${dueTime}` : ''
              }`}
              tone={overdue ? 'negative' : 'neutral'}
            />
          ) : null}
          {task.list_name ? <Badge label={task.list_name} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
