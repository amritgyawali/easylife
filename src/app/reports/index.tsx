import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { useToday } from '@/hooks/useToday';
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
      onRefresh={() => void transactionsQuery.refetch()}
      refreshing={transactionsQuery.isRefetching}
      header={
        <>
          <ScreenHeader title="Reports" subtitle={range.label} />
          <OptionGroup options={monthOptions} value={monthsBack} onChange={setMonthsBack} />
          {currencyOptions.length > 1 ? (
            <OptionGroup
              label="Currency"
              options={currencyOptions}
              value={activeCurrency ?? ''}
              onChange={setCurrency}
            />
          ) : null}
        </>
      }
    >
      {transactionsQuery.isLoading ? (
        <SkeletonList rows={5} />
      ) : transactionsQuery.error ? (
        <ErrorState error={transactionsQuery.error} onRetry={() => void transactionsQuery.refetch()} />
      ) : !summary || !activeCurrency ? (
        <EmptyState
          title="Nothing to report for this month"
          description="Record some income or spending and the breakdown appears here. Transfers between your own accounts are always excluded."
        />
      ) : (
        <>
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <Total
                label="Income"
                value={formatMoney(summary.incomeMinor, activeCurrency)}
                tone="positive"
              />
              <Total
                label="Spent"
                value={formatMoney(summary.expenseMinor, activeCurrency)}
                tone="negative"
              />
            </View>
            <View style={{ gap: spacing.xxs }}>
              <ThemedText variant="caption" tone="muted">
                {summary.netMinor >= 0 ? 'Left over' : 'Overspent by'}
              </ThemedText>
              <ThemedText variant="title" tone={summary.netMinor >= 0 ? 'positive' : 'negative'}>
                {formatMoney(Math.abs(summary.netMinor), activeCurrency)}
              </ThemedText>
            </View>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
              WHERE IT WENT
            </ThemedText>
            {expenseTotals.length === 0 ? (
              <Card>
                <ThemedText variant="body" tone="muted">
                  No spending recorded this month.
                </ThemedText>
              </Card>
            ) : (
              <Card style={{ gap: spacing.md }}>
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
            <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
              LAST {TREND_MONTHS} MONTHS
            </ThemedText>
            <Card padded={false}>
              {trend.map((month) => (
                <View
                  key={month.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                  }}
                >
                  <ThemedText variant="body" style={{ flex: 1 }}>
                    {month.label}
                  </ThemedText>
                  <ThemedText variant="caption" tone="positive">
                    +{formatMoney(month.incomeMinor, activeCurrency, { showCurrency: false })}
                  </ThemedText>
                  <ThemedText variant="caption" tone="negative">
                    -{formatMoney(month.expenseMinor, activeCurrency, { showCurrency: false })}
                  </ThemedText>
                </View>
              ))}
            </Card>
          </View>
        </>
      )}
    </Screen>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <ThemedText variant="caption" tone="muted">
        {label}
      </ThemedText>
      <ThemedText variant="subtitle" tone={tone}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * A labelled proportion bar. The percentage is always spelled out in text
 * next to the bar so the value never depends on reading the bar's width.
 */
function CategoryBar({ label, amount, share }: { label: string; amount: string; share: number }) {
  const theme = useTheme();
  const percent = Math.round(share * 100);

  return (
    <View style={{ gap: spacing.xs }} accessibilityLabel={`${label}: ${amount}, ${percent} percent`}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ThemedText variant="body" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText variant="body" weight="semibold">
          {amount}
        </ThemedText>
        <ThemedText variant="body" tone="muted">
          {percent}%
        </ThemedText>
      </View>
      <View
        accessible={false}
        style={{ height: 6, borderRadius: radius.full, backgroundColor: theme.colors.surfaceAlt }}
      >
        <View
          style={{
            height: 6,
            width: `${Math.max(percent, 1)}%`,
            borderRadius: radius.full,
            backgroundColor: theme.colors.primary,
          }}
        />
      </View>
    </View>
  );
}
