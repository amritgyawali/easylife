import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useHover } from '@/hooks/useHover';
import { minTouchTarget, radius, transition } from '@/constants/theme';

export type IconButtonTone = 'default' | 'muted' | 'primary' | 'negative';
export type IconButtonVariant = 'plain' | 'soft' | 'outlined';

export interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Required: an icon alone gives a screen reader nothing to announce. */
  accessibilityLabel: string;
  onPress: () => void;
  tone?: IconButtonTone;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  /** Marks a toggle as on, e.g. an active filter. */
  selected?: boolean;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'muted',
  variant = 'plain',
  size = 20,
  disabled = false,
  selected = false,
}: IconButtonProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  const color: Record<IconButtonTone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    negative: theme.colors.negative,
  };

  const resting =
    variant === 'soft'
      ? theme.colors.surfaceAlt
      : variant === 'outlined'
        ? theme.colors.surface
        : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      {...hoverProps}
      style={({ pressed }) => [
        {
          minWidth: minTouchTarget,
          minHeight: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: theme.colors.border,
          backgroundColor: selected
            ? theme.colors.accentSurface
            : pressed || hovered
              ? theme.colors.surfaceAlt
              : resting,
          opacity: disabled ? 0.45 : 1,
        },
        transition(),
      ]}
    >
      <Ionicons name={icon} size={size} color={selected ? theme.colors.primary : color[tone]} />
    </Pressable>
  );
}
