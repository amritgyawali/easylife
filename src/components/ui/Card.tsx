import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useHover } from '@/hooks/useHover';
import { elevation, radius, spacing, transition } from '@/constants/theme';

export type CardVariant =
  /** Default: hairline border on the surface color. */
  | 'outlined'
  /** Lifted with a soft shadow — use sparingly, for the one card that leads a screen. */
  | 'elevated'
  /** Recessed fill, for grouping inside another card. */
  | 'sunken'
  /** Tinted with the accent, for the primary summary on a screen. */
  | 'accent';

export interface CardProps extends ViewProps {
  padded?: boolean;
  variant?: CardVariant;
  /** Turns the whole card into a button. Adds hover/press feedback. */
  onPress?: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
}

/**
 * The container every block of content on every screen sits in.
 *
 * One component owns the radius/border/elevation relationship so cards can't
 * drift apart screen by screen. `variant` is how a screen expresses hierarchy
 * — an elevated summary above outlined detail cards — rather than each screen
 * hand-rolling its own shadow and border values.
 */
export function Card({ style, padded = true, variant = 'outlined', onPress, children, ...rest }: CardProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const { hovered, hoverProps } = useHover();

  const background: Record<CardVariant, string> = {
    outlined: theme.colors.surface,
    elevated: theme.colors.surface,
    sunken: theme.colors.surfaceSunken,
    accent: theme.colors.accentSurface,
  };

  const borderColor: Record<CardVariant, string> = {
    outlined: theme.colors.border,
    elevated: theme.colors.border,
    sunken: theme.colors.border,
    accent: 'transparent',
  };

  const base = [
    {
      backgroundColor: background[variant],
      borderRadius: compact ? radius.md : radius.lg,
      borderWidth: 1,
      borderColor: borderColor[variant],
      padding: padded ? (compact ? spacing.md : spacing.lg) : 0,
      overflow: 'hidden' as const,
    },
    variant === 'elevated' ? elevation('md', theme.mode) : null,
    transition(),
  ];

  if (!onPress) {
    return (
      <View style={[base, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel}
      testID={rest.testID}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        base,
        // Lifting on hover and settling on press is the cheapest way to make
        // a surface feel like a control rather than a static panel.
        hovered && !pressed
          ? { borderColor: theme.colors.borderStrong, ...elevation('md', theme.mode) }
          : null,
        pressed ? { backgroundColor: theme.colors.surfaceAlt } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
