import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type StatTone = 'default' | 'positive' | 'negative' | 'warning' | 'primary';

export interface StatProps {
  label: string;
  value: string;
  tone?: StatTone;
  /** Secondary line under the value — a comparison, a period, a count. */
  hint?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** `tile` draws its own inset background; `plain` sits directly on a card. */
  variant?: 'plain' | 'tile';
  size?: 'md' | 'lg';
}

/**
 * A single number with its label — the unit every summary card is built from.
 *
 * Values use tabular figures so a column of amounts lines up digit for digit,
 * and the label sits *below* the value: on a phone the number is what you scan
 * for, and putting it first stops the eye having to read a label to find it.
 */
export function Stat({
  label,
  value,
  tone = 'default',
  hint,
  icon,
  variant = 'plain',
  size = 'md',
}: StatProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  const iconColor: Record<StatTone, string> = {
    default: theme.colors.textMuted,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
    primary: theme.colors.primary,
  };

  return (
    <View
      style={{
        flex: 1,
        minWidth: 108,
        gap: spacing.xxs,
        ...(variant === 'tile'
          ? {
              padding: compact ? spacing.md : spacing.lg,
              borderRadius: radius.md,
              backgroundColor: theme.colors.surfaceSunken,
            }
          : null),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icon ? <Ionicons name={icon} size={14} color={iconColor[tone]} /> : null}
        <ThemedText variant="overline" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </ThemedText>
      </View>
      <ThemedText variant={size === 'lg' ? 'title' : 'subtitle'} tone={tone} numeric numberOfLines={1}>
        {value}
      </ThemedText>
      {hint ? (
        <ThemedText variant="caption" tone="subtle" numberOfLines={1}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Row of stats that wraps instead of squeezing when the screen is narrow. */
export function StatRow({ children }: { children: React.ReactNode }) {
  const compact = useCompactLayout();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: compact ? spacing.md : spacing.lg,
      }}
    >
      {children}
    </View>
  );
}
