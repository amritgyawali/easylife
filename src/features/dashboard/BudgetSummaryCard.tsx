import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
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

  if (isLoading) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={20} width="70%" />
      </Card>
    );
  }

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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText variant="overline" tone="muted" accessibilityRole="header" style={{ flex: 1 }}>
          Budget this period
        </ThemedText>
        <Button
          label="Open"
          size="sm"
          variant="ghost"
          icon="chevron-forward"
          iconPosition="trailing"
          onPress={() => router.push('/finance/budgets')}
        />
      </View>

      {[...totalsByCurrency.entries()].map(([currency, totals]) => {
        const overspent = totals.spentMinor > totals.plannedMinor;
        const progress = totals.plannedMinor > 0 ? Math.min(1, totals.spentMinor / totals.plannedMinor) : 0;

        return (
          <ProgressBar
            key={currency}
            value={progress}
            tone={overspent ? 'negative' : 'primary'}
            label={`${formatMoney(totals.spentMinor, currency)} of ${formatMoney(
              totals.plannedMinor,
              currency
            )}`}
            hint={overspent ? 'Over' : `${Math.round(progress * 100)}%`}
            accessibilityLabel={`Budget in ${currency}: ${Math.round(progress * 100)} percent spent${
              overspent ? ', over budget' : ''
            }`}
          />
        );
      })}
    </Card>
  );
}
