import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { fontFamily, fontSize, fontWeight, tabularNumbers } from '@/constants/theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption'
  /** All-caps section eyebrow — "THIS MONTH", "DUE TODAY". */
  | 'overline'
  /** Large figure in a stat tile or summary card. */
  | 'metric';

export type TextTone =
  'default' | 'muted' | 'subtle' | 'inverse' | 'positive' | 'negative' | 'warning' | 'primary';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof fontWeight;
  /**
   * Renders with fixed-width digits. Set on every amount, count and date so
   * figures line up in a column and don't jitter as values change.
   */
  numeric?: boolean;
}

const VARIANT_SIZE: Record<TextVariant, number> = {
  display: fontSize.xxxl,
  metric: fontSize.xxl,
  title: fontSize.xxl,
  subtitle: fontSize.lg,
  body: fontSize.md,
  label: fontSize.sm,
  caption: fontSize.xs,
  overline: fontSize.xs,
};

const COMPACT_VARIANT_SIZE: Record<TextVariant, number> = {
  display: 30,
  metric: 24,
  title: 24,
  subtitle: 17,
  body: 15,
  label: 13,
  caption: 12,
  overline: 11,
};

const VARIANT_DEFAULT_WEIGHT: Record<TextVariant, keyof typeof fontWeight> = {
  display: 'bold',
  metric: 'bold',
  title: 'bold',
  subtitle: 'semibold',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
  overline: 'semibold',
};

/**
 * Multiplier applied to the font size for line height. Headings get tight
 * leading so they read as a single object; body copy gets loose leading so
 * long paragraphs stay scannable.
 */
const VARIANT_LINE_HEIGHT: Record<TextVariant, number> = {
  display: 1.12,
  metric: 1.15,
  title: 1.2,
  subtitle: 1.3,
  body: 1.5,
  label: 1.4,
  caption: 1.4,
  overline: 1.4,
};

/**
 * Optical tracking. Large type needs negative tracking to avoid looking
 * gappy; small caps need positive tracking to stay legible.
 */
const VARIANT_LETTER_SPACING: Record<TextVariant, number> = {
  display: -0.8,
  metric: -0.6,
  title: -0.5,
  subtitle: -0.2,
  body: 0,
  label: 0,
  caption: 0.1,
  overline: 0.9,
};

/**
 * The only Text component that should be used directly in feature screens.
 * Centralizing variant/tone here means financial-value styling (positive /
 * negative / warning) stays visually consistent across the whole app, and
 * `accessibilityRole="header"` can be added consistently for headings later.
 */
export function ThemedText({
  variant = 'body',
  tone = 'default',
  weight,
  numeric = false,
  style,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  const toneColor: Record<TextTone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    inverse: theme.colors.textInverse,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
    primary: theme.colors.primary,
  };

  const size = compact ? COMPACT_VARIANT_SIZE[variant] : VARIANT_SIZE[variant];

  return (
    <Text
      style={[
        {
          fontFamily: fontFamily.sans,
          fontSize: size,
          lineHeight: Math.round(size * VARIANT_LINE_HEIGHT[variant]),
          letterSpacing: VARIANT_LETTER_SPACING[variant],
          fontWeight: fontWeight[weight ?? VARIANT_DEFAULT_WEIGHT[variant]],
          color: toneColor[tone],
        },
        variant === 'overline' && { textTransform: 'uppercase' },
        numeric && tabularNumbers,
        style,
      ]}
      {...rest}
    />
  );
}
