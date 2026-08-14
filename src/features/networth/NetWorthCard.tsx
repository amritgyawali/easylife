import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { Divider } from '@/components/ui/Divider';
import { DetailRow } from '@/components/ui/Stat';
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
      <Card variant="elevated" style={{ gap: spacing.sm }}>
        <Skeleton height={12} width="35%" />
        <Skeleton height={36} width="60%" />
        <Skeleton height={12} width="45%" />
      </Card>
    );
  }

  const hasAnything = breakdown.totalsByCurrency.size > 0;
  const components = breakdown.components.filter((component) => component.totalsByCurrency.size > 0);

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
    <Card variant="elevated" style={{ gap: spacing.md }}>
      <ThemedText variant="overline" tone="muted" accessibilityRole="header">
        Net worth
      </ThemedText>

      {!hasAnything ? (
        <ThemedText variant="body" tone="muted">
          Add an account, holding or loan to start tracking.
        </ThemedText>
      ) : (
        <>
          <ThemedText
            variant="display"
            tone={converted.totalMinor < 0 ? 'negative' : 'default'}
            numeric
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatMoney(converted.totalMinor, targetCurrency)}
          </ThemedText>

          {converted.oldestRateDate ? (
            <ThemedText variant="caption" tone="subtle">
              Converted using rates from {formatIsoDate(converted.oldestRateDate)}.
            </ThemedText>
          ) : null}

          {caveats.map((caveat) => (
            <Caveat key={caveat} message={caveat} />
          ))}

          {!compact && components.length > 0 ? (
            <>
              <Divider />
              <View style={{ gap: spacing.xs }}>
                {components.map((component) => (
                  <DetailRow
                    key={component.label}
                    label={component.label}
                    value={[...component.totalsByCurrency.entries()]
                      .map(([currency, total]) => formatMoney(total, currency))
                      .join(' · ')}
                  />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </Card>
  );
}

/** An exclusion the total couldn't account for, stated plainly next to it. */
function Caveat({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
      <Ionicons name="alert-circle-outline" size={13} color={theme.colors.warning} style={{ marginTop: 2 }} />
      <ThemedText variant="caption" tone="warning" style={{ flex: 1 }}>
        {message}
      </ThemedText>
    </View>
  );
}
