import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { useToday } from '@/hooks/useToday';
import { toUserMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/money';
import type { IsoDate } from '@/utils/date';
import { useAccounts } from '@/features/finance/accounts-api';
import { useRecordLoanEvent, type LoanRow } from '@/features/loans/api';

export interface LoanEventSheetProps {
  visible: boolean;
  onClose: () => void;
  loan: LoanRow | null;
  outstandingMinor: number;
}

type EventType = 'repayment' | 'interest_accrual' | 'write_off' | 'note';

const EVENT_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'repayment', label: 'Repayment' },
  { value: 'interest_accrual', label: 'Interest' },
  { value: 'write_off', label: 'Write off' },
  { value: 'note', label: 'Note' },
];

/**
 * Records anything that happens to a loan after it starts.
 *
 * The account picker is the important part: choosing one also posts the
 * matching cash movement to the ledger, so the loan balance and the account
 * balance move together instead of drifting apart.
 */
export function LoanEventSheet({ visible, onClose, loan, outstandingMinor }: LoanEventSheetProps) {
  const { today } = useToday();
  const { data: accounts } = useAccounts();
  const recordEvent = useRecordLoanEvent();

  const [eventType, setEventType] = useState<EventType>('repayment');
  const [amount, setAmount] = useState('');
  const [eventDate, setEventDate] = useState<IsoDate>(today);
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEventType('repayment');
    setAmount('');
    setEventDate(today);
    setAccountId('');
    setNotes('');
    setAmountError(null);
  }, [visible, today]);

  if (!loan) return null;

  // Only accounts in the loan's own currency can carry the cash leg — a
  // cross-currency repayment would need a rate, which this sheet doesn't ask
  // for, so those accounts are simply not offered.
  const matchingAccounts = (accounts ?? []).filter((account) => account.currency === loan.currency);

  async function handleSave() {
    if (!loan) return;

    if (eventType !== 'note' && (amount.trim() === '' || Number(amount) <= 0)) {
      setAmountError('Enter an amount.');
      return;
    }

    await recordEvent.mutateAsync({
      loanId: loan.id,
      loanCurrency: loan.currency,
      direction: loan.direction,
      eventType,
      amount,
      eventDate,
      accountId: accountId || null,
      notes,
    });

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title="Record on this loan"
      onClose={onClose}
      footer={
        <View style={{ flex: 1 }}>
          <Button label="Save" loading={recordEvent.isPending} fullWidth onPress={() => void handleSave()} />
        </View>
      }
    >
      <ThemedText variant="body" tone="muted">
        {formatMoney(outstandingMinor, loan.currency)} outstanding.
      </ThemedText>

      <OptionGroup options={EVENT_OPTIONS} value={eventType} onChange={setEventType} />

      {eventType !== 'note' ? (
        <MoneyField
          label="Amount"
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            if (amountError) setAmountError(null);
          }}
          currency={loan.currency}
          error={amountError}
          autoFocus
        />
      ) : null}

      <DateField
        label="Date"
        value={eventDate}
        onChange={(value) => setEventDate(value ?? today)}
        today={today}
        clearable={false}
      />

      {eventType === 'repayment' ? (
        matchingAccounts.length === 0 ? (
          <ThemedText variant="caption" tone="muted">
            No {loan.currency} account to record the cash against — the loan balance will still update.
          </ThemedText>
        ) : (
          <OptionGroup
            label={loan.direction === 'lent' ? 'Money received into' : 'Money paid from'}
            options={[
              { value: '', label: "Don't record cash" },
              ...matchingAccounts.map((account) => ({ value: account.id, label: account.name })),
            ]}
            value={accountId}
            onChange={setAccountId}
          />
        )
      ) : null}

      <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

      {recordEvent.error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(recordEvent.error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
