import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type ProgressTone = 'primary' | 'positive' | 'negative' | 'warning';

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped, so overspend can't overflow. */
  value: number;
  tone?: ProgressTone;
  /** Accessible description, e.g. "Groceries budget: 62% used". */
  accessibilityLabel: string;
  /** Caption row above the bar. */
  label?: string;
  /** Right-hand caption above the bar, e.g. "NPR 4,200 of 8,000". */
  hint?: string;
  height?: number;
}

/**
 * Budget/goal/loan progress. Announced as a progressbar with its percentage
 * so the value is available without seeing the fill, and clamped so a 140%
 * overspend renders as a full bar in the negative tone rather than painting
 * outside its track.
 */
export function ProgressBar({
  value,
  tone = 'primary',
  accessibilityLabel,
  label,
  hint,
  height = 8,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  const fill: Record<ProgressTone, string> = {
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
  };

  return (
    <View style={{ gap: spacing.xs }}>
      {label || hint ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          {label ? (
            <ThemedText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {label}
            </ThemedText>
          ) : null}
          {hint ? (
            <ThemedText variant="caption" tone="muted" numeric>
              {hint}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

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
    </View>
  );
}
