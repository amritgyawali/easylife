import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemedText } from '@/components/ui/ThemedText';
import { SearchInput } from '@/components/forms/SearchInput';
import { useTasks } from '@/features/tasks/api';
import { useNotes } from '@/features/notes/api';
import { useTransactions } from '@/features/finance/transactions-api';
import { kindLabel, search } from '@/features/search/search';

/** One place to look for anything: tasks, notes and transactions at once. */
export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: tasks } = useTasks();
  const { data: notes } = useNotes();
  const { data: transactions } = useTransactions();

  const [query, setQuery] = useState('');

  const results = useMemo(
    () =>
      search(query, {
        tasks: tasks ?? [],
        notes: notes ?? [],
        transactions: transactions ?? [],
      }),
    [query, tasks, notes, transactions]
  );

  return (
    <Screen
      header={
        <>
          <ScreenHeader title="Search" subtitle="Tasks, notes and transactions." />
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search everything"
            autoFocus
            accessibilityLabel="Search tasks, notes and transactions"
          />
        </>
      }
    >
      {query.trim().length === 0 ? (
        <EmptyState title="Start typing" description="Results appear as you type." />
      ) : results.length === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for "${query.trim()}".`} />
      ) : (
        <Card padded={false}>
          {results.map((result) => (
            <Pressable
              key={`${result.kind}-${result.id}`}
              accessibilityRole="link"
              accessibilityLabel={`${kindLabel(result.kind)}: ${result.title}`}
              onPress={() => router.push(result.href)}
              style={({ pressed }) => ({
                gap: spacing.xs,
                padding: spacing.md,
                backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ThemedText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {result.title}
                </ThemedText>
                <Badge label={kindLabel(result.kind)} />
              </View>
              <ThemedText variant="caption" tone="muted" numberOfLines={1}>
                {result.subtitle}
              </ThemedText>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}
