import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export interface OptionGroupProps<T extends string> {
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Single-select chip group — a lightweight, dependency-free stand-in for a native picker that works identically on Android, iOS and web. */
export function OptionGroup<T extends string>({ label, options, value, onChange }: OptionGroupProps<T>) {
  const theme = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <ThemedText variant="label" tone="muted">
          {label}
        </ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: minTouchTarget,
                paddingHorizontal: spacing.md,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? theme.colors.accentSurface : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThemedText
                variant="label"
                tone={selected ? 'primary' : 'default'}
                weight={selected ? 'semibold' : 'regular'}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
