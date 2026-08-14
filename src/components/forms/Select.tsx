import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useHover } from '@/hooks/useHover';
import { controlHeight, spacing, transition } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { Field, inputSurface } from '@/components/forms/Field';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Second line in the picker list, e.g. an account's balance. */
  description?: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  /** Adds a "None" entry that clears the value. */
  clearable?: boolean;
  onClear?: () => void;
}

/**
 * Single-select for lists too long to render as chips — accounts, categories,
 * currencies, people.
 *
 * Deliberately not a native `<select>`/`Picker`: those render as three
 * different controls across web, iOS and Android and can't show a second line
 * per option. This opens the app's own bottom sheet, so the picker matches
 * every other modal surface and each option gets room for a description.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  helpText,
  required,
  disabled = false,
  clearable = false,
  onClear,
}: SelectProps<T>) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Field label={label} error={error} helpText={helpText} required={required}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${selected?.label ?? placeholder}`}
          accessibilityState={{ disabled, expanded: open }}
          disabled={disabled}
          onPress={() => setOpen(true)}
          {...hoverProps}
          style={[
            inputSurface(theme, { invalid: Boolean(error), disabled }),
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              minHeight: controlHeight.md,
              borderColor: hovered && !disabled ? theme.colors.borderStrong : undefined,
            },
            transition(),
          ]}
        >
          <ThemedText
            variant="body"
            tone={selected ? 'default' : 'subtle'}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {selected?.label ?? placeholder}
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
        </Pressable>
      </Field>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)} body="flush">
        {clearable ? (
          <ListRow
            title="None"
            divider={false}
            onPress={() => {
              onClear?.();
              setOpen(false);
            }}
            trailing={
              value == null ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : <View />
            }
          />
        ) : null}
        {options.map((option, index) => (
          <ListRow
            key={option.value}
            title={option.label}
            subtitle={option.description}
            divider={index > 0 || clearable}
            onPress={() => {
              onChange(option.value);
              setOpen(false);
            }}
            trailing={
              option.value === value ? (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              ) : (
                <View />
              )
            }
          />
        ))}
      </BottomSheet>
    </>
  );
}
