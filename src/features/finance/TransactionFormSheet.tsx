import { useEffect, useMemo, useState } from 'react';

import { FormActions, FormRow, FormSheet } from '@/components/ui/FormSheet';
import { FormError, InlineMessage } from '@/components/ui/InlineMessage';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { DateField } from '@/components/forms/DateField';
import { useToday } from '@/hooks/useToday';
import type { IsoDate } from '@/utils/date';
import { useAccounts } from '@/features/finance/accounts-api';
import { useCategories } from '@/features/finance/categories-api';
import { useCounterparties } from '@/features/finance/counterparties-api';
import { useCreateTransaction } from '@/features/finance/transactions-api';
import type { LedgerTransactionKind } from '@/features/finance/ledger';

export interface TransactionFormSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-selects the account when opened from an account's own screen. */
  defaultAccountId?: string | null;
}

const KIND_OPTIONS: { value: LedgerTransactionKind; label: string; icon: 'arrow-up' | 'arrow-down' | 'swap-horizontal' }[] = [
  { value: 'expense', label: 'Expense', icon: 'arrow-up' },
  { value: 'income', label: 'Income', icon: 'arrow-down' },
  { value: 'transfer', label: 'Transfer', icon: 'swap-horizontal' },
];

/**
 * Manual transaction entry. Every save posts a balanced pair of ledger
 * entries (see `ledger.ts`) — there is no path in the app that writes a
 * transaction header without them.
 */
