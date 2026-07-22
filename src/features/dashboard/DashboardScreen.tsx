import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { useToday } from '@/hooks/useToday';
import { useProfile } from '@/features/auth/useProfile';
import { formatIsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { useTasks, useToggleTaskComplete } from '@/features/tasks/api';
import { completedOn, tasksDueToday } from '@/features/tasks/grouping';
import { TaskListItem } from '@/features/tasks/TaskListItem';
import { useHabitEntries, useHabits } from '@/features/habits/api';
import { indexEntriesByDate, isCompleted, isScheduledOn } from '@/features/habits/streaks';
import { useAccountBalances } from '@/features/finance/use-balances';
import { useTransactions } from '@/features/finance/transactions-api';
import { monthRange, summarise } from '@/features/finance/reports';

/**
 * The dashboard: a read-mostly overview that answers "how am I doing" in one
 * screen, with every card linking to the feature that owns the detail.
 *
 * Nothing here is a summary the user can't verify by tapping through — the
 * numbers are the same derivations the feature screens use, not a separate
 * calculation that could drift.
 */
export function DashboardScreen() {
  const router = useRouter();
  const { today } = useToday();
  const { data: profile } = useProfile();

  const tasksQuery = useTasks();
  const habitsQuery = useHabits();
  const habitEntriesQuery = useHabitEntries(today, 7);
  const transactionsQuery = useTransactions();
  const balances = useAccountBalances();
  const toggleComplete = useToggleTaskComplete();

  const dueToday = useMemo(() => tasksDueToday(tasksQuery.data ?? [], today), [tasksQuery.data, today]);
  const doneToday = useMemo(() => completedOn(tasksQuery.data ?? [], today), [tasksQuery.data, today]);

  const habitProgress = useMemo(() => {
    const scheduled = (habitsQuery.data ?? []).filter((habit) =>
      isScheduledOn(
        {
          recurrence: habit.recurrence as 'daily' | 'weekly' | 'custom',
          by_weekday: habit.by_weekday,
          target_count: habit.target_count,
        },
        today
      )
    );

    const done = scheduled.filter((habit) => {
      const entries = indexEntriesByDate(
        (habitEntriesQuery.data ?? [])
          .filter((entry) => entry.habit_id === habit.id)
          .map((entry) => ({
            entry_date: entry.entry_date,
            count: entry.count,
            is_skipped: entry.is_skipped,
          }))
      );
      return isCompleted(entries.get(today), habit.target_count);
    });

    return { total: scheduled.length, done: done.length };
  }, [habitsQuery.data, habitEntriesQuery.data, today]);

  const thisMonth = useMemo(
    () => summarise(transactionsQuery.data ?? [], monthRange(today)),
    [transactionsQuery.data, today]
  );

  const isLoading = tasksQuery.isLoading || habitsQuery.isLoading || balances.isLoading;
  const firstName = profile?.profile.full_name?.split(' ')[0];

  function refetch() {
    void tasksQuery.refetch();
    void habitsQuery.refetch();
    void habitEntriesQuery.refetch();
    void transactionsQuery.refetch();
    balances.refetch();
  }

  return (
    <Screen
      onRefresh={refetch}
      refreshing={tasksQuery.isRefetching}
      header={
        <ScreenHeader
          title={firstName ? `Hello, ${firstName}` : 'Dashboard'}
          subtitle={formatIsoDate(today)}
          action={
            <Button label="Search" size="sm" variant="secondary" onPress={() => router.push('/search')} />
          }
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <QuickAction icon="add-circle-outline" label="Task" onPress={() => router.push('/tasks')} />
            <QuickAction icon="cash-outline" label="Spend" onPress={() => router.push('/finance')} />
            <QuickAction icon="document-text-outline" label="Note" onPress={() => router.push('/notes')} />
            <QuickAction icon="repeat-outline" label="Habits" onPress={() => router.push('/habits')} />
          </View>

          <Card style={{ gap: spacing.md }}>
            <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
              NET WORTH
            </ThemedText>
            {balances.netWorthByCurrency.size === 0 ? (
              <ThemedText variant="body" tone="muted">
                Add an account to start tracking.
              </ThemedText>
            ) : (
              [...balances.netWorthByCurrency.entries()].map(([currency, total]) => (
                <ThemedText key={currency} variant="title" tone={total < 0 ? 'negative' : 'default'}>
                  {formatMoney(total, currency)}
                </ThemedText>
              ))
            )}
            <Button
              label="Accounts"
              size="sm"
              variant="ghost"
              onPress={() => router.push('/finance/accounts')}
            />
          </Card>

          {thisMonth.map((summary) => (
            <Card key={summary.currency} style={{ gap: spacing.md }}>
              <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
                THIS MONTH · {summary.currency}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <Metric
                  label="In"
                  value={formatMoney(summary.incomeMinor, summary.currency)}
                  tone="positive"
                />
                <Metric
                  label="Out"
                  value={formatMoney(summary.expenseMinor, summary.currency)}
                  tone="negative"
                />
              </View>
              <Button label="Reports" size="sm" variant="ghost" onPress={() => router.push('/reports')} />
            </Card>
          ))}

          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
                TODAY
              </ThemedText>
              <View style={{ flex: 1 }} />
              <Button label="Open" size="sm" variant="ghost" onPress={() => router.push('/today')} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <Metric label="Tasks due" value={String(dueToday.length)} />
              <Metric label="Completed" value={String(doneToday.length)} />
              <Metric label="Habits" value={`${habitProgress.done}/${habitProgress.total}`} />
            </View>
          </Card>

          {dueToday.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
                DUE TODAY
              </ThemedText>
              <Card padded={false}>
                {dueToday.slice(0, 5).map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                  />
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <ThemedText variant="subtitle" tone={tone}>
        {value}
      </ThemedText>
      <ThemedText variant="caption" tone="muted">
        {label}
      </ThemedText>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 80,
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
      })}
    >
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <ThemedText variant="caption">{label}</ThemedText>
    </Pressable>
  );
}
