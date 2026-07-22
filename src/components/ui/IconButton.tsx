import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius } from '@/constants/theme';

export interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Required: an icon alone gives a screen reader nothing to announce. */
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'default' | 'muted' | 'primary' | 'negative';
  size?: number;
  disabled?: boolean;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'muted',
  size = 20,
  disabled = false,
}: IconButtonProps) {
  const theme = useTheme();

  const color: Record<NonNullable<IconButtonProps['tone']>, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    negative: theme.colors.negative,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        minWidth: minTouchTarget,
        minHeight: minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Ionicons name={icon} size={size} color={color[tone]} />
    </Pressable>
  );
}
