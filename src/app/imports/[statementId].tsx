import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { toUserMessage } from '@/utils/errors';
import { formatIsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import type { ConfidenceLevel } from '@/types/database';
import { useAccounts } from '@/features/finance/accounts-api';
import { useCategories } from '@/features/finance/categories-api';
import { useCounterparties } from '@/features/finance/counterparties-api';
import {
  useConfirmExtractedRow,
  useExtractedRows,
  useExtractedStatements,
  useRejectExtractedRow,
  type ExtractedTransactionRow,
} from '@/features/imports/api';

type Filter = 'pending' | 'confirmed' | 'rejected';

/** Confidence is shown with an icon and a word, never colour alone. */
const CONFIDENCE_PRESENTATION: Record<
  ConfidenceLevel,
  { tone: BadgeTone; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }
> = {
  high: { tone: 'positive', icon: 'checkmark-circle-outline', label: 'Clear' },
  medium: { tone: 'neutral', icon: 'help-circle-outline', label: 'Check' },
  low: { tone: 'warning', icon: 'alert-circle-outline', label: 'Unsure' },
  missing: { tone: 'negative', icon: 'close-circle-outline', label: 'Missing' },
};

/**
 * The review queue: every extracted row, with what the parser was and wasn't
 * sure about, and an explicit confirm for each.
 *
 * This screen is the boundary the whole import pipeline is built around —
 * nothing reaches `financial_transactions` except through a confirm here.
 */
export default function ImportReviewScreen() {
  const { statementId } = useLocalSearchParams<{ statementId: string }>();

  const { data: statements } = useExtractedStatements();
  const { data: rows, isLoading, error, refetch, isRefetching } = useExtractedRows(statementId ?? null);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: counterparties } = useCounterparties();

  const confirmRow = useConfirmExtractedRow();
  const rejectRow = useRejectExtractedRow();

  const [filter, setFilter] = useState<Filter>('pending');
  const [accountId, setAccountId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const statement = statements?.find((row) => row.id === statementId);
  const currency = statement?.currency ?? 'NPR';

  // The statement already knows which account it belongs to; the picker only
  // exists for the case where it doesn't.
  const effectiveAccountId = accountId || statement?.account_id || '';

  const visible = useMemo(() => (rows ?? []).filter((row) => row.review_status === filter), [rows, filter]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      pending: all.filter((row) => row.review_status === 'pending').length,
      confirmed: all.filter((row) => row.review_status === 'confirmed').length,
      rejected: all.filter((row) => row.review_status === 'rejected').length,
    };
  }, [rows]);

  const categoryName = useMemo(
    () => new Map((categories ?? []).map((row) => [row.id, row.name])),
    [categories]
  );
  const counterpartyName = useMemo(
    () => new Map((counterparties ?? []).map((row) => [row.id, row.display_name])),
    [counterparties]
  );

  async function handleConfirm(row: ExtractedTransactionRow) {
    setActionError(null);

    if (!effectiveAccountId) {
      setActionError('Choose which account these transactions post to.');
      return;
    }

    try {
      await confirmRow.mutateAsync({
        row,
        accountId: effectiveAccountId,
        categoryId: row.suggested_category_id,
        counterpartyId: row.suggested_counterparty_id,
        // Teaching the app this description means this person is only ever a
        // consequence of the user confirming it.
        saveAlias: Boolean(row.suggested_counterparty_id),
      });
    } catch (failure) {
      setActionError(toUserMessage(failure));
    }
  }

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="Review import"
            subtitle={
              statement?.statement_start && statement.statement_end
                ? `${statement.institution ?? 'Statement'} · ${formatIsoDate(statement.statement_start)} – ${formatIsoDate(statement.statement_end)}`
                : (statement?.institution ?? 'Statement')
            }
          />
          <OptionGroup
            options={[
              { value: 'pending', label: `To review (${counts.pending})` },
              { value: 'confirmed', label: `Added (${counts.confirmed})` },
              { value: 'rejected', label: `Skipped (${counts.rejected})` },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </>
      }
    >
      {statement?.reconciliation_status === 'mismatch' ? (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="body" tone="negative">
            This statement doesn&apos;t reconcile
          </ThemedText>
          <ThemedText variant="caption" tone="muted">
            Opening plus credits minus debits is off by{' '}
            {formatMoney(Math.abs(statement.reconciliation_diff_minor ?? 0), currency)} against the stated
            closing balance. Some rows are probably missing or misread — worth checking before confirming.
          </ThemedText>
        </Card>
      ) : null}

      {!statement?.account_id ? (
        <OptionGroup
          label="Post these to"
          options={(accounts ?? []).map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
          }))}
          value={effectiveAccountId}
          onChange={setAccountId}
        />
      ) : null}

      {actionError ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {actionError}
        </ThemedText>
      ) : null}

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'pending'
              ? counts.pending === 0 && counts.confirmed > 0
                ? 'Everything reviewed'
                : 'Nothing to review'
              : filter === 'confirmed'
                ? 'Nothing added yet'
                : 'Nothing skipped'
          }
          description={
            filter === 'pending' && counts.confirmed > 0
              ? 'Every row from this statement has been dealt with.'
              : undefined
          }
        />
      ) : (
        visible.map((row) => (
          <ReviewRow
            key={row.id}
            row={row}
            currency={currency}
            categoryName={row.suggested_category_id ? categoryName.get(row.suggested_category_id) : undefined}
            counterpartyName={
              row.suggested_counterparty_id ? counterpartyName.get(row.suggested_counterparty_id) : undefined
            }
            busy={confirmRow.isPending || rejectRow.isPending}
            onConfirm={() => void handleConfirm(row)}
            onReject={() => rejectRow.mutate(row.id)}
          />
        ))
      )}
    </Screen>
  );
}

