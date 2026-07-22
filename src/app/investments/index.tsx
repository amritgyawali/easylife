import { useMemo, useState } from 'react';
import { View } from 'react-native';

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
import { formatIsoDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { usePortfolio, type InvestmentAssetRow } from '@/features/investments/api';
import { portfolioTotals, valueAsset } from '@/features/investments/portfolio';
import {
  AssetFormSheet,
  InvestmentTransactionSheet,
  ValuationSheet,
} from '@/features/investments/InvestmentSheets';

export default function InvestmentsScreen() {
  const { data: portfolio, isLoading, error, refetch, isRefetching } = usePortfolio();

  const [assetSheetOpen, setAssetSheetOpen] = useState(false);
  const [transactionAsset, setTransactionAsset] = useState<InvestmentAssetRow | null>(null);
  const [valuationAsset, setValuationAsset] = useState<InvestmentAssetRow | null>(null);

  const totals = useMemo(() => portfolioTotals(portfolio), [portfolio]);

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Investments"
          subtitle="Values come from prices you record — there is no market feed."
          action={<Button label="Add holding" size="sm" onPress={() => setAssetSheetOpen(true)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : portfolio.length === 0 ? (
        <EmptyState
          title="No holdings yet"
          description="Track shares, fixed deposits, gold, property or anything else you own."
          actionLabel="Add holding"
          onAction={() => setAssetSheetOpen(true)}
        />
      ) : (
        <>
          {totals.map((total) => (
            <Card key={total.currency} style={{ gap: spacing.md }}>
              <ThemedText variant="label" tone="muted" weight="semibold" accessibilityRole="header">
                PORTFOLIO · {total.currency}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <Figure label="Value" value={formatMoney(total.currentValueMinor, total.currency)} />
                <Figure label="Invested" value={formatMoney(total.netInvestedMinor, total.currency)} />
              </View>
              <View style={{ gap: spacing.xxs }}>
                <ThemedText variant="caption" tone="muted">
                  {total.unrealisedGainMinor >= 0 ? 'Up by' : 'Down by'}
                </ThemedText>
                <ThemedText
                  variant="subtitle"
                  tone={total.unrealisedGainMinor >= 0 ? 'positive' : 'negative'}
                >
                  {total.unrealisedGainMinor >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(total.unrealisedGainMinor), total.currency)}
                </ThemedText>
              </View>
              {total.unvaluedAssetCount > 0 ? (
                <ThemedText variant="caption" tone="warning">
                  {total.unvaluedAssetCount} holding{total.unvaluedAssetCount === 1 ? '' : 's'} excluded — no
                  price recorded yet.
                </ThemedText>
              ) : null}
            </Card>
          ))}

          {portfolio.map(({ asset, transactions }) => {
            const valuation = valueAsset(asset, transactions);

            return (
              <Card key={asset.id} style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <ThemedText variant="subtitle">{asset.name}</ThemedText>
                    <ThemedText variant="caption" tone="muted">
                      {valuation.quantity} units
                      {asset.institution ? ` · ${asset.institution}` : ''}
                    </ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
                    {valuation.currentValueMinor === null ? (
                      <ThemedText variant="body" tone="muted">
                        No price
                      </ThemedText>
                    ) : (
                      <ThemedText variant="subtitle">
                        {formatMoney(valuation.currentValueMinor, asset.currency)}
                      </ThemedText>
                    )}
                    <ThemedText variant="caption" tone="muted">
                      {formatMoney(valuation.netInvestedMinor, asset.currency)} in
                    </ThemedText>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  <Badge label={asset.asset_type.replace(/_/g, ' ')} />
                  {asset.symbol ? <Badge label={asset.symbol} /> : null}
                  {valuation.unrealisedGainMinor !== null ? (
                    <Badge
                      label={`${valuation.unrealisedGainMinor >= 0 ? '+' : '-'}${formatMoney(
                        Math.abs(valuation.unrealisedGainMinor),
                        asset.currency,
                        { showCurrency: false }
                      )}${valuation.returnRate !== null ? ` (${Math.round(valuation.returnRate * 100)}%)` : ''}`}
                      tone={valuation.unrealisedGainMinor >= 0 ? 'positive' : 'negative'}
                    />
                  ) : null}
                  {valuation.realisedIncomeMinor > 0 ? (
                    <Badge
                      label={`${formatMoney(valuation.realisedIncomeMinor, asset.currency, {
                        showCurrency: false,
                      })} received`}
                      tone="primary"
                    />
                  ) : null}
                </View>

                {/* Always state how old the price is — a stale valuation
                    presented as current is worse than none. */}
                <ThemedText variant="caption" tone={valuation.asOf ? 'muted' : 'warning'}>
                  {valuation.asOf
                    ? `Priced as of ${formatIsoDate(valuation.asOf)}`
                    : 'Record a price to see what this is worth.'}
                </ThemedText>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    label="Buy / sell"
                    size="sm"
                    variant="secondary"
                    onPress={() => setTransactionAsset(asset)}
                  />
                  <Button
                    label="Update price"
                    size="sm"
                    variant="ghost"
                    onPress={() => setValuationAsset(asset)}
                  />
                </View>
              </Card>
            );
          })}
        </>
      )}

      <AssetFormSheet visible={assetSheetOpen} onClose={() => setAssetSheetOpen(false)} />
      <InvestmentTransactionSheet
        visible={transactionAsset !== null}
        asset={transactionAsset}
        onClose={() => setTransactionAsset(null)}
      />
      <ValuationSheet
        visible={valuationAsset !== null}
        asset={valuationAsset}
        onClose={() => setValuationAsset(null)}
      />
    </Screen>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <ThemedText variant="caption" tone="muted">
        {label}
      </ThemedText>
      <ThemedText variant="subtitle">{value}</ThemedText>
    </View>
  );
}
