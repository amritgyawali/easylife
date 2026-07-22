import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { useToday } from '@/hooks/useToday';
import { formatIsoDate, relativeDayLabel } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import type { LoanStatus } from '@/types/database';
import { useCounterparties } from '@/features/finance/counterparties-api';
import { useLoansWithEvents, type LoanRow } from '@/features/loans/api';
import { derivedStatus, outstandingMinor, repaymentProgress } from '@/features/loans/loan-math';
import { LoanFormSheet } from '@/features/loans/LoanFormSheet';
import { LoanEventSheet } from '@/features/loans/LoanEventSheet';

type Filter = 'open' | 'settled';

const STATUS_TONE: Record<LoanStatus, BadgeTone> = {
  draft: 'neutral',
  active: 'primary',
  partially_repaid: 'primary',
  overdue: 'negative',
  repaid: 'positive',
  written_off: 'warning',
  cancelled: 'neutral',
};

const SETTLED: LoanStatus[] = ['repaid', 'written_off', 'cancelled'];

export default function LoansScreen() {
  const { today } = useToday();
  const { data: loans, isLoading, error, refetch, isRefetching } = useLoansWithEvents();
  const { data: counterparties } = useCounterparties();

  const [filter, setFilter] = useState<Filter>('open');
  const [formOpen, setFormOpen] = useState(false);
  const [eventLoan, setEventLoan] = useState<LoanRow | null>(null);

  const personName = useMemo(
    () => new Map((counterparties ?? []).map((row) => [row.id, row.display_name])),
    [counterparties]
  );

  const rows = useMemo(
    () =>
      loans.map((entry) => ({
        ...entry,
        outstanding: outstandingMinor(entry.loan, entry.events),
        status: derivedStatus(entry.loan, entry.events, today),
        progress: repaymentProgress(entry.loan, entry.events),
      })),
    [loans, today]
  );

  const visible = rows.filter((row) =>
    filter === 'open' ? !SETTLED.includes(row.status) : SETTLED.includes(row.status)
  );

  // Totals answer the question the screen exists for — "am I owed, or do I
  // owe?" — and stay per currency because netting NPR against AUD without a
  // rate would be meaningless.
  const totals = useMemo(() => {
    const byCurrency = new Map<string, { lent: number; borrowed: number }>();
    for (const row of rows) {
      if (SETTLED.includes(row.status)) continue;
      const current = byCurrency.get(row.loan.currency) ?? { lent: 0, borrowed: 0 };
      if (row.loan.direction === 'lent') current.lent += row.outstanding;
      else current.borrowed += row.outstanding;
      byCurrency.set(row.loan.currency, current);
    }
    return [...byCurrency.entries()];
  }, [rows]);

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="Loans"
            subtitle="Money lent and borrowed. Balances come from recorded events."
            action={<Button label="New loan" size="sm" onPress={() => setFormOpen(true)} />}
          />
          <OptionGroup
            options={[
              { value: 'open', label: 'Open' },
              { value: 'settled', label: 'Settled' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </>
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          {filter === 'open' && totals.length > 0 ? (
            <Card style={{ gap: spacing.md }}>
              {totals.map(([currency, total]) => (
                <View key={currency} style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <ThemedText variant="caption" tone="muted">
                      Owed to me ({currency})
                    </ThemedText>
                    <ThemedText variant="subtitle" tone="positive">
                      {formatMoney(total.lent, currency)}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <ThemedText variant="caption" tone="muted">
                      I owe ({currency})
                    </ThemedText>
                    <ThemedText variant="subtitle" tone="negative">
                      {formatMoney(total.borrowed, currency)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              title={filter === 'open' ? 'No open loans' : 'Nothing settled yet'}
              description={
                filter === 'open'
                  ? 'Record money you lent to or borrowed from someone.'
                  : 'Fully repaid and written-off loans collect here.'
              }
              actionLabel={filter === 'open' ? 'New loan' : undefined}
              onAction={filter === 'open' ? () => setFormOpen(true) : undefined}
            />
          ) : (
            visible.map((row) => (
              <LoanCard
                key={row.loan.id}
                loan={row.loan}
                personName={personName.get(row.loan.counterparty_id) ?? 'Unknown person'}
                outstanding={row.outstanding}
                status={row.status}
                progress={row.progress}
                today={today}
                onPress={() => setEventLoan(row.loan)}
              />
            ))
          )}
        </>
      )}

      <LoanFormSheet visible={formOpen} onClose={() => setFormOpen(false)} />
      <LoanEventSheet
        visible={eventLoan !== null}
        loan={eventLoan}
        outstandingMinor={rows.find((row) => row.loan.id === eventLoan?.id)?.outstanding ?? 0}
        onClose={() => setEventLoan(null)}
      />
    </Screen>
  );
}

function LoanCard({
  loan,
  personName,
  outstanding,
  status,
  progress,
  today,
  onPress,
}: {
  loan: LoanRow;
  personName: string;
  outstanding: number;
  status: LoanStatus;
  progress: number;
  today: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const lent = loan.direction === 'lent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Record on loan with ${personName}`}
      onPress={onPress}
    >
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ThemedText variant="subtitle">{personName}</ThemedText>
            <ThemedText variant="caption" tone="muted">
              {lent ? 'You lent' : 'You borrowed'} {formatMoney(loan.principal_minor, loan.currency)} ·{' '}
              {formatIsoDate(loan.loan_date)}
            </ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
            <ThemedText variant="subtitle" tone={lent ? 'positive' : 'negative'}>
              {formatMoney(outstanding, loan.currency)}
            </ThemedText>
            <ThemedText variant="caption" tone="muted">
              outstanding
            </ThemedText>
          </View>
        </View>

        <View
          accessible={false}
          style={{ height: 6, borderRadius: radius.full, backgroundColor: theme.colors.surfaceAlt }}
        >
          <View
            style={{
              height: 6,
              width: `${Math.round(progress * 100)}%`,
              borderRadius: radius.full,
              backgroundColor: theme.colors.positive,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Badge label={status.replace(/_/g, ' ')} tone={STATUS_TONE[status]} />
          <Badge label={`${Math.round(progress * 100)}% repaid`} />
          {loan.due_date ? (
            <Badge
              label={`Due ${relativeDayLabel(loan.due_date, today)}`}
              tone={status === 'overdue' ? 'negative' : 'neutral'}
            />
          ) : null}
          {loan.interest_type !== 'none' ? (
            <Badge
              label={`${loan.interest_rate_percent}% ${loan.interest_period ?? ''}`.trim()}
              tone="warning"
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
