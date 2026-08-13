import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { fontSize, fontWeight } from '@/constants/theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption'
  /** Small, spaced, uppercase section heading — "THIS MONTH", "DUE TODAY". */
  | 'overline';
export type TextTone =
  'default' | 'muted' | 'subtle' | 'inverse' | 'positive' | 'negative' | 'warning' | 'primary';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof fontWeight;
  /** Tabular figures — keeps money columns from jittering as digits change. */
  numeric?: boolean;
}

const VARIANT_SIZE: Record<TextVariant, number> = {
  display: fontSize.xxxl,
  title: fontSize.xxl,
  subtitle: fontSize.lg,
  body: fontSize.md,
  label: fontSize.sm,
  caption: fontSize.xs,
  overline: fontSize.xs,
};

const COMPACT_VARIANT_SIZE: Record<TextVariant, number> = {
  display: 30,
  title: 24,
  subtitle: 17,
  body: 15,
  label: 13,
  caption: 12,
  overline: 11,
};

/**
 * Line height as a multiple of the font size. Headings sit tighter so a
 * two-line title reads as one block; body copy gets room to breathe.
 */
const VARIANT_LEADING: Record<TextVariant, number> = {
  display: 1.15,
  title: 1.2,
  subtitle: 1.3,
  body: 1.45,
  label: 1.4,
  caption: 1.4,
  overline: 1.35,
};

const VARIANT_DEFAULT_WEIGHT: Record<TextVariant, keyof typeof fontWeight> = {
  display: 'bold',
  title: 'bold',
  subtitle: 'semibold',
  body: 'regular',
  label: 'medium',
  caption: 'regular',
  overline: 'semibold',
};

/** Large type reads better slightly tightened; small caps need the opposite. */
const VARIANT_TRACKING: Record<TextVariant, number> = {
  display: -0.6,
  title: -0.4,
  subtitle: -0.2,
  body: 0,
  label: 0,
  caption: 0,
  overline: 0.8,
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
          fontSize: size,
          lineHeight: Math.round(size * VARIANT_LEADING[variant]),
          letterSpacing: VARIANT_TRACKING[variant],
          fontWeight: fontWeight[weight ?? VARIANT_DEFAULT_WEIGHT[variant]],
          color: toneColor[tone],
          ...(variant === 'overline' ? { textTransform: 'uppercase' as const } : null),
          ...(numeric ? { fontVariant: ['tabular-nums' as const] } : null),
        },
        style,
      ]}
      {...rest}
    />
  );
}
