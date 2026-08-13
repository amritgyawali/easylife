import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { FormActions, FormRow, FormSheet } from '@/components/ui/FormSheet';
import { FormError } from '@/components/ui/InlineMessage';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { Field } from '@/components/forms/Field';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
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
      subtitle="Streaks here are a plain counter — nothing is scored or shamed."
      onClose={onClose}
      footer={
        <FormActions
          pending={pending}
          onSave={() => void handleSave()}
          saveLabel={habit ? 'Save changes' : 'Add habit'}
          onDelete={
            habit
              ? async () => {
                  await deleteHabit.mutateAsync(habit.id);
                  onClose();
                }
              : undefined
          }
        />
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
        required
        placeholder="e.g. Morning walk"
        autoFocus
        size="lg"
      />

      <TextField
        label="Why it matters"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        multiline
      />

      <FormRow>
        <OptionGroup
          label="Repeats"
          variant="segmented"
          options={RECURRENCE_OPTIONS}
          value={recurrence}
          onChange={setRecurrence}
        />
        <TextField
          label="Times per day"
          value={targetCount}
          onChangeText={setTargetCount}
          keyboardType="number-pad"
          helpText="How many check-ins count as done for one day."
        />
      </FormRow>

      {recurrence !== 'daily' ? (
        <Field
          label="On these days"
          helpText={weekdays.length === 0 ? 'Pick at least one day, or it counts as every day.' : undefined}
        >
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
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
                  style={(state) => {
                    const { hovered, focused } = pressState(state);
                    return [
                      {
                        flex: 1,
                        minHeight: minTouchTarget,
                        alignItems: 'center' as const,
                        justifyContent: 'center' as const,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: selected
                          ? theme.colors.primary
                          : hovered
                            ? theme.colors.borderStrong
                            : theme.colors.border,
                        backgroundColor: selected
                          ? theme.colors.primary
                          : hovered
                            ? theme.colors.surfaceHover
                            : theme.colors.surface,
                      },
                      transition(),
                      clickable(),
                      focusRing(theme.colors.focus, focused),
                    ];
                  }}
                >
                  <ThemedText
                    variant="caption"
                    weight={selected ? 'semibold' : 'regular'}
                    tone={selected ? 'inverse' : 'muted'}
                  >
                    {label.charAt(0)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Field>
      ) : null}

      <FormError error={error} />
    </FormSheet>
  );
}
