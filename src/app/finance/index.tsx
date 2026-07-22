import { useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { SearchInput } from '@/components/forms/SearchInput';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { useToday } from '@/hooks/useToday';
import { relativeDayLabel } from '@/utils/date';
import { useAccounts } from '@/features/finance/accounts-api';
import { useCategories } from '@/features/finance/categories-api';
import { useCounterparties } from '@/features/finance/counterparties-api';
import {
  useDeleteTransaction,
  useTransactions,
  type TransactionRow,
} from '@/features/finance/transactions-api';
import { TransactionListItem } from '@/features/finance/TransactionListItem';
import { TransactionFormSheet } from '@/features/finance/TransactionFormSheet';

type KindFilter = 'all' | 'expense' | 'income' | 'transfer';

export default function TransactionsScreen() {
  const router = useRouter();
  const { today } = useToday();

  const transactionsQuery = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: counterparties } = useCounterparties();
  const deleteTransaction = useDeleteTransaction();

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const nameOf = useMemo(
    () => ({
      account: new Map((accounts ?? []).map((account) => [account.id, account.name])),
      category: new Map((categories ?? []).map((category) => [category.id, category.name])),
      counterparty: new Map((counterparties ?? []).map((row) => [row.id, row.display_name])),
    }),
    [accounts, categories, counterparties]
  );

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (transactionsQuery.data ?? []).filter((transaction) => {
      if (kind !== 'all' && transaction.transaction_type !== kind) return false;
      if (!needle) return true;
      return (
        (transaction.description?.toLowerCase().includes(needle) ?? false) ||
        (transaction.notes?.toLowerCase().includes(needle) ?? false) ||
        (nameOf.category
          .get(transaction.category_id ?? '')
          ?.toLowerCase()
          .includes(needle) ??
          false) ||
        (nameOf.counterparty
          .get(transaction.counterparty_id ?? '')
          ?.toLowerCase()
          .includes(needle) ??
          false)
      );
    });
  }, [transactionsQuery.data, query, kind, nameOf]);

  // Grouped by day so scanning a month of spending doesn't turn into one
  // undifferentiated wall of rows.
  const byDay = useMemo(() => {
    const groups = new Map<string, TransactionRow[]>();
    for (const transaction of matching) {
      const bucket = groups.get(transaction.transaction_date) ?? [];
      bucket.push(transaction);
      groups.set(transaction.transaction_date, bucket);
    }
    return [...groups.entries()];
  }, [matching]);

  function confirmDelete(transaction: TransactionRow) {
    const remove = () => deleteTransaction.mutate(transaction.id);

    // `Alert` is a no-op on react-native-web, so the browser's own confirm
    // dialog stands in — otherwise deleting on web would happen with no
    // confirmation at all.
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this transaction? Its ledger entries go with it.')) remove();
      return;
    }

    Alert.alert('Delete transaction?', 'Its ledger entries will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <Screen
      onRefresh={() => void transactionsQuery.refetch()}
      refreshing={transactionsQuery.isRefetching}
      header={
        <>
          <ScreenHeader
            title="Transactions"
            subtitle="Every entry posts to the double-entry ledger."
            action={<Button label="Add" size="sm" onPress={() => setSheetOpen(true)} />}
          />
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search transactions" />
          <OptionGroup
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'transfer', label: 'Transfer' },
            ]}
            value={kind}
            onChange={setKind}
          />
        </>
      }
    >
      {transactionsQuery.isLoading ? (
        <SkeletonList rows={6} />
      ) : transactionsQuery.error ? (
        <ErrorState error={transactionsQuery.error} onRetry={() => void transactionsQuery.refetch()} />
      ) : (accounts?.length ?? 0) === 0 ? (
        <EmptyState
          title="Add an account first"
          description="Transactions post against an account, so there needs to be at least one."
          actionLabel="Go to accounts"
          onAction={() => router.push('/finance/accounts')}
        />
      ) : byDay.length === 0 ? (
        <EmptyState
          title={query || kind !== 'all' ? 'No matching transactions' : 'No transactions yet'}
          description={
            query || kind !== 'all'
              ? 'Try a different search or filter.'
              : 'Record what you spent or received and it will show up here.'
          }
          actionLabel={query || kind !== 'all' ? undefined : 'Add transaction'}
          onAction={query || kind !== 'all' ? undefined : () => setSheetOpen(true)}
        />
      ) : (
        byDay.map(([date, transactions]) => (
          <View key={date} style={{ gap: spacing.sm }}>
            <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
              {relativeDayLabel(date, today).toUpperCase()}
            </ThemedText>
            <Card padded={false}>
              {transactions.map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  today={today}
                  accountName={nameOf.account.get(transaction.account_id ?? '')}
                  destinationAccountName={nameOf.account.get(transaction.destination_account_id ?? '')}
                  categoryName={nameOf.category.get(transaction.category_id ?? '')}
                  counterpartyName={nameOf.counterparty.get(transaction.counterparty_id ?? '')}
                  onDelete={() => confirmDelete(transaction)}
                />
              ))}
            </Card>
          </View>
        ))
      )}

      <TransactionFormSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
