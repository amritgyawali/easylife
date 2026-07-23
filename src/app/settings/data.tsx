import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/constants/theme';
import { toUserMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { useAllAccounts } from '@/features/finance/accounts-api';
import { useCategories } from '@/features/finance/categories-api';
import { useCounterparties } from '@/features/finance/counterparties-api';
import { useCreateBackup, useTransactionExportData } from '@/features/export/api';
import { transactionsToCsv } from '@/features/export/csv';
import { backupRowCount, serializeBackup, summariseBackup } from '@/features/export/backup';
import { exportFilename, saveTextFile } from '@/features/export/download';

/**
 * Data & backup: the user's own copy of their data, on demand.
 *
 * Two shapes for two jobs — a spreadsheet-friendly CSV of transactions for
 * anyone who wants to slice their money in Excel, and a complete JSON backup
 * of everything for keeping or moving. Both are read-only exports built from
 * live Supabase data; nothing here mutates the account.
 */
export default function DataScreen() {
  const accountsQuery = useAllAccounts();
  const { data: categories } = useCategories();
  const { data: counterparties } = useCounterparties();

  const createBackup = useCreateBackup();
  const transactionData = useTransactionExportData();

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);

  const lookups = useMemo(() => {
    const accountName = new Map((accountsQuery.data ?? []).map((a) => [a.id, a.name]));
    const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
    const counterpartyName = new Map((counterparties ?? []).map((c) => [c.id, c.display_name]));
    return {
      accountName: (id: string | null) => (id ? (accountName.get(id) ?? null) : null),
      categoryName: (id: string | null) => (id ? (categoryName.get(id) ?? null) : null),
      counterpartyName: (id: string | null) => (id ? (counterpartyName.get(id) ?? null) : null),
    };
  }, [accountsQuery.data, categories, counterparties]);

  const exportCsv = async () => {
    setBusy('csv');
    setStatus(null);
    try {
      const transactions = await transactionData.mutateAsync();
      if (transactions.length === 0) {
        setStatus('No transactions to export yet.');
        return;
      }
      const csv = transactionsToCsv(transactions, lookups);
      await saveTextFile({
        filename: exportFilename('amrit-lifeos-transactions', 'csv'),
        content: csv,
        mimeType: 'text/csv',
      });
      setStatus(`Exported ${transactions.length} transactions.`);
    } catch (error) {
      logger.error('export.csv_failed', error);
      setStatus(toUserMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const exportBackup = async () => {
    setBusy('json');
    setStatus(null);
    try {
      const bundle = await createBackup.mutateAsync();
      const rows = backupRowCount(bundle);
      if (rows === 0) {
        setStatus('There is no data to back up yet.');
        return;
      }
      await saveTextFile({
        filename: exportFilename('amrit-lifeos-backup', 'json'),
        content: serializeBackup(bundle),
        mimeType: 'application/json',
      });
      const tables = summariseBackup(bundle).length;
      setStatus(`Backed up ${rows} records across ${tables} categories.`);
    } catch (error) {
      logger.error('export.backup_failed', error);
      setStatus(toUserMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen header={<ScreenHeader title="Data & backup" subtitle="Export your own copy, any time" />}>
      {status ? (
        <ThemedText variant="body" tone="muted" accessibilityLiveRegion="polite">
          {status}
        </ThemedText>
      ) : null}

      <Section
        title="Transactions (CSV)"
        description="A spreadsheet of every confirmed transaction — dates, amounts, categories and counterparties — ready for Excel, Numbers or Google Sheets."
      >
        <Button
          label="Export transactions"
          onPress={exportCsv}
          loading={busy === 'csv'}
          disabled={busy !== null}
        />
      </Section>

      <Section
        title="Full backup (JSON)"
        description="One file with everything you own — tasks, notes, money, loans, investments and document records. Keep it somewhere safe; it is your data to hold."
      >
        <Button
          label="Download full backup"
          onPress={exportBackup}
          loading={busy === 'json'}
          disabled={busy !== null}
          variant="secondary"
        />
      </Section>

      <ThemedText variant="caption" tone="muted">
        Exports are generated on your device from your live data and are never sent anywhere else. A backup
        does not include the document files themselves — those stay in your document vault.
      </ThemedText>
    </Screen>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="subtitle">{title}</ThemedText>
        <ThemedText variant="body" tone="muted">
          {description}
        </ThemedText>
      </View>
      {children}
    </Card>
  );
}
