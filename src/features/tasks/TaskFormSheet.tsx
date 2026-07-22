import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import type { IsoDate } from '@/utils/date';
import type { TaskPriority } from '@/types/database';
import { useCreateTask, useDeleteTask, useProjects, useUpdateTask, type TaskRow } from '@/features/tasks/api';

export interface TaskFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Null creates a new task; a row edits that task. */
  task: TaskRow | null;
  /** Pre-fills the due date when opened from a dated context (Today, a calendar day). */
  defaultDueDate?: IsoDate | null;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function TaskFormSheet({ visible, onClose, task, defaultDueDate = null }: TaskFormSheetProps) {
  const { today } = useToday();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [dueDate, setDueDate] = useState<IsoDate | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Reset the form each time the sheet opens so a previous edit never leaks
  // into the next one.
  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setPriority(task?.priority ?? 'none');
    setDueDate(task?.due_date ?? defaultDueDate);
    setProjectId(task?.project_id ?? null);
    setTitleError(null);
  }, [visible, task, defaultDueDate]);

  const pending = createTask.isPending || updateTask.isPending || deleteTask.isPending;
  const error = createTask.error ?? updateTask.error ?? deleteTask.error;

  async function handleSave() {
    if (title.trim().length === 0) {
      setTitleError('Give the task a name.');
      return;
    }

    const input = {
      title,
      description,
      priority,
      dueDate,
      projectId,
      // A task given a date is no longer loose in the inbox.
      status: task?.status ?? (dueDate ? ('planned' as const) : ('inbox' as const)),
    };

    if (task) await updateTask.mutateAsync({ id: task.id, ...input });
    else await createTask.mutateAsync(input);

    onClose();
  }

  const projectOptions = [
    { value: '', label: 'No project' },
    ...(projects ?? []).map((project) => ({ value: project.id, label: project.name })),
  ];

  return (
    <FormSheet
      visible={visible}
      title={task ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          {task ? (
            <Button
              label="Delete"
              variant="danger"
              disabled={pending}
              onPress={async () => {
                await deleteTask.mutateAsync(task.id);
                onClose();
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button label="Save" loading={pending} fullWidth onPress={() => void handleSave()} />
          </View>
        </>
      }
    >
      <TextField
        label="Task"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          if (titleError) setTitleError(null);
        }}
        error={titleError}
        placeholder="What needs doing?"
        autoFocus
      />

      <TextField
        label="Notes"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional detail"
        multiline
      />

      <DateField label="Due" value={dueDate} onChange={setDueDate} today={today} />

      <OptionGroup label="Priority" options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />

      {projectOptions.length > 1 ? (
        <OptionGroup
          label="Project"
          options={projectOptions}
          value={projectId ?? ''}
          onChange={(value) => setProjectId(value === '' ? null : value)}
        />
      ) : null}

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
