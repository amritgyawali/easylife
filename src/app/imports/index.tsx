import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { formatIsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { useExtractedStatements } from '@/features/imports/api';
import { ImportWizardSheet } from '@/features/imports/ImportWizardSheet';

const RECONCILIATION_TONE: Record<string, BadgeTone> = {
  balanced: 'positive',
  mismatch: 'negative',
  pending: 'neutral',
};

/**
 * Statement imports: start a new one, or resume reviewing a previous one.
 *
 * Nothing listed here has touched the ledger — every row waits for an
 * explicit confirmation on the review screen.
 */
export default function ImportsScreen() {
  const router = useRouter();
  const { data: statements, isLoading, error, refetch, isRefetching } = useExtractedStatements();

  const [wizardOpen, setWizardOpen] = useState(false);

  const sorted = useMemo(
    () => [...(statements ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [statements]
  );

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Imports"
          subtitle="Bring a bank or wallet statement in. Nothing is added to your ledger until you confirm it."
          action={<Button label="New import" size="sm" onPress={() => setWizardOpen(true)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No imports yet"
          description="Export a CSV statement from your bank or wallet and bring it in here."
          actionLabel="New import"
          onAction={() => setWizardOpen(true)}
        />
      ) : (
        sorted.map((statement) => (
          <Card key={statement.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <ThemedText variant="subtitle">{statement.institution ?? 'Statement'}</ThemedText>
                <ThemedText variant="caption" tone="muted">
                  {statement.statement_start && statement.statement_end
                    ? `${formatIsoDate(statement.statement_start)} – ${formatIsoDate(statement.statement_end)}`
                    : 'Period not stated'}
                </ThemedText>
              </View>
              <Button label="Review" size="sm" onPress={() => router.push(`/imports/${statement.id}`)} />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              <Badge
                label={statement.reconciliation_status}
                tone={RECONCILIATION_TONE[statement.reconciliation_status] ?? 'neutral'}
              />
              {statement.currency ? <Badge label={statement.currency} /> : null}
              {statement.reconciliation_diff_minor ? (
                <Badge
                  label={`Off by ${formatMoney(
                    Math.abs(statement.reconciliation_diff_minor),
                    statement.currency ?? 'NPR'
                  )}`}
                  tone="negative"
                />
              ) : null}
            </View>
          </Card>
        ))
      )}

      <ImportWizardSheet visible={wizardOpen} onClose={() => setWizardOpen(false)} />
    </Screen>
  );
}
