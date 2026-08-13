import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Stat, StatRow } from '@/components/ui/Stat';
import { List, ListRow } from '@/components/ui/List';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { useToday } from '@/hooks/useToday';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { formatMoney } from '@/utils/money';
import { useCategories } from '@/features/finance/categories-api';
import { useTransactions } from '@/features/finance/transactions-api';
import {
  monthRange,
  monthlyTrend,
  shiftMonth,
  summarise,
  totalsByCategory,
} from '@/features/finance/reports';

/** Months offered in the period switcher, newest first. */
const MONTH_CHOICES = 6;
const TREND_MONTHS = 6;

export default function ReportsScreen() {
  const { today } = useToday();
  const compact = useCompactLayout();
  const transactionsQuery = useTransactions();
  const { data: categories } = useCategories();

  const [monthsBack, setMonthsBack] = useState('0');
  const [currency, setCurrency] = useState<string | null>(null);

  const range = useMemo(() => monthRange(shiftMonth(today, Number(monthsBack))), [today, monthsBack]);
  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);

  const summaries = useMemo(() => summarise(transactions, range), [transactions, range]);

  // Default to whichever currency the user actually transacts in most, rather
  // than assuming NPR — someone paid in AUD shouldn't open an empty report.
  const activeCurrency =
    currency ?? [...summaries].sort((a, b) => b.transactionCount - a.transactionCount)[0]?.currency ?? null;

  const summary = summaries.find((row) => row.currency === activeCurrency);

  const expenseTotals = useMemo(
    () => (activeCurrency ? totalsByCategory(transactions, range, activeCurrency, 'expense') : []),
    [transactions, range, activeCurrency]
  );

  const trend = useMemo(
    () => (activeCurrency ? monthlyTrend(transactions, today, activeCurrency, TREND_MONTHS) : []),
    [transactions, today, activeCurrency]
  );

  const categoryName = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories]
  );

  const monthOptions = Array.from({ length: MONTH_CHOICES }, (_, index) => ({
    value: String(index),
    label: monthRange(shiftMonth(today, index)).label.replace(/ \d{4}$/, ''),
  }));

  const currencyOptions = summaries.map((row) => ({ value: row.currency, label: row.currency }));

  return (
    <Screen
      width="wide"
      onRefresh={() => void transactionsQuery.refetch()}
      refreshing={transactionsQuery.isRefetching}
      header={
        <>
          <ScreenHeader
            eyebrow="Money"
            title="Reports"
            subtitle={`${range.label} · transfers between your own accounts are excluded`}
          />
          <View style={{ flexDirection: compact ? 'column' : 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <OptionGroup options={monthOptions} value={monthsBack} onChange={setMonthsBack} />
            </View>
            {currencyOptions.length > 1 ? (
              <OptionGroup
                variant="segmented"
                options={currencyOptions}
                value={activeCurrency ?? ''}
                onChange={setCurrency}
              />
            ) : null}
          </View>
        </>
      }
    >
      {transactionsQuery.isLoading ? (
        <SkeletonList rows={5} />
      ) : transactionsQuery.error ? (
        <ErrorState error={transactionsQuery.error} onRetry={() => void transactionsQuery.refetch()} />
      ) : !summary || !activeCurrency ? (
        <EmptyState
          icon="bar-chart-outline"
          title="Nothing to report for this month"
          description="Record some income or spending and the breakdown appears here. Transfers between your own accounts are always excluded."
        />
      ) : (
        <>
          <Card>
            <StatRow>
              <Stat
                label="Money in"
                value={formatMoney(summary.incomeMinor, activeCurrency)}
                tone="positive"
                icon="arrow-down"
                size="lg"
              />
              <Stat
                label="Money out"
                value={formatMoney(summary.expenseMinor, activeCurrency)}
                tone="negative"
                icon="arrow-up"
                size="lg"
              />
              <Stat
                label={summary.netMinor >= 0 ? 'Left over' : 'Overspent by'}
                value={formatMoney(Math.abs(summary.netMinor), activeCurrency)}
                tone={summary.netMinor >= 0 ? 'positive' : 'negative'}
                hint={`${summary.transactionCount} transactions`}
                size="lg"
              />
            </StatRow>
          </Card>

          <Grid minColumnWidth={360} maxColumns={2}>
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Where it went" />
              {expenseTotals.length === 0 ? (
                <Card>
                  <ThemedText variant="body" tone="muted">
                    No spending recorded this month.
                  </ThemedText>
                </Card>
              ) : (
                <Card style={{ gap: spacing.lg }}>
                  {expenseTotals.map((total) => (
                    <CategoryBar
                      key={total.categoryId ?? 'uncategorised'}
                      label={
                        total.categoryId
                          ? (categoryName.get(total.categoryId) ?? 'Removed category')
                          : 'Uncategorised'
                      }
                      amount={formatMoney(total.totalMinor, total.currency)}
                      share={total.share}
                    />
                  ))}
                </Card>
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title={`Last ${TREND_MONTHS} months`} />
              <List>
                {trend.map((month) => (
                  <ListRow
                    key={month.label}
                    title={month.label}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
                        <ThemedText variant="label" tone="positive" numeric>
                          +{formatMoney(month.incomeMinor, activeCurrency, { showCurrency: false })}
                        </ThemedText>
                        <ThemedText variant="label" tone="negative" numeric>
                          -{formatMoney(month.expenseMinor, activeCurrency, { showCurrency: false })}
                        </ThemedText>
                      </View>
                    }
                  />
                ))}
              </List>
            </View>
          </Grid>
        </>
      )}
    </Screen>
  );
}

/**
 * A labelled proportion bar. The percentage is always spelled out in text
 * next to the bar so the value never depends on reading the bar's width.
 */
function CategoryBar({ label, amount, share }: { label: string; amount: string; share: number }) {
  const percent = Math.round(share * 100);

  return (
    <View style={{ gap: spacing.xs }} accessibilityLabel={`${label}: ${amount}, ${percent} percent`}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline' }}>
        <ThemedText variant="label" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText variant="label" weight="semibold" numeric>
          {amount}
        </ThemedText>
        <ThemedText variant="caption" tone="muted" numeric>
          {percent}%
        </ThemedText>
      </View>
      <ProgressBar value={share} height={6} />
    </View>
  );
}
