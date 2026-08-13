import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { controlHeight, radius, spacing } from '@/constants/theme';
import { ThemedText, type TextVariant } from '@/components/ui/ThemedText';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'leading' | 'trailing';
  style?: ViewStyle;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = {
  sm: controlHeight.sm,
  md: controlHeight.md,
  lg: controlHeight.lg,
};

const SIZE_PADDING: Record<ButtonSize, number> = {
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

const SIZE_TEXT: Record<ButtonSize, TextVariant> = {
  sm: 'label',
  md: 'label',
  lg: 'body',
};

const SIZE_ICON: Record<ButtonSize, number> = {
  sm: 16,
  md: 18,
  lg: 20,
};

/**
 * The app's only button. Variants map to intent, not to appearance, so a
 * screen never has to decide what "the destructive one" looks like:
 * `primary` for the one action a screen exists for, `secondary` for the
 * supporting one, `subtle`/`ghost` for low-emphasis rows of actions, and
 * `danger` for anything that deletes.
 *
 * `sm` buttons are deliberately below the 44px touch minimum only in width
 * terms — the height stays at 36 with generous `hitSlop`, which keeps header
 * action rows from dominating a phone screen while staying reachable.
 */
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
  const isDisabled = disabled || loading;

  const background: Record<ButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.surface,
    subtle: theme.colors.surfaceAlt,
    ghost: 'transparent',
    danger: theme.colors.negative,
  };

  const hoverBackground: Record<ButtonVariant, string> = {
    primary: theme.colors.primaryHover,
    secondary: theme.colors.surfaceHover,
    subtle: theme.colors.surfaceHover,
    ghost: theme.colors.surfaceAlt,
    danger: theme.colors.negative,
  };

  const textTone: Record<ButtonVariant, 'inverse' | 'default' | 'primary' | 'negative'> = {
    primary: 'inverse',
    secondary: 'default',
    subtle: 'default',
    ghost: 'primary',
    danger: 'inverse',
  };

  const iconColor: Record<ButtonVariant, string> = {
    primary: theme.colors.primaryText,
    secondary: theme.colors.text,
    subtle: theme.colors.text,
    ghost: theme.colors.primary,
    danger: theme.colors.primaryText,
  };

  const bordered = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 8 : 4}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            minHeight: SIZE_HEIGHT[size],
            paddingHorizontal: SIZE_PADDING[size],
            borderRadius: radius.md,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            flexDirection: 'row' as const,
            gap: spacing.sm,
            backgroundColor: hovered && !isDisabled ? hoverBackground[variant] : background[variant],
            borderWidth: bordered ? 1 : 0,
            borderColor: hovered ? theme.colors.borderStrong : theme.colors.border,
            opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1,
            width: fullWidth ? ('100%' as const) : undefined,
            transform: pressed && !isDisabled ? [{ scale: 0.985 }] : undefined,
          },
          transition(),
          clickable(!isDisabled),
          focusRing(theme.colors.focus, focused),
          style as ViewStyle,
        ];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor[variant]} />
      ) : (
        <>
          {icon && iconPosition === 'leading' ? (
            <Ionicons name={icon} size={SIZE_ICON[size]} color={iconColor[variant]} />
          ) : null}
          <ThemedText
            variant={SIZE_TEXT[size]}
            weight="semibold"
            tone={textTone[variant]}
            numberOfLines={1}
            style={{ lineHeight: undefined }}
          >
            {label}
          </ThemedText>
          {icon && iconPosition === 'trailing' ? (
            <Ionicons name={icon} size={SIZE_ICON[size]} color={iconColor[variant]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/**
 * Horizontal action row that turns into a stack on very narrow screens, so a
 * "Cancel / Save" pair never squeezes its labels to two characters wide.
 */
export function ButtonRow({
  children,
  stacked = false,
}: {
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        gap: spacing.sm,
        alignItems: stacked ? 'stretch' : 'center',
      }}
    >
      {children}
    </View>
  );
}

/** Exposed for rows that need to line another control up with a button. */
export const buttonHeight = SIZE_HEIGHT;
