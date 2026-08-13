import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { List, ListRow } from '@/components/ui/List';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/forms/SearchInput';
import { useTasks } from '@/features/tasks/api';
import { useNotes } from '@/features/notes/api';
import { useTransactions } from '@/features/finance/transactions-api';
import { kindLabel, search } from '@/features/search/search';

/** Icon per result kind, so the list is scannable without reading each badge. */
const RESULT_ICON: Record<string, 'checkbox-outline' | 'document-text-outline' | 'swap-vertical-outline'> = {
  task: 'checkbox-outline',
  note: 'document-text-outline',
  transaction: 'swap-vertical-outline',
};

/** One place to look for anything: tasks, notes and transactions at once. */
export default function SearchScreen() {
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
          <ScreenHeader title="Search" subtitle="Tasks, notes and transactions, all at once." />
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
        <EmptyState
          icon="search-outline"
          title="Start typing"
          description="Results appear as you type — across tasks, notes and your ledger."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          description={`Nothing found for "${query.trim()}".`}
        />
      ) : (
        <>
          <SectionHeader title="Results" count={results.length} />
          <List>
            {results.map((result) => (
              <ListRow
                key={`${result.kind}-${result.id}`}
                title={result.title}
                subtitle={result.subtitle}
                icon={RESULT_ICON[result.kind] ?? 'search-outline'}
                onPress={() => router.push(result.href)}
                accessibilityLabel={`${kindLabel(result.kind)}: ${result.title}`}
                chevron
                trailing={<Badge label={kindLabel(result.kind)} />}
              />
            ))}
          </List>
        </>
      )}
    </Screen>
  );
}