function ReviewRow({
  row,
  currency,
  categoryName,
  counterpartyName,
  busy,
  onConfirm,
  onReject,
}: {
  row: ExtractedTransactionRow;
  currency: string;
  categoryName?: string;
  counterpartyName?: string;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const theme = useTheme();

  const confidence = CONFIDENCE_PRESENTATION[row.row_confidence];
  const isIncome = (row.signed_amount_minor ?? 0) > 0;
  const usable = row.signed_amount_minor !== null && row.signed_amount_minor !== 0 && row.transaction_date;
  const pending = row.review_status === 'pending';

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <ThemedText variant="body" numberOfLines={2}>
            {row.raw_description || 'No description'}
          </ThemedText>
          <ThemedText variant="caption" tone="muted">
            {row.transaction_date ? formatIsoDate(row.transaction_date) : 'No date'}
            {row.reference ? ` · ${row.reference}` : ''}
          </ThemedText>
        </View>
        <ThemedText variant="subtitle" tone={isIncome ? 'positive' : 'negative'}>
          {row.signed_amount_minor === null
            ? '—'
            : `${isIncome ? '+' : '-'}${formatMoney(Math.abs(row.signed_amount_minor), currency)}`}
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' }}>
        {/* Icon plus word, so confidence never depends on distinguishing colours. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <Ionicons
            name={confidence.icon}
            size={14}
            color={row.row_confidence === 'high' ? theme.colors.positive : theme.colors.warning}
          />
          <Badge label={confidence.label} tone={confidence.tone} />
        </View>
        {row.is_duplicate ? <Badge label="Possible duplicate" tone="warning" /> : null}
        {counterpartyName ? <Badge label={counterpartyName} tone="primary" /> : null}
        {categoryName ? <Badge label={categoryName} /> : null}
      </View>

      {!usable ? (
        <ThemedText variant="caption" tone="negative">
          This row is missing a date or an amount, so it can&apos;t be added. Skip it and enter it by hand.
        </ThemedText>
      ) : null}

      {row.is_duplicate ? (
        <ThemedText variant="caption" tone="muted">
          A transaction with this amount and date is already in your ledger. Confirm only if this is genuinely
          a second one.
        </ThemedText>
      ) : null}

      {pending ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Button label="Skip" size="sm" variant="secondary" disabled={busy} onPress={onReject} />
          <View style={{ flex: 1 }}>
            <Button
              label="Add to ledger"
              size="sm"
              fullWidth
              disabled={busy || !usable}
              onPress={onConfirm}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Checkbox
            checked={row.review_status === 'confirmed'}
            disabled
            accessibilityLabel={row.review_status === 'confirmed' ? 'Added to ledger' : 'Skipped'}
            onChange={() => undefined}
          />
          <ThemedText variant="caption" tone="muted">
            {row.review_status === 'confirmed' ? 'Added to your ledger' : 'Skipped'}
          </ThemedText>
        </View>
      )}
    </Card>
  );
}
