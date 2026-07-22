import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { toUserMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/money';
import type { ColumnRole } from '@/features/imports/normalise';
import { useAccounts } from '@/features/finance/accounts-api';
import { useCounterparties } from '@/features/finance/counterparties-api';
import { useTransactions } from '@/features/finance/transactions-api';
import { useFilePicker } from '@/features/documents/use-file-picker';
import { useUploadDocument } from '@/features/documents/api';
import { useImportWizard } from '@/features/imports/use-import-wizard';
import { useSaveExtraction } from '@/features/imports/api';

export interface ImportWizardSheetProps {
  visible: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'transaction_date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'reference', label: 'Reference' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'amount', label: 'Amount' },
  { value: 'balance', label: 'Balance' },
];

/**
 * The statement import flow: pick a file, confirm what the columns mean,
 * check the preview, then stage the rows for review.
 *
 * The column-mapping step is not optional filler — the header names differ
 * between every bank, and reading a debit column as a credit would turn
 * spending into income. The guess is shown for correction, never applied
 * silently.
 */
export function ImportWizardSheet({ visible, onClose }: ImportWizardSheetProps) {
  const router = useRouter();
  const { pickDocument } = useFilePicker();
  const { data: accounts } = useAccounts();
  const { data: counterparties } = useCounterparties();
  const { data: transactions } = useTransactions();
  const uploadDocument = useUploadDocument();
  const saveExtraction = useSaveExtraction();

  const wizard = useImportWizard();

  const [accountId, setAccountId] = useState('');
  const [institution, setInstitution] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const account = accounts?.find((row) => row.id === accountId);
  const currency = account?.currency ?? 'NPR';

  async function handlePick() {
    const picked = await pickDocument();
    if (picked) await wizard.load(picked);
  }

  function handleAnalyse() {
    wizard.analyse({
      currency,
      openingBalance,
      closingBalance,
      existingTransactions: (transactions ?? []).map((transaction) => ({
        id: transaction.id,
        transaction_date: transaction.transaction_date,
        amount_minor: transaction.amount_minor,
        transaction_type: transaction.transaction_type,
        description: transaction.description,
        reference: transaction.reference,
      })),
      counterparties: (counterparties ?? []).map((row) => ({
        id: row.id,
        display_name: row.display_name,
      })),
      // Aliases and rules are read on confirmation rather than here; a fresh
      // import has nothing learned about it yet.
      aliases: [],
      rules: [],
    });
  }

  async function handleSave() {
    setSaveError(null);

    if (!wizard.file || !wizard.preview) return;
    if (!accountId) {
      setSaveError('Choose which account this statement belongs to.');
      return;
    }

    try {
      // The file goes into the vault first so the extraction always has a
      // document to point back at — an import with no source document can't
      // be audited later.
      const uploaded = await uploadDocument.mutateAsync({
        file: wizard.file,
        title: `${institution || 'Statement'} — ${wizard.file.name}`,
        documentType: 'bank_statement',
        institution,
      });

      const statementId = await saveExtraction.mutateAsync({
        documentId: uploaded.document.id,
        engine: 'pdf_text',
        institution: institution || null,
        accountId,
        currency,
        openingBalanceMinor: wizard.preview.openingBalanceMinor,
        closingBalanceMinor: wizard.preview.closingBalanceMinor,
        periodStart: wizard.preview.statement.periodStart,
        periodEnd: wizard.preview.statement.periodEnd,
        rows: wizard.preview.statement.rows,
        reconciliation: wizard.preview.reconciliation,
        duplicates: wizard.preview.duplicates,
        suggestions: wizard.preview.suggestions,
      });

      wizard.reset();
      onClose();
      router.push(`/imports/${statementId}`);
    } catch (failure) {
      setSaveError(toUserMessage(failure));
    }
  }

  const accountOptions = (accounts ?? []).map((row) => ({
    value: row.id,
    label: `${row.name} (${row.currency})`,
  }));

  return (
    <FormSheet
      visible={visible}
      title="Import a statement"
      onClose={() => {
        wizard.reset();
        onClose();
      }}
      footer={
        <View style={{ flex: 1 }}>
          {wizard.preview ? (
            <Button
              label="Stage for review"
              loading={saveExtraction.isPending || uploadDocument.isPending}
              fullWidth
              onPress={() => void handleSave()}
            />
          ) : wizard.table ? (
            <Button label="Preview" fullWidth onPress={handleAnalyse} />
          ) : (
            <Button
              label="Choose file"
              loading={wizard.isReading}
              fullWidth
              onPress={() => void handlePick()}
            />
          )}
        </View>
      }
    >
      {!wizard.table ? (
        <>
          <ThemedText variant="body">
            Export a CSV statement from your bank, wallet or co-operative and choose it here.
          </ThemedText>
          <ThemedText variant="caption" tone="muted">
            PDF and photo statements need on-device text recognition, which is not available in this build —
            see the note on the Scan screen.
          </ThemedText>
        </>
      ) : null}

      {wizard.error ? (
        <ThemedText variant="body" tone="negative" accessibilityLiveRegion="polite">
          {wizard.error}
        </ThemedText>
      ) : null}

      {wizard.table && !wizard.preview ? (
        <>
          {accountOptions.length === 0 ? (
            <ThemedText variant="body" tone="negative">
              Add an account first — imported transactions have to post somewhere.
            </ThemedText>
          ) : (
            <OptionGroup
              label="Statement is for"
              options={accountOptions}
              value={accountId}
              onChange={setAccountId}
            />
          )}

          <TextField
            label="Institution"
            value={institution}
            onChangeText={setInstitution}
            placeholder="e.g. NIC Asia"
          />

          <ThemedText variant="label" tone="muted" weight="semibold">
            WHAT EACH COLUMN MEANS
          </ThemedText>
          <ThemedText variant="caption" tone="muted">
            Checked automatically — correct anything that looks wrong before previewing.
          </ThemedText>

          {wizard.table.header.map((column) => (
            <OptionGroup
              key={column}
              label={column || '(unnamed column)'}
              options={ROLE_OPTIONS}
              value={wizard.mapping[column] ?? 'ignore'}
              onChange={(role) => wizard.setMapping({ ...wizard.mapping, [column]: role })}
            />
          ))}

          <MoneyField
            label="Opening balance (optional)"
            value={openingBalance}
            onChangeText={setOpeningBalance}
            currency={currency}
          />
          <MoneyField
            label="Closing balance (optional)"
            value={closingBalance}
            onChangeText={setClosingBalance}
            currency={currency}
          />
          <ThemedText variant="caption" tone="muted">
            Given both, the import checks that opening + credits − debits reaches the closing balance, and
            tells you the exact difference if it doesn&apos;t.
          </ThemedText>
        </>
      ) : null}

      {wizard.preview ? (
        <>
          <Card style={{ gap: spacing.sm }}>
            <ThemedText variant="subtitle">{wizard.preview.statement.rows.length} rows found</ThemedText>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Badge
                label={`${formatMoney(wizard.preview.reconciliation.totalCreditsMinor, currency)} in`}
                tone="positive"
              />
              <Badge
                label={`${formatMoney(wizard.preview.reconciliation.totalDebitsMinor, currency)} out`}
                tone="negative"
              />
              {wizard.preview.statement.unparsedCount > 0 ? (
                <Badge label={`${wizard.preview.statement.unparsedCount} unreadable`} tone="warning" />
              ) : null}
              {wizard.preview.duplicates.length > 0 ? (
                <Badge label={`${wizard.preview.duplicates.length} possible duplicates`} tone="warning" />
              ) : null}
            </View>

            <ThemedText
              variant="caption"
              tone={
                wizard.preview.reconciliation.status === 'balanced'
                  ? 'positive'
                  : wizard.preview.reconciliation.status === 'mismatch'
                    ? 'negative'
                    : 'muted'
              }
            >
              {wizard.preview.reconciliation.status === 'balanced'
                ? 'Reconciles against the closing balance.'
                : wizard.preview.reconciliation.status === 'mismatch'
                  ? `Off by ${formatMoney(
                      Math.abs(wizard.preview.reconciliation.differenceMinor ?? 0),
                      currency
                    )} — some rows are probably missing or misread.`
                  : 'No balances given, so nothing was reconciled.'}
            </ThemedText>

            {wizard.preview.continuityBreaks.length > 0 ? (
              <ThemedText variant="caption" tone="warning">
                Running balance jumps at row
                {wizard.preview.continuityBreaks.length === 1 ? ' ' : 's '}
                {wizard.preview.continuityBreaks.map((row) => row.rowNumber).join(', ')}.
              </ThemedText>
            ) : null}
          </Card>

          {wizard.preview.statement.rows.slice(0, 5).map((row) => (
            <View key={row.rowNumber} style={{ gap: spacing.xxs }}>
              <ThemedText variant="caption" numberOfLines={1}>
                {row.transactionDate ?? 'no date'} · {row.rawDescription ?? 'no description'}
              </ThemedText>
              <ThemedText
                variant="caption"
                tone={row.signedAmountMinor && row.signedAmountMinor > 0 ? 'positive' : 'negative'}
              >
                {row.signedAmountMinor === null ? 'no amount' : formatMoney(row.signedAmountMinor, currency)}
              </ThemedText>
            </View>
          ))}
          {wizard.preview.statement.rows.length > 5 ? (
            <ThemedText variant="caption" tone="muted">
              …and {wizard.preview.statement.rows.length - 5} more. Everything is reviewable in the next step.
            </ThemedText>
          ) : null}
        </>
      ) : null}

      {saveError ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {saveError}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
