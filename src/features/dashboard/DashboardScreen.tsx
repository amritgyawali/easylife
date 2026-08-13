import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { List } from '@/components/ui/List';
import { Button } from '@/components/ui/Button';
import { Stat, StatRow } from '@/components/ui/Stat';
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
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

/**
 * The dashboard: a read-mostly overview that answers "how am I doing" in one
 * screen, with every card linking to the feature that owns the detail.
 *
 * Nothing here is a summary the user can't verify by tapping through — the
 * numbers are the same derivations the feature screens use, not a separate
 * calculation that could drift. The cards flow into one column on a phone and
 * into a responsive grid on a desktop, so a wide window shows the whole
 * picture without scrolling instead of one tall ribbon of cards.
 */
export function DashboardScreen() {
  const router = useRouter();
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
      width="wide"
      onRefresh={refetch}
      refreshing={tasksQuery.isRefetching}
      header={
        <ScreenHeader
          title={firstName ? `Hello, ${firstName}` : 'Dashboard'}
          subtitle={formatIsoDate(today)}
          // No header action: quick capture is the floating button on a phone
          // and the top bar's "New" on desktop, and search has its own home in
          // both. A third entry point here would just be a duplicate.
        />
      }
    >
      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonList rows={4} />
        </>
      ) : (
        <>
          {/* Fixed-width cells rather than flex-grow: with five shortcuts the
              second row would otherwise stretch its two tiles to double width. */}
          <Grid minColumnWidth={104} maxColumns={5} gap={spacing.sm}>
            <QuickAction icon="add-circle-outline" label="Task" onPress={() => router.push('/tasks')} />
            <QuickAction icon="cash-outline" label="Spend" onPress={() => router.push('/finance')} />
            <QuickAction icon="document-text-outline" label="Note" onPress={() => router.push('/notes')} />
            <QuickAction icon="repeat-outline" label="Habits" onPress={() => router.push('/habits')} />
            <QuickAction icon="scan-outline" label="Scan" onPress={() => router.push('/scan')} />
          </Grid>

          <Grid minColumnWidth={320} maxColumns={2}>
            <NetWorthCard
              action={
                <Button
                  label="Accounts"
                  size="sm"
                  variant="ghost"
                  icon="arrow-forward"
                  iconPosition="trailing"
                  onPress={() => router.push('/finance/accounts')}
                />
              }
            />

            <Card style={{ gap: spacing.md }}>
              <SectionHeader
                title="Today"
                action={
                  <Button
                    label="Open"
                    size="sm"
                    variant="ghost"
                    icon="arrow-forward"
                    iconPosition="trailing"
                    onPress={() => router.push('/today')}
                  />
                }
              />
              <StatRow>
                <Stat label="Tasks due" value={String(dueToday.length)} icon="checkbox-outline" />
                <Stat
                  label="Completed"
                  value={String(doneToday.length)}
                  tone="positive"
                  icon="checkmark-done-outline"
                />
                <Stat
                  label="Habits"
                  value={`${habitProgress.done}/${habitProgress.total}`}
                  icon="repeat-outline"
                />
              </StatRow>
            </Card>

            {thisMonth.map((summary) => (
              <Card key={summary.currency} style={{ gap: spacing.md }}>
                <SectionHeader
                  title={`This month · ${summary.currency}`}
                  action={
                    <Button
                      label="Reports"
                      size="sm"
                      variant="ghost"
                      icon="arrow-forward"
                      iconPosition="trailing"
                      onPress={() => router.push('/reports')}
                    />
                  }
                />
                <StatRow>
                  <Stat
                    label="Money in"
                    value={formatMoney(summary.incomeMinor, summary.currency)}
                    tone="positive"
                    icon="arrow-down"
                  />
                  <Stat
                    label="Money out"
                    value={formatMoney(summary.expenseMinor, summary.currency)}
                    tone="negative"
                    icon="arrow-up"
                  />
                  <Stat
                    label="Net"
                    value={formatMoney(summary.incomeMinor - summary.expenseMinor, summary.currency)}
                    tone={summary.incomeMinor - summary.expenseMinor < 0 ? 'negative' : 'default'}
                  />
                </StatRow>
              </Card>
            ))}

            <BudgetSummaryCard />
            <GoalsSummaryCard />
          </Grid>

          {dueToday.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title="Due today"
                count={dueToday.length}
                action={
                  <Button
                    label="All tasks"
                    size="sm"
                    variant="ghost"
                    icon="arrow-forward"
                    iconPosition="trailing"
                    onPress={() => router.push('/tasks')}
                  />
                }
              />
              <List>
                {dueToday.slice(0, 6).map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    today={today}
                    hideDueDate
                    onToggle={(value) => toggleComplete.mutate({ id: task.id, completed: value })}
                    onPress={() => router.push('/tasks')}
                  />
                ))}
              </List>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

/**
 * Compact shortcut tile. Sized to wrap two-up on the narrowest phones and to
 * sit in a single row from tablet width upward.
 */
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
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            alignItems: 'center' as const,
            gap: spacing.xs,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: hovered ? theme.colors.borderStrong : theme.colors.border,
            backgroundColor: pressed || hovered ? theme.colors.surfaceHover : theme.colors.surface,
          },
          transition(),
          clickable(),
          focusRing(theme.colors.focus, focused),
        ];
      }}
    >
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <ThemedText variant="caption" weight="medium">
        {label}
      </ThemedText>
    </Pressable>
  );
}
