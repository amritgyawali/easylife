import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { ListRow } from '@/components/ui/ListRow';
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
  /** False for the first row in a card, so the group has no leading rule. */
  divider?: boolean;
}

/** Priority is shown as a labelled chip, never as colour alone. */
const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  urgent: 'negative',
  high: 'warning',
  medium: 'primary',
  low: 'neutral',
  none: 'neutral',
};

export function TaskListItem({
  task,
  today,
  onToggle,
  onPress,
  hideDueDate = false,
  divider = true,
}: TaskListItemProps) {
  const completed = task.status === 'completed';
  const overdue = !completed && isOverdue(task.due_date, today);
  const dueTime = formatTime(task.due_time);

  const badges = [
    task.priority !== 'none' ? (
      <Badge key="priority" label={task.priority} tone={PRIORITY_TONE[task.priority]} size="sm" />
    ) : null,
    !hideDueDate && task.due_date ? (
      <Badge
        key="due"
        label={`${overdue ? 'Overdue · ' : ''}${relativeDayLabel(task.due_date, today)}${
          dueTime ? ` ${dueTime}` : ''
        }`}
        tone={overdue ? 'negative' : 'neutral'}
        icon={overdue ? 'alert-circle' : 'calendar-outline'}
        size="sm"
      />
    ) : null,
    task.list_name ? <Badge key="list" label={task.list_name} size="sm" /> : null,
  ].filter(Boolean);

  return (
    <ListRow
      divider={divider}
      onPress={onPress}
      title={task.title}
      titleStyle={completed ? { textDecorationLine: 'line-through', opacity: 0.65 } : undefined}
      subtitle={task.description ?? undefined}
      meta={badges.length > 0 ? <>{badges}</> : undefined}
      leading={
        // Outside the row's own press target so tapping the box completes the
        // task rather than opening it for editing.
        <View style={{ paddingRight: spacing.xxs }}>
          <Checkbox
            checked={completed}
            onChange={onToggle}
            accessibilityLabel={`Mark "${task.title}" as ${completed ? 'not done' : 'done'}`}
          />
        </View>
      }
      trailing={<View />}
    />
  );
}
