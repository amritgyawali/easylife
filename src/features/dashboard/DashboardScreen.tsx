import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useHover } from '@/hooks/useHover';
import { radius, spacing, transition } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { Stat, StatRow } from '@/components/ui/Stat';
import { SkeletonCards, SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToday } from '@/hooks/useToday';
import { useProfile } from '@/features/auth/useProfile';
import { formatIsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { useTasks, useToggleTaskComplete } from '@/features/tasks/api';
import { completedOn, tasksDueToday } from '@/features/tasks/grouping';
import { TaskListItem } from '@/features/tasks/TaskListItem';
import { useHabitEntries, useHabits } from '@/features/habits/api';
import { indexEntriesByDate, isCompleted, isScheduledOn } from '@/features/habits/streaks';
import { NetWorthCard } from '@/features/networth/NetWorthCard';
import { useNetWorth } from '@/features/networth/use-net-worth';
import { useTransactions } from '@/features/finance/transactions-api';
import { monthRange, summarise } from '@/features/finance/reports';
import { BudgetSummaryCard } from '@/features/dashboard/BudgetSummaryCard';
import { GoalsSummaryCard } from '@/features/dashboard/GoalsSummaryCard';

/** Greeting that matches the time of day the user actually opened the app. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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
  const compact = useCompactLayout();
  const { today } = useToday();
  const { data: profile } = useProfile();

  const tasksQuery = useTasks();
  const habitsQuery = useHabits();
  const habitEntriesQuery = useHabitEntries(today, 7);
  const transactionsQuery = useTransactions();
  const netWorth = useNetWorth();
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

  const isLoading = tasksQuery.isLoading || habitsQuery.isLoading || netWorth.isLoading;
  const firstName = profile?.profile.full_name?.split(' ')[0];

  function refetch() {
    void tasksQuery.refetch();
    void habitsQuery.refetch();
    void habitEntriesQuery.refetch();
    void transactionsQuery.refetch();
    netWorth.refetch();
  }

  return (
    <Screen
      onRefresh={refetch}
      refreshing={tasksQuery.isRefetching}
      header={
        <ScreenHeader
          title={firstName ? `${greeting()}, ${firstName}` : 'Dashboard'}
          subtitle={formatIsoDate(today)}
          action={
            <Button
              label="Search"
              icon="search"
              size="sm"
              variant="secondary"
              onPress={() => router.push('/search')}
            />
          }
        />
      }
    >
      {isLoading ? (
        <>
          <SkeletonCards count={compact ? 2 : 4} />
          <SkeletonList rows={4} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <QuickAction icon="checkbox-outline" label="Tasks" onPress={() => router.push('/tasks')} />
            <QuickAction icon="cash-outline" label="Spend" onPress={() => router.push('/finance')} />
            <QuickAction icon="document-text-outline" label="Notes" onPress={() => router.push('/notes')} />
            <QuickAction icon="repeat-outline" label="Habits" onPress={() => router.push('/habits')} />
            <QuickAction icon="scan-outline" label="Scan" onPress={() => router.push('/scan')} />
          </View>

          {/* Two columns on a desktop viewport: the money summary reads on the
              left while today's commitments stay visible on the right, instead
              of the user scrolling past one to reach the other. */}
          <View
            style={{
              flexDirection: compact ? 'column' : 'row',
              gap: compact ? spacing.md : spacing.lg,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, gap: compact ? spacing.md : spacing.lg, width: '100%', minWidth: 0 }}>
              <NetWorthCard />
              <BudgetSummaryCard />
              <GoalsSummaryCard />
            </View>

            <View style={{ flex: 1, gap: compact ? spacing.md : spacing.lg, width: '100%', minWidth: 0 }}>
              <Card style={{ gap: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ThemedText variant="overline" tone="muted" accessibilityRole="header" style={{ flex: 1 }}>
                    Today
                  </ThemedText>
                  <Button
                    label="Open"
                    size="sm"
                    variant="ghost"
                    icon="chevron-forward"
                    iconPosition="trailing"
                    onPress={() => router.push('/today')}
                  />
                </View>
                <StatRow>
                  <Stat label="Tasks due" value={String(dueToday.length)} icon="time-outline" />
                  <Stat
                    label="Completed"
                    value={String(doneToday.length)}
                    tone={doneToday.length > 0 ? 'positive' : 'default'}
                    icon="checkmark-circle-outline"
                  />
                  <Stat
                    label="Habits"
                    value={`${habitProgress.done}/${habitProgress.total}`}
                    icon="repeat-outline"
                  />
                </StatRow>
              </Card>

              {thisMonth.map((summary) => (
                <Card key={summary.currency} style={{ gap: spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText
                      variant="overline"
                      tone="muted"
                      accessibilityRole="header"
                      style={{ flex: 1 }}
                    >
                      This month · {summary.currency}
                    </ThemedText>
                    <Button
                      label="Reports"
                      size="sm"
                      variant="ghost"
                      icon="chevron-forward"
                      iconPosition="trailing"
                      onPress={() => router.push('/reports')}
                    />
                  </View>
                  <StatRow>
                    <Stat
                      label="In"
                      value={formatMoney(summary.incomeMinor, summary.currency)}
                      tone="positive"
                      delta={{ value: 'Income', direction: 'up' }}
                    />
                    <Stat
                      label="Out"
                      value={formatMoney(summary.expenseMinor, summary.currency)}
                      tone="negative"
                      delta={{ value: 'Spending', direction: 'down' }}
                    />
                  </StatRow>
                </Card>
              ))}
            </View>
          </View>

          <Section
            title="Due today"
            count={dueToday.length}
            action={
              dueToday.length > 5 ? (
                <Button label="See all" size="sm" variant="ghost" onPress={() => router.push('/today')} />
              ) : null
            }
          >
            <Card padded={false}>
              {dueToday.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon="checkmark-done-outline"
                  title="Nothing due today"
                  description="Enjoy it — or get a head start on something from your task list."
                />
              ) : (
                dueToday
                  .slice(0, 5)
                  .map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      today={today}
                      onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                    />
                  ))
              )}
            </Card>
          </Section>
        </>
      )}
    </Screen>
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
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: 88,
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: hovered ? theme.colors.primary : theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
          transform: pressed ? [{ scale: 0.98 }] : undefined,
        },
        transition(),
      ]}
    >
      <View
        accessible={false}
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.accentSurface,
        }}
      >
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <ThemedText variant="caption" weight="medium">
        {label}
      </ThemedText>
    </Pressable>
  );
}
