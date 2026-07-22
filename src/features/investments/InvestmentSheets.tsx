import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import type { IsoDate } from '@/utils/date';
import type { InvestmentAssetType, InvestmentTxnType } from '@/types/database';
import {
  SELECTABLE_ASSET_TYPES,
  useCreateAsset,
  useRecordInvestmentTransaction,
  useRecordValuation,
  type InvestmentAssetRow,
} from '@/features/investments/api';

export function AssetFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createAsset = useCreateAsset();

  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<InvestmentAssetType>('share');
  const [symbol, setSymbol] = useState('');
  const [institution, setInstitution] = useState('');
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setAssetType('share');
    setSymbol('');
    setInstitution('');
    setCurrency(SUPPORTED_CURRENCIES[0]);
    setNameError(null);
  }, [visible]);

  async function handleSave() {
    if (name.trim().length === 0) {
      setNameError('Give the holding a name.');
      return;
    }
    await createAsset.mutateAsync({ name, assetType, symbol, institution, currency });
    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title="New holding"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={createAsset.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <TextField
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        placeholder="e.g. Nabil Bank shares"
        autoFocus
      />
      <OptionGroup label="Type" options={SELECTABLE_ASSET_TYPES} value={assetType} onChange={setAssetType} />
      <TextField label="Symbol" value={symbol} onChangeText={setSymbol} placeholder="Optional, e.g. NABIL" />
      <TextField
        label="Held with"
        value={institution}
        onChangeText={setInstitution}
        placeholder="Optional — broker, bank or custodian"
      />
      <OptionGroup
        label="Currency"
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={currency}
        onChange={setCurrency}
      />

      {createAsset.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(createAsset.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}

const TXN_OPTIONS: { value: InvestmentTxnType; label: string }[] = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'interest', label: 'Interest' },
  { value: 'fee', label: 'Fee' },
];

export function InvestmentTransactionSheet({
  visible,
  onClose,
  asset,
}: {
  visible: boolean;
  onClose: () => void;
  asset: InvestmentAssetRow | null;
}) {
  const { today } = useToday();
  const recordTransaction = useRecordInvestmentTransaction();

  const [txnType, setTxnType] = useState<InvestmentTxnType>('buy');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [fees, setFees] = useState('');
  const [txnDate, setTxnDate] = useState<IsoDate>(today);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ quantity?: string; amount?: string }>({});

  useEffect(() => {
    if (!visible) return;
    setTxnType('buy');
    setQuantity('');
    setAmount('');
    setFees('');
    setTxnDate(today);
    setNotes('');
    setErrors({});
  }, [visible, today]);

  if (!asset) return null;

  const needsQuantity = txnType === 'buy' || txnType === 'sell';

  async function handleSave() {
    if (!asset) return;

    const nextErrors: typeof errors = {};
    if (needsQuantity && (quantity.trim() === '' || Number(quantity) <= 0)) {
      nextErrors.quantity = 'Enter how many units.';
    }
    if (amount.trim() === '' || Number(amount) <= 0) nextErrors.amount = 'Enter an amount.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await recordTransaction.mutateAsync({
      assetId: asset.id,
      currency: asset.currency,
      txnType,
      txnDate,
      quantity: needsQuantity ? quantity : null,
      amount,
      fees,
      notes,
    });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={asset.name}
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label="Save"
            loading={recordTransaction.isPending}
            fullWidth
            onPress={() => void handleSave()}
          />
        </View>
      }
    >
      <OptionGroup options={TXN_OPTIONS} value={txnType} onChange={setTxnType} />

      {needsQuantity ? (
        <TextField
          label="Units"
          value={quantity}
          onChangeText={(value) => {
            setQuantity(value);
            setErrors((current) => ({ ...current, quantity: undefined }));
          }}
          error={errors.quantity}
          keyboardType="decimal-pad"
          placeholder="e.g. 100"
        />
      ) : null}

      <MoneyField
        label={txnType === 'sell' ? 'Proceeds' : 'Amount'}
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setErrors((current) => ({ ...current, amount: undefined }));
        }}
        currency={asset.currency}
        error={errors.amount}
      />

      <MoneyField label="Fees" value={fees} onChangeText={setFees} currency={asset.currency} />

      <DateField
        label="Date"
        value={txnDate}
        onChange={(value) => setTxnDate(value ?? today)}
        today={today}
        clearable={false}
      />

      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

      {recordTransaction.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(recordTransaction.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}

/**
 * Records today's price for a holding.
 *
 * There is no price feed, so this is the only way a holding ever gets a
 * current value — hence the emphasis on the valuation date, which every
 * figure derived from it is labelled with.
 */
export function ValuationSheet({
  visible,
  onClose,
  asset,
}: {
  visible: boolean;
  onClose: () => void;
  asset: InvestmentAssetRow | null;
}) {
  const { today } = useToday();
  const recordValuation = useRecordValuation();

  const [price, setPrice] = useState('');
  const [valuationDate, setValuationDate] = useState<IsoDate>(today);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPrice('');
    setValuationDate(today);
    setPriceError(null);
  }, [visible, today]);

  if (!asset) return null;

  async function handleSave() {
    if (!asset) return;

    if (price.trim() === '' || Number(price) < 0) {
      setPriceError('Enter the price per unit.');
      return;
    }

    await recordValuation.mutateAsync({
      assetId: asset.id,
      currency: asset.currency,
      price,
      valuationDate,
    });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={`Update price — ${asset.name}`}
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label="Save"
            loading={recordValuation.isPending}
            fullWidth
            onPress={() => void handleSave()}
          />
        </View>
      }
    >
      <MoneyField
        label="Price per unit"
        value={price}
        onChangeText={(value) => {
          setPrice(value);
          if (priceError) setPriceError(null);
        }}
        currency={asset.currency}
        error={priceError}
        autoFocus
      />
      <DateField
        label="Price as of"
        value={valuationDate}
        onChange={(value) => setValuationDate(value ?? today)}
        today={today}
        clearable={false}
      />
      <ThemedText variant="caption" tone="muted">
        Prices are entered by hand — there is no market feed. Every value derived from this is shown with this
        date.
      </ThemedText>

      {recordValuation.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(recordValuation.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