export function TransactionFormSheet({ visible, onClose, defaultAccountId }: TransactionFormSheetProps) {
  const { today } = useToday();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: counterparties } = useCounterparties();
  const createTransaction = useCreateTransaction();

  const [kind, setKind] = useState<LedgerTransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<IsoDate>(today);
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [counterpartyId, setCounterpartyId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [errors, setErrors] = useState<{
    amount?: string;
    account?: string;
    destination?: string;
    rate?: string;
  }>({});

  useEffect(() => {
    if (!visible) return;
    setKind('expense');
    setAmount('');
    setDate(today);
    setAccountId(defaultAccountId ?? accounts?.[0]?.id ?? '');
    setDestinationAccountId('');
    setCategoryId('');
    setCounterpartyId('');
    setDescription('');
    setExchangeRate('');
    setErrors({});
  }, [visible, today, defaultAccountId, accounts]);

  // A transfer needs somewhere to go, so it only makes sense once a second
  // account exists. Without this guard the "To" picker rendered with zero
  // options and the form had no way to explain why Save kept failing.
  const canTransfer = (accounts?.length ?? 0) >= 2;

  useEffect(() => {
    if (visible && kind === 'transfer' && !canTransfer) setKind('expense');
  }, [visible, kind, canTransfer]);

  const selectedAccount = accounts?.find((account) => account.id === accountId);
  const currency = selectedAccount?.currency ?? 'NPR';

  const destinationAccount = accounts?.find((account) => account.id === destinationAccountId);
  // A transfer between accounts in different currencies is the only case that
  // needs a rate; everything else is a single-currency movement.
  const needsRate =
    kind === 'transfer' && Boolean(destinationAccount) && destinationAccount!.currency !== currency;

  // Categories are typed the same way transactions are, so an expense should
  // never offer an income category.
  const relevantCategories = useMemo(
    () => (categories ?? []).filter((category) => category.kind === kind),
    [categories, kind]
  );

  async function handleSave() {
    const nextErrors: typeof errors = {};
    if (!accountId) nextErrors.account = 'Choose an account.';
    if (amount.trim() === '' || Number(amount) <= 0) nextErrors.amount = 'Enter an amount.';
    if (kind === 'transfer' && !destinationAccountId) nextErrors.destination = 'Choose where it goes.';
    if (needsRate && (exchangeRate.trim() === '' || Number(exchangeRate) <= 0)) {
      nextErrors.rate = 'Enter the exchange rate.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await createTransaction.mutateAsync({
      accounts: accounts ?? [],
      input: {
        kind,
        amount,
        date,
        accountId,
        destinationAccountId: kind === 'transfer' ? destinationAccountId : null,
        categoryId: categoryId || null,
        counterpartyId: counterpartyId || null,
        description,
        exchangeRate: needsRate ? Number(exchangeRate) : null,
      },
    });

    onClose();
  }

  const accountOptions = (accounts ?? []).map((account) => ({
    value: account.id,
    label: `${account.name} (${account.currency})`,
  }));

  const destinationOptions = accountOptions.filter((option) => option.value !== accountId);
  const kindOptions = canTransfer ? KIND_OPTIONS : KIND_OPTIONS.filter((option) => option.value !== 'transfer');

  return (
    <FormSheet
      visible={visible}
      title="New transaction"
      subtitle="Posts a balanced pair of ledger entries."
      onClose={onClose}
      size="lg"
      footer={
        <FormActions
          pending={createTransaction.isPending}
          onSave={() => void handleSave()}
          saveLabel="Save transaction"
        />
      }
    >
      <OptionGroup
        variant="segmented"
        options={kindOptions}
        value={kind}
        onChange={(value) => {
          setKind(value);
          // A category filed under the old kind would be wrong for the new one.
          setCategoryId('');
        }}
      />
      {!canTransfer ? (
        <InlineMessage message="Add a second account to move money between accounts." />
      ) : null}

      <MoneyField
        label="Amount"
        required
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setErrors((current) => ({ ...current, amount: undefined }));
        }}
        currency={currency}
        error={errors.amount}
        autoFocus
      />

      {accountOptions.length === 0 ? (
        <InlineMessage tone="negative" message="Add an account before recording transactions." />
      ) : (
        <OptionGroup
          label={kind === 'transfer' ? 'From' : 'Account'}
          options={accountOptions}
          value={accountId}
          error={errors.account}
          onChange={(value) => {
            setAccountId(value);
            setErrors((current) => ({ ...current, account: undefined }));
          }}
        />
      )}

      {kind === 'transfer' ? (
        <>
          {destinationOptions.length === 0 ? (
            <InlineMessage
              tone="negative"
              message={'Choose a "From" account first, or add another account — there\u2019s nothing left to transfer to.'}
            />
          ) : (
            <OptionGroup
              label="To"
              options={destinationOptions}
              value={destinationAccountId}
              error={errors.destination}
              onChange={(value) => {
                setDestinationAccountId(value);
                setErrors((current) => ({ ...current, destination: undefined }));
              }}
            />
          )}

          {needsRate ? (
            <>
              <TextField
                label={`Rate — ${destinationAccount!.currency} per 1 ${currency}`}
                value={exchangeRate}
                onChangeText={(value) => {
                  setExchangeRate(value);
                  setErrors((current) => ({ ...current, rate: undefined }));
                }}
                error={errors.rate}
                keyboardType="decimal-pad"
                placeholder="e.g. 0.0115"
                helpText={
                  amount && Number(exchangeRate) > 0
                    ? `${amount} ${currency} becomes about ${(Number(amount) * Number(exchangeRate)).toFixed(
                        2
                      )} ${destinationAccount!.currency}.`
                    : 'Each account moves in its own currency; the rate links the two.'
                }
              />
            </>
          ) : null}
        </>
      ) : null}

      <FormRow>
        <DateField
          label="Date"
          value={date}
          onChange={(value) => setDate(value ?? today)}
          today={today}
          clearable={false}
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What was it for?"
          helpText="Shown as the row's title in the list."
        />
      </FormRow>

      {kind !== 'transfer' && relevantCategories.length > 0 ? (
        <OptionGroup
          label="Category"
          options={[
            { value: '', label: 'Uncategorised' },
            ...relevantCategories.map((category) => ({ value: category.id, label: category.name })),
          ]}
          value={categoryId}
          onChange={setCategoryId}
        />
      ) : null}

      {(counterparties?.length ?? 0) > 0 ? (
        <OptionGroup
          label="Person or business"
          options={[
            { value: '', label: 'None' },
            ...(counterparties ?? []).map((counterparty) => ({
              value: counterparty.id,
              label: counterparty.display_name,
            })),
          ]}
          value={counterpartyId}
          onChange={setCounterpartyId}
        />
      ) : null}

      <FormError error={createTransaction.error} />
    </FormSheet>
  );
}
