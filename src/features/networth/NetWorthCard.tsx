import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Divider } from '@/components/ui/Divider';
import { formatIsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { useNetWorth } from '@/features/networth/use-net-worth';

export interface NetWorthCardProps {
  /** Hides the per-component breakdown on compact surfaces like the dashboard. */
  compact?: boolean;
}

/**
 * Net worth across accounts, investments and loans.
 *
 * Every caveat is stated on the card rather than hidden: which currencies had
 * no rate, how old the oldest rate used was, and how many holdings have no
 * price. A single confident number built on missing data would be worse than
 * a smaller number that says what it excludes.
 */
export function NetWorthCard({ compact = false }: NetWorthCardProps) {
  const theme = useTheme();
  const { breakdown, converted, targetCurrency, isLoading } = useNetWorth();

  if (isLoading) return <SkeletonCard />;

  const hasAnything = breakdown.totalsByCurrency.size > 0;
  const negative = converted.totalMinor < 0;

  const caveats = [
    converted.unconvertible.length > 0
      ? `Excludes ${converted.unconvertible.join(', ')} — no exchange rate recorded.`
      : null,
    converted.unvaluedAssetCount > 0
      ? `Excludes ${converted.unvaluedAssetCount} holding${
          converted.unvaluedAssetCount === 1 ? '' : 's'
        } with no price recorded.`
      : null,
  ].filter((caveat): caveat is string => caveat !== null);

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader title="Net worth" />

      {!hasAnything ? (
        <ThemedText variant="body" tone="muted">
          Add an account, holding or loan to start tracking.
        </ThemedText>
      ) : (
        <>
          <View style={{ gap: spacing.xxs }}>
            <ThemedText variant="display" tone={negative ? 'negative' : 'default'} numeric>
              {formatMoney(converted.totalMinor, targetCurrency)}
            </ThemedText>
            {converted.oldestRateDate ? (
              <ThemedText variant="caption" tone="subtle">
                Converted using rates from {formatIsoDate(converted.oldestRateDate)}
              </ThemedText>
            ) : null}
          </View>

          {caveats.map((caveat) => (
            <View key={caveat} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={theme.colors.warning}
                style={{ marginTop: 2 }}
              />
              <ThemedText variant="caption" tone="warning" style={{ flex: 1 }}>
                {caveat}
              </ThemedText>
            </View>
          ))}

          {!compact ? (
            <View style={{ gap: spacing.sm }}>
              <Divider />
              {breakdown.components
                .filter((component) => component.totalsByCurrency.size > 0)
                .map((component) => (
                  <View
                    key={component.label}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                  >
                    <ThemedText variant="label" tone="muted" style={{ flex: 1 }}>
                      {component.label}
                    </ThemedText>
                    <ThemedText variant="label" weight="medium" numeric>
                      {[...component.totalsByCurrency.entries()]
                        .map(([currency, total]) => formatMoney(total, currency))
                        .join(' · ')}
                    </ThemedText>
                  </View>
                ))}
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}
