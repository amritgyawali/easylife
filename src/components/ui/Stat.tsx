import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { ThemedText, type TextTone } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';

export interface StatProps {
  label: string;
  value: string;
  tone?: TextTone;
  /** Secondary line under the value — a comparison or a period. */
  hint?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /**
   * Signed change indicator. The arrow and the sign both encode direction, so
   * meaning never rests on the colour alone.
   */
  delta?: { value: string; direction: 'up' | 'down' };
}

/**
 * A single figure with its label — the unit every summary card is built from.
 * Values render with tabular figures so a row of stats stays aligned and
 * doesn't shift horizontally as the numbers update.
 */
export function Stat({ label, value, tone = 'default', hint, icon, delta }: StatProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  return (
    <View style={{ flex: 1, minWidth: 120, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icon ? <Ionicons name={icon} size={13} color={theme.colors.textMuted} /> : null}
        <ThemedText variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </ThemedText>
      </View>

      {/* Two stats sit side by side on a 360px phone, which leaves ~150px for
          a value like "NPR 185,000.00". `adjustsFontSizeToFit` is iOS-only, so
          relying on it truncated the amount on web and Android instead of
          shrinking it — the size steps down explicitly here instead. */}
      <ThemedText
        variant={compact ? 'subtitle' : 'metric'}
        weight="bold"
        tone={tone}
        numeric
        numberOfLines={1}
      >
        {value}
      </ThemedText>

      {delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <Ionicons
            name={delta.direction === 'up' ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={delta.direction === 'up' ? theme.colors.positive : theme.colors.negative}
          />
          <ThemedText
            variant="caption"
            tone={delta.direction === 'up' ? 'positive' : 'negative'}
            weight="medium"
            numeric
          >
            {delta.value}
          </ThemedText>
        </View>
      ) : null}

      {hint ? (
        <ThemedText variant="caption" tone="subtle" numberOfLines={1}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export interface StatCardProps extends StatProps {
  onPress?: () => void;
  variant?: 'outlined' | 'elevated' | 'accent';
}

/** A `Stat` in its own card, for the KPI row at the top of a screen. */
export function StatCard({ onPress, variant = 'outlined', ...stat }: StatCardProps) {
  return (
    <Card variant={variant} onPress={onPress} style={{ flex: 1, minWidth: 150 }}>
      <Stat {...stat} />
    </Card>
  );
}

/**
 * Responsive row of stats: side by side with dividers on a wide viewport,
 * wrapping into a two-up grid on a phone.
 */
export function StatRow({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: compact ? spacing.md : spacing.xl,
        rowGap: spacing.lg,
      }}
    >
      {children}
    </View>
  );
}

/**
 * Compact key/value line for detail panels — a label on the left, its value
 * right-aligned, repeated down a card.
 */
export function DetailRow({
  label,
  value,
  tone = 'default',
  numeric = true,
}: {
  label: string;
  value: ReactNode;
  tone?: TextTone;
  numeric?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        minHeight: 28,
      }}
    >
      <ThemedText variant="label" tone="muted" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      {typeof value === 'string' ? (
        <ThemedText variant="label" tone={tone} weight="semibold" numeric={numeric}>
          {value}
        </ThemedText>
      ) : (
        value
      )}
    </View>
  );
}

/**
 * Tinted callout for a single headline figure — the "net worth" or "left to
 * spend" number a screen is really about.
 */
export function HeroStat({
  label,
  value,
  tone = 'default',
  hint,
  action,
}: {
  label: string;
  value: string;
  tone?: TextTone;
  hint?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        gap: spacing.xs,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: theme.colors.accentSurface,
      }}
    >
      <ThemedText variant="overline" tone="muted">
        {label}
      </ThemedText>
      <ThemedText variant="display" tone={tone} numeric numberOfLines={1}>
        {value}
      </ThemedText>
      {hint ? (
        <ThemedText variant="caption" tone="muted">
          {hint}
        </ThemedText>
      ) : null}
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}
