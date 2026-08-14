import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatMoney } from '@/utils/money';
import { useGoalsWithProgress } from '@/features/goals/api';

/**
 * Total saved vs. total target across every not-yet-achieved savings goal,
 * folded per currency. Renders nothing once loaded if there are no active
 * goals — matches BudgetSummaryCard's "no card is better than an empty one".
 */
export function GoalsSummaryCard() {
  const router = useRouter();
  const { data, isLoading } = useGoalsWithProgress();

  if (isLoading) {
    return (
      <Card style={{ gap: spacing.sm }}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={20} width="70%" />
      </Card>
    );
  }

  const active = data.filter((entry) => !entry.goal.is_achieved);
  if (active.length === 0) return null;

  const totalsByCurrency = new Map<string, { savedMinor: number; targetMinor: number }>();
  for (const entry of active) {
    const existing = totalsByCurrency.get(entry.goal.currency) ?? { savedMinor: 0, targetMinor: 0 };
    existing.savedMinor += entry.savedMinor;
    existing.targetMinor += entry.goal.target_amount_minor;
    totalsByCurrency.set(entry.goal.currency, existing);
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText variant="overline" tone="muted" accessibilityRole="header" style={{ flex: 1 }}>
          Savings goals
        </ThemedText>
        <Button
          label="Open"
          size="sm"
          variant="ghost"
          icon="chevron-forward"
          iconPosition="trailing"
          onPress={() => router.push('/finance/goals')}
        />
      </View>

      {[...totalsByCurrency.entries()].map(([currency, totals]) => {
        const progress = totals.targetMinor > 0 ? Math.min(1, totals.savedMinor / totals.targetMinor) : 0;

        return (
          <ProgressBar
            key={currency}
            value={progress}
            tone="positive"
            label={`${formatMoney(totals.savedMinor, currency)} of ${formatMoney(
              totals.targetMinor,
              currency
            )}`}
            hint={`${Math.round(progress * 100)}%`}
            accessibilityLabel={`Savings goals in ${currency}: ${Math.round(progress * 100)} percent saved`}
          />
        );
      })}
    </Card>
  );
}
