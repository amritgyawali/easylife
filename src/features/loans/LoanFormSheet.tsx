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
import type { InterestType, LoanDirection } from '@/types/database';
import { useCounterparties } from '@/features/finance/counterparties-api';
import { useCreateLoan } from '@/features/loans/api';

export interface LoanFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-selects the person when opened from their page. */
  defaultCounterpartyId?: string | null;
}

const DIRECTION_OPTIONS: { value: LoanDirection; label: string }[] = [
  { value: 'lent', label: 'I lent money' },
  { value: 'borrowed', label: 'I borrowed money' },
];

const INTEREST_OPTIONS: { value: InterestType; label: string }[] = [
  { value: 'none', label: 'No interest' },
  { value: 'simple', label: 'Simple interest' },
  { value: 'manual', label: 'I enter it myself' },
];

export function LoanFormSheet({ visible, onClose, defaultCounterpartyId }: LoanFormSheetProps) {
  const { today } = useToday();
  const { data: counterparties } = useCounterparties();
  const createLoan = useCreateLoan();

  const [direction, setDirection] = useState<LoanDirection>('lent');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [loanDate, setLoanDate] = useState<IsoDate>(today);
  const [dueDate, setDueDate] = useState<IsoDate | null>(null);
  const [interestType, setInterestType] = useState<InterestType>('none');
  const [interestRate, setInterestRate] = useState('');
  const [interestPeriod, setInterestPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ person?: string; amount?: string; rate?: string }>({});

  useEffect(() => {
    if (!visible) return;
    setDirection('lent');
    setCounterpartyId(defaultCounterpartyId ?? counterparties?.[0]?.id ?? '');
    setPrincipal('');
    setCurrency(SUPPORTED_CURRENCIES[0]);
    setLoanDate(today);
    setDueDate(null);
    setInterestType('none');
    setInterestRate('');
    setInterestPeriod('monthly');
    setNotes('');
    setErrors({});
  }, [visible, defaultCounterpartyId, counterparties, today]);

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!counterpartyId) nextErrors.person = 'Choose who this is with.';
    if (principal.trim() === '' || Number(principal) <= 0) nextErrors.amount = 'Enter an amount.';
    if (interestType !== 'none' && (interestRate.trim() === '' || Number(interestRate) <= 0)) {
      nextErrors.rate = 'Enter the interest rate.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await createLoan.mutateAsync({
      counterpartyId,
      direction,
      principal,
      currency,
      loanDate,
      dueDate,
      interestType,
      interestRatePercent: interestType === 'none' ? null : Number(interestRate),
      interestPeriod,
      notes,
    });

    onClose();
  }

  const personOptions = (counterparties ?? []).map((row) => ({
    value: row.id,
    label: row.display_name,
  }));

  return (
    <FormSheet
      visible={visible}
      title="New loan"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={createLoan.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <OptionGroup options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />

      {personOptions.length === 0 ? (
        <ThemedText variant="body" tone="negative">
          Add a person on the People screen first — a loan is always with someone.
        </ThemedText>
      ) : (
        <OptionGroup
          label="With"
          options={personOptions}
          value={counterpartyId}
          onChange={(value) => {
            setCounterpartyId(value);
            setErrors((current) => ({ ...current, person: undefined }));
          }}
        />
      )}
      {errors.person ? (
        <ThemedText variant="caption" tone="negative">
          {errors.person}
        </ThemedText>
      ) : null}

      <MoneyField
        label="Amount"
        value={principal}
        onChangeText={(value) => {
          setPrincipal(value);
          setErrors((current) => ({ ...current, amount: undefined }));
        }}
        currency={currency}
        error={errors.amount}
      />

      <OptionGroup
        label="Currency"
        options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
        value={currency}
        onChange={setCurrency}
      />

      <DateField
        label="Date"
        value={loanDate}
        onChange={(value) => setLoanDate(value ?? today)}
        today={today}
        clearable={false}
      />

      <DateField label="Due back by" value={dueDate} onChange={setDueDate} today={today} />

      <OptionGroup
        label="Interest"
        options={INTEREST_OPTIONS}
        value={interestType}
        onChange={setInterestType}
      />

      {interestType === 'simple' ? (
        <>
          <TextField
            label="Rate (%)"
            value={interestRate}
            onChangeText={(value) => {
              setInterestRate(value);
              setErrors((current) => ({ ...current, rate: undefined }));
            }}
            error={errors.rate}
            keyboardType="decimal-pad"
            placeholder="e.g. 2"
          />
          <OptionGroup
            label="Per"
            options={[
              { value: 'monthly', label: 'Month' },
              { value: 'yearly', label: 'Year' },
            ]}
            value={interestPeriod}
            onChange={setInterestPeriod}
          />
        </>
      ) : null}

      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

      {createLoan.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(createLoan.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
