import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { toUserMessage } from '@/utils/errors';
import {
  useCreateHabit,
  useDeleteHabit,
  useUpdateHabit,
  type HabitRecurrence,
  type HabitRow,
} from '@/features/habits/api';

export interface HabitFormSheetProps {
  visible: boolean;
  onClose: () => void;
  habit: HabitRow | null;
}

const RECURRENCE_OPTIONS: { value: HabitRecurrence; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Certain days' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HabitFormSheet({ visible, onClose, habit }: HabitFormSheetProps) {
  const theme = useTheme();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<HabitRecurrence>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [targetCount, setTargetCount] = useState('1');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(habit?.name ?? '');
    setDescription(habit?.description ?? '');
    setRecurrence((habit?.recurrence as HabitRecurrence | undefined) ?? 'daily');
    setWeekdays(habit?.by_weekday ?? []);
    setTargetCount(String(habit?.target_count ?? 1));
    setNameError(null);
  }, [visible, habit]);

  const pending = createHabit.isPending || updateHabit.isPending || deleteHabit.isPending;
  const error = createHabit.error ?? updateHabit.error ?? deleteHabit.error;

  async function handleSave() {
    if (name.trim().length === 0) {
      setNameError('Give the habit a name.');
      return;
    }

    const parsedTarget = Number.parseInt(targetCount, 10);
    const input = {
      name,
      description,
      recurrence,
      // Weekday selection only means anything for a non-daily habit; storing
      // null for a daily one keeps `isScheduledOn` from having to guess.
      byWeekday: recurrence === 'daily' || weekdays.length === 0 ? null : [...weekdays].sort(),
      targetCount: Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 1,
    };

    if (habit) await updateHabit.mutateAsync({ id: habit.id, ...input });
    else await createHabit.mutateAsync(input);

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={habit ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      footer={
        <>
          {habit ? (
            <Button
              label="Delete"
              variant="danger"
              disabled={pending}
              onPress={async () => {
                await deleteHabit.mutateAsync(habit.id);
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
        label="Habit"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        placeholder="e.g. Morning walk"
        autoFocus
      />

      <TextField
        label="Why it matters"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        multiline
      />

      <OptionGroup label="Repeats" options={RECURRENCE_OPTIONS} value={recurrence} onChange={setRecurrence} />

      {recurrence !== 'daily' ? (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            On these days
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {WEEKDAYS.map((label, index) => {
              const selected = weekdays.includes(index);
              return (
                <Pressable
                  key={label}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                  onPress={() =>
                    setWeekdays((current) =>
                      current.includes(index) ? current.filter((day) => day !== index) : [...current, index]
                    )
                  }
                  style={{
                    minWidth: minTouchTarget,
                    minHeight: minTouchTarget,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.accentSurface : theme.colors.surface,
                  }}
                >
                  <ThemedText variant="caption" tone={selected ? 'primary' : 'default'}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <TextField
        label="Times per day"
        value={targetCount}
        onChangeText={setTargetCount}
        keyboardType="number-pad"
        helpText="How many check-ins count as done for one day."
      />

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
