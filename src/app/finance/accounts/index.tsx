import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { formatMoney } from '@/utils/money';
import { useAccountBalances } from '@/features/finance/use-balances';
import { AccountFormSheet } from '@/features/finance/AccountFormSheet';
import { NetWorthCard } from '@/features/networth/NetWorthCard';
import type { AccountRow } from '@/features/finance/accounts-api';

export default function AccountsScreen() {
  const { accounts, netWorthByCurrency, isLoading, isRefetching, error, refetch } = useAccountBalances();

  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openSheet(account: AccountRow | null) {
    setEditing(account);
    setSheetOpen(true);
  }

  const active = accounts.filter(({ account }) => !account.archived_at);
  const archived = accounts.filter(({ account }) => account.archived_at);

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Accounts"
          subtitle="Balances are derived from your ledger, never typed in."
          action={<Button label="Add account" size="sm" onPress={() => openSheet(null)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add the cash, bank or wallet accounts you actually use."
          actionLabel="Add account"
          onAction={() => openSheet(null)}
        />
      ) : (
        <>
          <NetWorthCard />

          <Card style={{ gap: spacing.sm }}>
            <ThemedText variant="label" tone="muted" weight="semibold">
              IN ACCOUNTS
            </ThemedText>
            {netWorthByCurrency.size === 0 ? (
              <ThemedText variant="body" tone="muted">
                No accounts count towards net worth yet.
              </ThemedText>
            ) : (
              [...netWorthByCurrency.entries()].map(([currency, total]) => (
                <ThemedText key={currency} variant="subtitle" tone={total < 0 ? 'negative' : 'default'}>
                  {formatMoney(total, currency)}
                </ThemedText>
              ))
            )}
          </Card>

          {active.map(({ account, balanceMinor }) => (
            <AccountCard
              key={account.id}
              account={account}
              balanceMinor={balanceMinor}
              onPress={() => openSheet(account)}
            />
          ))}

          {archived.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
                ARCHIVED
              </ThemedText>
              {archived.map(({ account, balanceMinor }) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  balanceMinor={balanceMinor}
                  onPress={() => openSheet(account)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}

      <AccountFormSheet visible={sheetOpen} account={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

function AccountCard({
  account,
  balanceMinor,
  onPress,
}: {
  account: AccountRow;
  balanceMinor: number;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${account.name}`} onPress={onPress}>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ThemedText variant="subtitle">{account.name}</ThemedText>
            {account.institution ? (
              <ThemedText variant="caption" tone="muted">
                {account.institution}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText variant="subtitle" tone={balanceMinor < 0 ? 'negative' : 'default'}>
            {formatMoney(balanceMinor, account.currency)}
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Badge label={account.account_type.replace(/_/g, ' ')} />
          <Badge label={account.currency} />
          {!account.include_in_net_worth ? <Badge label="Excluded from net worth" tone="warning" /> : null}
          {account.archived_at ? <Badge label="Archived" tone="neutral" /> : null}
        </View>
      </Card>
    </Pressable>
  );
}
