import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useHover } from '@/hooks/useHover';
import { controlHeight, elevation, fontSize, radius, spacing, transition } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type ButtonVariant =
  /** The one affirmative action on a screen or sheet. */
  | 'primary'
  /** Neutral bordered action — "Cancel", secondary navigation. */
  | 'secondary'
  /** Tinted, low-weight emphasis. Sits between primary and ghost. */
  | 'tonal'
  /** Text-only action for inline/table use. */
  | 'ghost'
  /** Destructive confirmation. */
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** Leading icon. Decorative — the label still carries the meaning. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Moves the icon after the label, e.g. a trailing chevron. */
  iconPosition?: 'leading' | 'trailing';
  style?: object;
}

const SIZE_SPEC: Record<ButtonSize, { height: number; paddingX: number; font: number; icon: number }> = {
  sm: { height: controlHeight.sm, paddingX: spacing.md, font: fontSize.sm, icon: 16 },
  md: { height: controlHeight.md, paddingX: spacing.lg, font: fontSize.md, icon: 18 },
  lg: { height: controlHeight.lg, paddingX: spacing.xl, font: fontSize.md, icon: 20 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'leading',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  const isDisabled = disabled || loading;
  const spec = SIZE_SPEC[size];

  const background: Record<ButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.surface,
    tonal: theme.colors.accentSurface,
    ghost: 'transparent',
    danger: theme.colors.negative,
  };

  const hoverBackground: Record<ButtonVariant, string> = {
    primary: theme.colors.primaryHover,
    secondary: theme.colors.surfaceAlt,
    tonal: theme.colors.accentSurface,
    ghost: theme.colors.surfaceAlt,
    danger: theme.colors.negative,
  };

  const foreground: Record<ButtonVariant, string> = {
    primary: theme.colors.primaryText,
    secondary: theme.colors.text,
    tonal: theme.colors.primary,
    ghost: theme.colors.primary,
    danger: theme.colors.textInverse,
  };

  const bordered = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 8 : 0}
      {...hoverProps}
      style={({ pressed }) => [
        {
          minHeight: spec.height,
          paddingVertical: spacing.sm,
          paddingHorizontal: spec.paddingX,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          backgroundColor: hovered && !isDisabled ? hoverBackground[variant] : background[variant],
          borderWidth: bordered ? 1 : 0,
          borderColor: hovered ? theme.colors.borderStrong : theme.colors.border,
          opacity: isDisabled ? 0.5 : 1,
          width: fullWidth ? '100%' : undefined,
          // A press that visibly compresses reads as a physical control; the
          // effect is deliberately small so it never looks bouncy.
          transform: pressed && !isDisabled ? [{ scale: 0.98 }] : undefined,
        },
        variant === 'primary' && !isDisabled ? elevation('sm', theme.mode) : null,
        transition(),
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground[variant]} />
      ) : (
        <>
          {icon && iconPosition === 'leading' ? (
            <Ionicons name={icon} size={spec.icon} color={foreground[variant]} />
          ) : null}
          <ThemedText
            variant="label"
            weight="semibold"
            style={{ fontSize: spec.font, color: foreground[variant] }}
            numberOfLines={1}
          >
            {label}
          </ThemedText>
          {icon && iconPosition === 'trailing' ? (
            <Ionicons name={icon} size={spec.icon} color={foreground[variant]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/**
 * Right-aligned action row for sheet footers and card actions, so the button
 * order (dismissive left, affirmative right) is consistent everywhere.
 */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>{children}</View>
  );
}
