import type { ComponentProps } from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { controlHeight, minTouchTarget, radius } from '@/constants/theme';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export type IconButtonTone = 'default' | 'muted' | 'primary' | 'negative';
export type IconButtonVariant = 'plain' | 'soft' | 'outline';
export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Required: an icon alone gives a screen reader nothing to announce. */
  accessibilityLabel: string;
  onPress: () => void;
  tone?: IconButtonTone;
  variant?: IconButtonVariant;
  /** Icon glyph size. The tap target stays at least 44px regardless. */
  size?: number;
  control?: IconButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Square icon-only control for row actions (edit, delete, archive) and
 * compact toolbars. The visible box can be smaller than the finger target —
 * the Pressable is always at least `minTouchTarget` — so dense list rows stay
 * usable on a phone without looking heavy on a desktop.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'muted',
  variant = 'plain',
  size = 20,
  control = 'md',
  disabled = false,
  style,
}: IconButtonProps) {
  const theme = useTheme();

  const color: Record<IconButtonTone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    negative: theme.colors.negative,
  };

  const restingBackground: Record<IconButtonVariant, string> = {
    plain: 'transparent',
    soft: theme.colors.surfaceAlt,
    outline: theme.colors.surface,
  };

  const box = control === 'sm' ? controlHeight.sm : minTouchTarget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={control === 'sm' ? 8 : 4}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            width: box,
            height: box,
            minWidth: box,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            borderRadius: radius.md,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: hovered ? theme.colors.borderStrong : theme.colors.border,
            backgroundColor: pressed || hovered ? theme.colors.surfaceHover : restingBackground[variant],
            opacity: disabled ? 0.45 : 1,
          },
          transition(),
          clickable(!disabled),
          focusRing(theme.colors.focus, focused),
          style as ViewStyle,
        ];
      }}
    >
      <Ionicons name={icon} size={size} color={color[tone]} />
    </Pressable>
  );
}
