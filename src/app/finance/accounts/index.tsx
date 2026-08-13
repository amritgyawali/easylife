import { useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Stat, StatRow } from '@/components/ui/Stat';
import { ThemedText } from '@/components/ui/ThemedText';
import { formatMoney } from '@/utils/money';
import { useAccountBalances } from '@/features/finance/use-balances';
import { AccountFormSheet } from '@/features/finance/AccountFormSheet';
import { NetWorthCard } from '@/features/networth/NetWorthCard';
import type { AccountRow } from '@/features/finance/accounts-api';

/**
 * Every account with its derived balance. Balances are never typed in — they
 * are the sum of the ledger entries posted against the account — so this
 * screen is read-only apart from opening an account to edit its details.
 */
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
      width="wide"
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          eyebrow="Money"
          title="Accounts"
          subtitle="Balances are derived from your ledger, never typed in."
          action={<Button label="Add account" size="sm" icon="add" onPress={() => openSheet(null)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title="No accounts yet"
          description="Add the cash, bank or wallet accounts you actually use."
          actionLabel="Add account"
          onAction={() => openSheet(null)}
        />
      ) : (
        <>
          <Grid minColumnWidth={340} maxColumns={2}>
            <NetWorthCard />

            <Card style={{ gap: spacing.md }}>
              <SectionHeader title="In accounts" count={active.length} />
              {netWorthByCurrency.size === 0 ? (
                <ThemedText variant="body" tone="muted">
                  No accounts count towards net worth yet.
                </ThemedText>
              ) : (
                <StatRow>
                  {[...netWorthByCurrency.entries()].map(([currency, total]) => (
                    <Stat
                      key={currency}
                      label={currency}
                      value={formatMoney(total, currency)}
                      tone={total < 0 ? 'negative' : 'default'}
                      size="lg"
                    />
                  ))}
                </StatRow>
              )}
            </Card>
          </Grid>

          <View style={{ gap: spacing.sm }}>
            <SectionHeader title="Your accounts" count={active.length} />
            <Grid minColumnWidth={300}>
              {active.map(({ account, balanceMinor }) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  balanceMinor={balanceMinor}
                  onPress={() => openSheet(account)}
                />
              ))}
            </Grid>
          </View>

          {archived.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title="Archived"
                count={archived.length}
                description="Kept for history — they no longer count towards net worth."
              />
              <Grid minColumnWidth={300}>
                {archived.map(({ account, balanceMinor }) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    balanceMinor={balanceMinor}
                    onPress={() => openSheet(account)}
                  />
                ))}
              </Grid>
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
    <Card
      onPress={onPress}
      accessibilityLabel={`Edit ${account.name}`}
      style={{ gap: spacing.md, flexGrow: 1 }}
    >
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="label" tone="muted" numberOfLines={1}>
          {account.institution || account.account_type.replace(/_/g, ' ')}
        </ThemedText>
        <ThemedText variant="subtitle" numberOfLines={1}>
          {account.name}
        </ThemedText>
      </View>

      <ThemedText variant="title" tone={balanceMinor < 0 ? 'negative' : 'default'} numeric>
        {formatMoney(balanceMinor, account.currency)}
      </ThemedText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge label={account.account_type.replace(/_/g, ' ')} />
        <Badge label={account.currency} />
        {!account.include_in_net_worth ? <Badge label="Not in net worth" tone="warning" /> : null}
        {account.archived_at ? <Badge label="Archived" icon="archive-outline" /> : null}
      </View>
    </Card>
  );
}
