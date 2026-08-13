import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToday } from '@/hooks/useToday';
import { formatMoney } from '@/utils/money';
import { budgetPeriodRange } from '@/features/budgets/progress';
import { useBudgetsWithProgress } from '@/features/budgets/api';

/**
 * How the *current* period's budget(s) are doing, folded to one card per
 * currency. Renders nothing once loaded if no budget covers today — an empty
 * "0 of 0 spent" card would be noise, not a summary.
 */
export function BudgetSummaryCard() {
  const router = useRouter();
  const { today } = useToday();
  const { data, isLoading } = useBudgetsWithProgress();

  if (isLoading) return <SkeletonCard />;

  const current = data.filter((entry) => {
    const range = budgetPeriodRange(entry.budget);
    return today >= range.from && today <= range.to;
  });

  if (current.length === 0) return null;

  const totalsByCurrency = new Map<string, { plannedMinor: number; spentMinor: number }>();
  for (const entry of current) {
    const existing = totalsByCurrency.get(entry.budget.currency) ?? { plannedMinor: 0, spentMinor: 0 };
    existing.plannedMinor += entry.totals.plannedMinor;
    existing.spentMinor += entry.totals.spentMinor;
    totalsByCurrency.set(entry.budget.currency, existing);
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader
        title="Budget this period"
        action={
          <Button
            label="Open"
            size="sm"
            variant="ghost"
            icon="arrow-forward"
            iconPosition="trailing"
            onPress={() => router.push('/finance/budgets')}
          />
        }
      />

      {[...totalsByCurrency.entries()].map(([currency, totals]) => {
        const overspent = totals.spentMinor > totals.plannedMinor;
        const progress = totals.plannedMinor > 0 ? totals.spentMinor / totals.plannedMinor : 0;
        const remaining = totals.plannedMinor - totals.spentMinor;

        return (
          <View key={currency} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <ThemedText variant="subtitle" numeric style={{ flex: 1 }}>
                {formatMoney(totals.spentMinor, currency)}
                <ThemedText variant="label" tone="muted">
                  {`  of ${formatMoney(totals.plannedMinor, currency)}`}
                </ThemedText>
              </ThemedText>
              <ThemedText variant="label" weight="semibold" tone={overspent ? 'negative' : 'muted'}>
                {overspent ? 'Over' : `${Math.round(progress * 100)}%`}
              </ThemedText>
            </View>

            <ProgressBar
              value={progress}
              tone={overspent ? 'negative' : progress > 0.85 ? 'warning' : 'primary'}
              accessibilityLabel={`Budget in ${currency}, ${Math.round(progress * 100)} percent spent`}
            />

            <ThemedText variant="caption" tone={overspent ? 'negative' : 'muted'}>
              {overspent
                ? `${formatMoney(Math.abs(remaining), currency)} over budget`
                : `${formatMoney(remaining, currency)} left`}
            </ThemedText>
          </View>
        );
      })}
    </Card>
  );
}
