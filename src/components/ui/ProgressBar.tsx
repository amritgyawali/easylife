import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/constants/theme';

export type ProgressTone = 'primary' | 'positive' | 'negative' | 'warning';

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped rather than overflowing. */
  value: number;
  tone?: ProgressTone;
  height?: number;
  /** Announced to screen readers, e.g. "Groceries budget, 62% spent". */
  accessibilityLabel?: string;
}

/**
 * The one progress indicator: budgets, savings goals, loan payoff, import
 * progress. Reported to assistive tech as a `progressbar` with its value, so
 * the fill isn't the only way to read it.
 */
export function ProgressBar({ value, tone = 'primary', height = 8, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

  const fill: Record<ProgressTone, string> = {
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radius.full,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: fill[tone],
        }}
      />
    </View>
  );
}
