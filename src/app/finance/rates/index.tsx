import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { DataTable } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import { formatIsoDate, type IsoDate } from '@/utils/date';
import {
  useDeleteExchangeRate,
  useExchangeRates,
  useSaveExchangeRate,
} from '@/features/finance/exchange-rates-api';

/**
 * Manually recorded exchange rates.
 *
 * This project has no paid FX feed, so these rows are the only thing that
 * lets net worth combine currencies or a cross-currency transfer post. A
 * missing rate is reported as an exclusion everywhere it matters rather than
 * silently assumed to be 1:1.
 */
export default function ExchangeRatesScreen() {
  const { data: rates, isLoading, error, refetch, isRefetching } = useExchangeRates();
  const deleteRate = useDeleteExchangeRate();

  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <ScreenHeader
          title="Exchange rates"
          subtitle="Entered by hand — there is no live rate feed."
          action={<Button label="Add rate" icon="add" size="sm" onPress={() => setSheetOpen(true)} />}
        />
      }
    >
      {isLoading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (rates?.length ?? 0) === 0 ? (
        <EmptyState
          icon="swap-horizontal-outline"
          title="No rates recorded"
          description="Without a rate, totals in other currencies are listed separately instead of being combined."
          actionLabel="Add rate"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <DataTable
          data={rates ?? []}
          keyExtractor={(rate) => rate.id}
          accessibilityLabel="Recorded exchange rates"
          columns={[
            {
              key: 'pair',
              header: 'Pair',
              compact: 'title',
              flex: 1.2,
              render: (rate) => `${rate.from_currency} → ${rate.to_currency}`,
            },
            {
              key: 'rate',
              header: 'Rate',
              numeric: true,
              render: (rate) => (
                <ThemedText variant="body" weight="semibold" numeric numberOfLines={1}>
                  {rate.rate}
                </ThemedText>
              ),
            },
            {
              key: 'asOf',
              header: 'As of',
              numeric: true,
              render: (rate) => formatIsoDate(rate.as_of_date),
            },
            {
              key: 'actions',
              header: '',
              width: 52,
              align: 'right',
              render: (rate) => (
                <IconButton
                  icon="trash-outline"
                  accessibilityLabel={`Delete rate ${rate.from_currency} to ${rate.to_currency}`}
                  onPress={() => deleteRate.mutate(rate.id)}
                  size={17}
                />
              ),
            },
          ]}
        />
      )}

      <RateFormSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

function RateFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { today } = useToday();
  const saveRate = useSaveExchangeRate();

  const [fromCurrency, setFromCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [toCurrency, setToCurrency] = useState<string>(SUPPORTED_CURRENCIES[1]);
  const [rate, setRate] = useState('');
  const [asOfDate, setAsOfDate] = useState<IsoDate>(today);
  const [errors, setErrors] = useState<{ rate?: string; pair?: string }>({});

  useEffect(() => {
    if (!visible) return;
    setFromCurrency(SUPPORTED_CURRENCIES[0]);
    setToCurrency(SUPPORTED_CURRENCIES[1]);
    setRate('');
    setAsOfDate(today);
    setErrors({});
  }, [visible, today]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (rate.trim() === '' || Number(rate) <= 0) nextErrors.rate = 'Enter a rate above zero.';
    if (fromCurrency === toCurrency) nextErrors.pair = 'Pick two different currencies.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await saveRate.mutateAsync({ fromCurrency, toCurrency, rate: Number(rate), asOfDate });
    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title="Add exchange rate"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={saveRate.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <OptionGroup
        label="From"
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={fromCurrency}
        onChange={(value) => {
          setFromCurrency(value);
          setErrors((current) => ({ ...current, pair: undefined }));
        }}
      />
      <OptionGroup
        label="To"
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={toCurrency}
        onChange={(value) => {
          setToCurrency(value);
          setErrors((current) => ({ ...current, pair: undefined }));
        }}
      />
      {errors.pair ? (
        <ThemedText variant="caption" tone="negative">
          {errors.pair}
        </ThemedText>
      ) : null}

      <TextField
        label={`How many ${toCurrency} for 1 ${fromCurrency}?`}
        value={rate}
        onChangeText={(value) => {
          setRate(value);
          setErrors((current) => ({ ...current, rate: undefined }));
        }}
        error={errors.rate}
        keyboardType="decimal-pad"
        placeholder="e.g. 0.0115"
        helpText="Recording one direction is enough — the reverse is derived from it."
      />

      <DateField
        label="Rate date"
        value={asOfDate}
        onChange={(value) => setAsOfDate(value ?? today)}
        today={today}
        clearable={false}
      />

      {saveRate.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(saveRate.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
