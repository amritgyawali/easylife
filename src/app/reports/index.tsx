import { useMemo, useState } from 'react';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { Section } from '@/components/ui/Section';
import { Stat, StatRow, HeroStat } from '@/components/ui/Stat';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { SegmentedControl } from '@/components/forms/SegmentedControl';
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
          <OptionGroup options={monthOptions} value={monthsBack} onChange={setMonthsBack} size="sm" />
          {currencyOptions.length > 1 ? (
            <SegmentedControl
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
        <SkeletonCards count={3} />
      ) : transactionsQuery.error ? (
        <ErrorState error={transactionsQuery.error} onRetry={() => void transactionsQuery.refetch()} />
      ) : !summary || !activeCurrency ? (
        <EmptyState
          title="Nothing to report for this month"
          description="Record some income or spending and the breakdown appears here. Transfers between your own accounts are always excluded."
        />
      ) : (
        <>
          <Card variant="elevated" style={{ gap: spacing.lg }}>
            <HeroStat
              label={summary.netMinor >= 0 ? 'Left over' : 'Overspent by'}
              value={formatMoney(Math.abs(summary.netMinor), activeCurrency)}
              tone={summary.netMinor >= 0 ? 'positive' : 'negative'}
              hint={`${range.label} · ${summary.transactionCount} transaction${
                summary.transactionCount === 1 ? '' : 's'
              }`}
            />
            <StatRow>
              <Stat
                label="Income"
                value={formatMoney(summary.incomeMinor, activeCurrency)}
                tone="positive"
                icon="arrow-down-outline"
              />
              <Stat
                label="Spent"
                value={formatMoney(summary.expenseMinor, activeCurrency)}
                tone="negative"
                icon="arrow-up-outline"
              />
            </StatRow>
          </Card>

          <Section title="Where it went" description="Spending by category, largest first.">
            {expenseTotals.length === 0 ? (
              <Card>
                <ThemedText variant="body" tone="muted">
                  No spending recorded this month.
                </ThemedText>
              </Card>
            ) : (
              <Card style={{ gap: spacing.lg }}>
                {expenseTotals.map((total) => {
                  const label = total.categoryId
                    ? (categoryName.get(total.categoryId) ?? 'Removed category')
                    : 'Uncategorised';
                  const percent = Math.round(total.share * 100);
                  return (
                    <ProgressBar
                      key={total.categoryId ?? 'uncategorised'}
                      value={total.share}
                      label={label}
                      hint={`${formatMoney(total.totalMinor, total.currency)} · ${percent}%`}
                      accessibilityLabel={`${label}: ${formatMoney(
                        total.totalMinor,
                        total.currency
                      )}, ${percent} percent of spending`}
                    />
                  );
                })}
              </Card>
            )}
          </Section>

          <Section title={`Last ${TREND_MONTHS} months`}>
            <DataTable
              data={trend}
              keyExtractor={(month) => month.label}
              accessibilityLabel="Monthly income and spending"
              columns={trendColumns(activeCurrency)}
            />
          </Section>
        </>
      )}
    </Screen>
  );
}

/**
 * Columns for the monthly trend table. Declared once and handed to
 * `DataTable`, which renders them as a real table on a laptop and as stacked
 * label/value rows on a phone.
 */
function trendColumns(currency: string): Column<{
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
}>[] {
  return [
    { key: 'month', header: 'Month', render: (month) => month.label, flex: 1.4, compact: 'title' },
    {
      key: 'income',
      header: 'In',
      numeric: true,
      render: (month) => (
        <ThemedText variant="body" tone="positive" numeric numberOfLines={1}>
          +{formatMoney(month.incomeMinor, currency, { showCurrency: false })}
        </ThemedText>
      ),
    },
    {
      key: 'expense',
      header: 'Out',
      numeric: true,
      render: (month) => (
        <ThemedText variant="body" tone="negative" numeric numberOfLines={1}>
          -{formatMoney(month.expenseMinor, currency, { showCurrency: false })}
        </ThemedText>
      ),
    },
    {
      key: 'net',
      header: 'Net',
      numeric: true,
      compact: 'meta',
      render: (month) => (
        <ThemedText
          variant="body"
          weight="semibold"
          tone={month.netMinor >= 0 ? 'positive' : 'negative'}
          numeric
          numberOfLines={1}
        >
          {month.netMinor >= 0 ? '+' : '-'}
          {formatMoney(Math.abs(month.netMinor), currency, { showCurrency: false })}
        </ThemedText>
      ),
    },
  ];
}
