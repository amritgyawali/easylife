import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
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
  const { breakdown, converted, targetCurrency, isLoading } = useNetWorth();

  if (isLoading) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={30} width="60%" />
      </Card>
    );
  }

  const hasAnything = breakdown.totalsByCurrency.size > 0;

  return (
    <Card style={{ gap: spacing.md }}>
      <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
        NET WORTH
      </ThemedText>

      {!hasAnything ? (
        <ThemedText variant="body" tone="muted">
          Add an account, holding or loan to start tracking.
        </ThemedText>
      ) : (
        <>
          <ThemedText variant="title" tone={converted.totalMinor < 0 ? 'negative' : 'default'}>
            {formatMoney(converted.totalMinor, targetCurrency)}
          </ThemedText>

          {converted.unconvertible.length > 0 ? (
            <ThemedText variant="caption" tone="warning">
              Excludes {converted.unconvertible.join(', ')} — no exchange rate recorded.
            </ThemedText>
          ) : null}

          {converted.oldestRateDate ? (
            <ThemedText variant="caption" tone="muted">
              Converted using rates from {formatIsoDate(converted.oldestRateDate)}.
            </ThemedText>
          ) : null}

          {converted.unvaluedAssetCount > 0 ? (
            <ThemedText variant="caption" tone="warning">
              Excludes {converted.unvaluedAssetCount} holding
              {converted.unvaluedAssetCount === 1 ? '' : 's'} with no price recorded.
            </ThemedText>
          ) : null}

          {!compact ? (
            <View style={{ gap: spacing.xs }}>
              {breakdown.components
                .filter((component) => component.totalsByCurrency.size > 0)
                .map((component) => (
                  <View
                    key={component.label}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                  >
                    <ThemedText variant="caption" tone="muted" style={{ flex: 1 }}>
                      {component.label}
                    </ThemedText>
                    <ThemedText variant="caption">
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
