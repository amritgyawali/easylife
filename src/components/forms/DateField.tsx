import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { controlHeight, fontSize, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { Field, inputChrome, useFieldFocus } from '@/components/forms/Field';
import { clickable, focusRing, pressState, transition, webStyle } from '@/utils/interaction';
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
 *
 * The day-stepper buttons cover the other common case ("the day after the one
 * I just picked") without making the user retype a whole date.
 */
export function DateField({ label, value, onChange, today, clearable = true, error }: DateFieldProps) {
  const theme = useTheme();
  const focus = useFieldFocus();

  // The text box holds a partial value while it is being typed ("2026-07-2"
  // is not yet a date), so it needs its own state; it re-syncs whenever the
  // committed value changes from outside, e.g. by tapping a preset.
  const [draft, setDraft] = useState<string>(value ?? '');
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
      helpText={value ? formatIsoDate(value) : undefined}
      labelAction={
        value ? (
          <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
            <IconButton
              icon="chevron-back"
              accessibilityLabel="Previous day"
              control="sm"
              size={16}
              onPress={() => onChange(addDays(value, -1))}
            />
            <IconButton
              icon="chevron-forward"
              accessibilityLabel="Next day"
              control="sm"
              size={16}
              onPress={() => onChange(addDays(value, 1))}
            />
          </View>
        ) : null
      }
    >
      <View
        style={[
          inputChrome(theme, { focused: focus.focused, invalid: Boolean(error) }),
          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 0 },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={focus.focused ? theme.colors.primary : theme.colors.textMuted}
        />
        <TextInput
          accessibilityLabel={`${label}, as year-month-day`}
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            if (text === '') onChange(null);
            else if (isIsoDate(text)) onChange(text);
          }}
          onFocus={focus.onFocus}
          onBlur={() => {
            focus.onBlur();
            // Drop half-typed text on blur rather than leaving the field
            // showing something that was never committed.
            setDraft(value ?? '');
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="numeric"
          style={[
            { flex: 1, color: theme.colors.text, fontSize: fontSize.md, paddingVertical: spacing.sm },
            webStyle({ outlineStyle: 'none', fontVariantNumeric: 'tabular-nums' }),
          ]}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xxs }}>
        {presets.map((preset) => {
          const selected = preset.date === value;
          return (
            <Pressable
              key={preset.label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={preset.label}
              onPress={() => onChange(preset.date)}
              hitSlop={6}
              style={(state) => {
                const { hovered, focused } = pressState(state);
                return [
                  {
                    minHeight: controlHeight.sm,
                    paddingHorizontal: spacing.md,
                    justifyContent: 'center' as const,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: selected
                      ? theme.colors.primary
                      : hovered
                        ? theme.colors.borderStrong
                        : theme.colors.border,
                    backgroundColor: selected
                      ? theme.colors.accentSurface
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
                variant="label"
                tone={selected ? 'primary' : 'muted'}
                weight={selected ? 'semibold' : 'regular'}
              >
                {preset.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}
