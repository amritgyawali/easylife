import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useHover } from '@/hooks/useHover';
import { controlHeight, radius, spacing, transition } from '@/constants/theme';
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
  /** `sm` for filter rows above a list; `md` (default) inside forms. */
  size?: 'sm' | 'md';
}

/** Single-select chip group — a lightweight, dependency-free stand-in for a native picker that works identically on Android, iOS and web. */
export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: OptionGroupProps<T>) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <ThemedText variant="label" tone="muted" weight="medium">
          {label}
        </ThemedText>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={option.value === value}
            size={size}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  size = 'md',
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: size === 'sm' ? controlHeight.sm : controlHeight.md,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected
            ? theme.colors.accentSurface
            : pressed || hovered
              ? theme.colors.surfaceAlt
              : theme.colors.surface,
          justifyContent: 'center',
        },
        transition(),
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? theme.colors.primary : theme.colors.textMuted} />
      ) : null}
      <ThemedText
        variant="label"
        tone={selected ? 'primary' : 'default'}
        weight={selected ? 'semibold' : 'medium'}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
