import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const SIZE_PADDING: Record<ButtonSize, number> = {
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.surfaceAlt,
    ghost: 'transparent',
    danger: theme.colors.negative,
  };

  const textToneByVariant: Record<ButtonVariant, 'inverse' | 'default' | 'primary'> = {
    primary: 'inverse',
    secondary: 'default',
    ghost: 'primary',
    danger: 'inverse',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={8}
      style={(state) => [
        styles.base,
        {
          minHeight: minTouchTarget,
          paddingVertical: SIZE_PADDING[size],
          paddingHorizontal: spacing.lg,
          backgroundColor: backgroundByVariant[variant],
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: theme.colors.border,
          opacity: isDisabled
            ? 0.6
            : typeof state === 'object' && 'pressed' in state && state.pressed
              ? 0.85
              : 1,
          width: fullWidth ? '100%' : undefined,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'danger' ? theme.colors.primaryText : theme.colors.primary
          }
        />
      ) : (
        <ThemedText variant="label" weight="semibold" tone={textToneByVariant[variant]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
