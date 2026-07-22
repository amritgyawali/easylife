import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { addDays, formatIsoDate, isIsoDate, type IsoDate } from '@/utils/date';

export interface DateFieldProps {
  label: string;
  value: IsoDate | null;
  onChange: (value: IsoDate | null) => void;
  /** "Today" relative to the user's timezone — see `useToday`. */
  today: IsoDate;
  clearable?: boolean;
}

/**
 * Date entry without a native date-picker dependency.
 *
 * `@react-native-community/datetimepicker` renders three different UIs across
 * Android/iOS/web and needs a development build; the overwhelmingly common
 * cases here are "today", "tomorrow" and "next week", so those are one tap,
 * and anything else is typed as `YYYY-MM-DD` — the same format the database
 * stores, so nothing is lost in translation. Invalid text is simply not
 * committed, leaving the previous value intact.
 */
export function DateField({ label, value, onChange, today, clearable = true }: DateFieldProps) {
  const theme = useTheme();

  // The text box holds a partial value while it is being typed ("2026-07-2"
  // is not yet a date), so it needs its own state; it re-syncs whenever the
  // committed value changes from outside, e.g. by tapping a preset.
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);

  const presets: { label: string; date: IsoDate | null }[] = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Next week', date: addDays(today, 7) },
    ...(clearable ? [{ label: 'No date', date: null }] : []),
  ];

  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="label" tone="muted">
        {label}
      </ThemedText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {presets.map((preset) => {
          const selected = preset.date === value;
          return (
            <Pressable
              key={preset.label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(preset.date)}
              style={{
                minHeight: minTouchTarget,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? theme.colors.accentSurface : theme.colors.surface,
              }}
            >
              <ThemedText variant="label" tone={selected ? 'primary' : 'default'}>
                {preset.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        accessibilityLabel={`${label}, as year-month-day`}
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          if (text === '') onChange(null);
          else if (isIsoDate(text)) onChange(text);
        }}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          minHeight: minTouchTarget,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          color: theme.colors.text,
          backgroundColor: theme.colors.surface,
        }}
      />

      {value ? (
        <ThemedText variant="caption" tone="muted">
          {formatIsoDate(value)}
        </ThemedText>
      ) : null}
    </View>
  );
}
