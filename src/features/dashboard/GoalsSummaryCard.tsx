import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard } from '@/components/ui/Skeleton';
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

  if (isLoading) return <SkeletonCard />;

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
      <SectionHeader
        title="Savings goals"
        count={active.length}
        action={
          <Button
            label="Open"
            size="sm"
            variant="ghost"
            icon="arrow-forward"
            iconPosition="trailing"
            onPress={() => router.push('/finance/goals')}
          />
        }
      />

      {[...totalsByCurrency.entries()].map(([currency, totals]) => {
        const progress = totals.targetMinor > 0 ? totals.savedMinor / totals.targetMinor : 0;

        return (
          <View key={currency} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <ThemedText variant="subtitle" numeric style={{ flex: 1 }}>
                {formatMoney(totals.savedMinor, currency)}
                <ThemedText variant="label" tone="muted">
                  {`  of ${formatMoney(totals.targetMinor, currency)}`}
                </ThemedText>
              </ThemedText>
              <ThemedText variant="label" weight="semibold" tone="muted">
                {Math.round(progress * 100)}%
              </ThemedText>
            </View>

            <ProgressBar
              value={progress}
              tone="positive"
              accessibilityLabel={`Savings goals in ${currency}, ${Math.round(progress * 100)} percent saved`}
            />
          </View>
        );
      })}
    </Card>
  );
}
