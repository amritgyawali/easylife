import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight } from '@/constants/theme';

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';
export type TextTone = 'default' | 'muted' | 'inverse' | 'positive' | 'negative' | 'warning' | 'primary';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof fontWeight;
}

const VARIANT_SIZE: Record<TextVariant, number> = {
  display: fontSize.xxxl,
  title: fontSize.xxl,
  subtitle: fontSize.lg,
  body: fontSize.md,
  label: fontSize.sm,
  caption: fontSize.xs,
};

const VARIANT_DEFAULT_WEIGHT: Record<TextVariant, keyof typeof fontWeight> = {
  display: 'bold',
  title: 'bold',
  subtitle: 'semibold',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
};

/**
 * The only Text component that should be used directly in feature screens.
 * Centralizing variant/tone here means financial-value styling (positive /
 * negative / warning) stays visually consistent across the whole app, and
 * `accessibilityRole="header"` can be added consistently for headings later.
 */
export function ThemedText({ variant = 'body', tone = 'default', weight, style, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const toneColor: Record<TextTone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    inverse: theme.colors.textInverse,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
    primary: theme.colors.primary,
  };

  return (
    <Text
      style={[
        {
          fontSize: VARIANT_SIZE[variant],
          fontWeight: fontWeight[weight ?? VARIANT_DEFAULT_WEIGHT[variant]],
          color: toneColor[tone],
        },
        style,
      ]}
      {...rest}
    />
  );
}
