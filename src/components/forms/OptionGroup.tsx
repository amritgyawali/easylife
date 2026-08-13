import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { controlHeight, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Field } from '@/components/forms/Field';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export interface OptionGroupProps<T extends string> {
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * `chips` (default) wraps freely and suits long or open-ended lists.
   * `segmented` renders one connected control — right for 2–3 mutually
   * exclusive views, like To do / Completed.
   */
  variant?: 'chips' | 'segmented';
  helpText?: string;
  error?: string | null;
}

/**
 * Single-select control — a dependency-free stand-in for a native picker that
 * behaves identically on Android, iOS and web.
 *
 * Chips are 36px tall rather than the 44px touch minimum, with `hitSlop`
 * making up the difference: at 44px a category picker with a dozen options ate
 * half a phone screen, while the tap target stays comfortably above the
 * minimum either way.
 */
export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = 'chips',
  helpText,
  error,
}: OptionGroupProps<T>) {
  const theme = useTheme();

  const body =
    variant === 'segmented' ? (
      <View
        accessibilityRole="radiogroup"
        style={{
          flexDirection: 'row',
          padding: spacing.xxs,
          borderRadius: radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={(state) => {
                const { hovered, focused } = pressState(state);
                return [
                  {
                    flex: 1,
                    flexDirection: 'row',
                    minHeight: controlHeight.sm,
                    gap: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    alignItems: 'center' as const,
                    justifyContent: 'center' as const,
                    borderRadius: radius.sm,
                    backgroundColor: selected
                      ? theme.colors.surface
                      : hovered
                        ? theme.colors.surfaceHover
                        : 'transparent',
                    ...(selected ? theme.elevation.sm : null),
                  },
                  transition(),
                  clickable(),
                  focusRing(theme.colors.focus, focused),
                ];
              }}
            >
              {option.icon ? (
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={selected ? theme.colors.text : theme.colors.textMuted}
                />
              ) : null}
              <ThemedText
                variant="label"
                tone={selected ? 'default' : 'muted'}
                weight={selected ? 'semibold' : 'medium'}
                numberOfLines={1}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    ) : (
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              hitSlop={6}
              style={(state) => {
                const { pressed, hovered, focused } = pressState(state);
                return [
                  {
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    justifyContent: 'center' as const,
                    gap: spacing.xs,
                    minHeight: controlHeight.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.full,
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
                    opacity: pressed ? 0.85 : 1,
                  },
                  transition(),
                  clickable(),
                  focusRing(theme.colors.focus, focused),
                ];
              }}
            >
              {option.icon ? (
                <Ionicons
                  name={option.icon}
                  size={15}
                  color={selected ? theme.colors.primaryText : theme.colors.textMuted}
                />
              ) : null}
              <ThemedText
                variant="label"
                tone={selected ? 'inverse' : 'default'}
                weight={selected ? 'semibold' : 'regular'}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );

  if (!label && !helpText && !error) return body;

  return (
    <Field label={label} helpText={helpText} error={error}>
      {body}
    </Field>
  );
}
