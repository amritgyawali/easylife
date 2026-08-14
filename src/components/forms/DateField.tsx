import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing, transition } from '@/constants/theme';
import { Field, inputSurface, inputText } from '@/components/forms/Field';
import { Chip } from '@/components/forms/OptionGroup';
import { addDays, formatIsoDate, isIsoDate, type IsoDate } from '@/utils/date';

export interface DateFieldProps {
  label: string;
  value: IsoDate | null;
  onChange: (value: IsoDate | null) => void;
  /** "Today" relative to the user's timezone — see `useToday`. */
  today: IsoDate;
  clearable?: boolean;
  error?: string | null;
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
export function DateField({ label, value, onChange, today, clearable = true, error }: DateFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

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
    <Field
      label={label}
      error={error}
      helpText={value ? formatIsoDate(value) : 'Pick a shortcut, or type a date as YYYY-MM-DD.'}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {presets.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            size="sm"
            selected={preset.date === value}
            onPress={() => onChange(preset.date)}
          />
        ))}
      </View>

      <View
        style={[
          inputSurface(theme, { focused, invalid: Boolean(error) }),
          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
          transition(),
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={focused ? theme.colors.primary : theme.colors.textMuted}
        />
        <TextInput
          accessibilityLabel={`${label}, as year-month-day`}
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            if (text === '') onChange(null);
            else if (isIsoDate(text)) onChange(text);
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputText(theme)}
        />
      </View>
    </Field>
  );
}
