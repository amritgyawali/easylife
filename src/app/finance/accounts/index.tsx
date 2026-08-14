import { useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Section } from '@/components/ui/Section';
import { Stat, StatRow } from '@/components/ui/Stat';
import { ListRow } from '@/components/ui/ListRow';
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
          action={<Button label="Add account" icon="add" size="sm" onPress={() => openSheet(null)} />}
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
          <NetWorthCard />

          <Card style={{ gap: spacing.md }}>
            <ThemedText variant="overline" tone="muted" accessibilityRole="header">
              In accounts
            </ThemedText>
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
                  />
                ))}
              </StatRow>
            )}
          </Card>

          <Section title="Open accounts" count={active.length}>
            <Card padded={false}>
              {active.map(({ account, balanceMinor }, index) => (
                <AccountRowItem
                  key={account.id}
                  account={account}
                  balanceMinor={balanceMinor}
                  divider={index > 0}
                  onPress={() => openSheet(account)}
                />
              ))}
            </Card>
          </Section>

          {archived.length > 0 ? (
            <Section title="Archived" count={archived.length}>
              <Card padded={false}>
                {archived.map(({ account, balanceMinor }, index) => (
                  <AccountRowItem
                    key={account.id}
                    account={account}
                    balanceMinor={balanceMinor}
                    divider={index > 0}
                    onPress={() => openSheet(account)}
                  />
                ))}
              </Card>
            </Section>
          ) : null}
        </>
      )}

      <AccountFormSheet visible={sheetOpen} account={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

/** Icon that matches what the account actually is, at a glance. */
const ACCOUNT_ICON: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  cash: 'cash-outline',
  bank: 'business-outline',
  wallet: 'wallet-outline',
  credit_card: 'card-outline',
  savings: 'save-outline',
  investment: 'trending-up-outline',
  loan: 'document-text-outline',
};

function AccountRowItem({
  account,
  balanceMinor,
  divider,
  onPress,
}: {
  account: AccountRow;
  balanceMinor: number;
  divider: boolean;
  onPress: () => void;
}) {
  return (
    <ListRow
      divider={divider}
      onPress={onPress}
      icon={ACCOUNT_ICON[account.account_type] ?? 'wallet-outline'}
      iconTone={account.archived_at ? 'neutral' : 'primary'}
      title={account.name}
      subtitle={account.institution ?? undefined}
      meta={
        <>
          <Badge label={account.account_type.replace(/_/g, ' ')} size="sm" />
          <Badge label={account.currency} size="sm" />
          {!account.include_in_net_worth ? (
            <Badge label="Excluded from net worth" tone="warning" size="sm" />
          ) : null}
          {account.archived_at ? <Badge label="Archived" size="sm" /> : null}
        </>
      }
      trailing={
        <ThemedText variant="body" weight="semibold" tone={balanceMinor < 0 ? 'negative' : 'default'} numeric>
          {formatMoney(balanceMinor, account.currency)}
        </ThemedText>
      }
    />
  );
}
