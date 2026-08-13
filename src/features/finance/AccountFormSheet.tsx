import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormRow, FormSheet } from '@/components/ui/FormSheet';
import { FormError } from '@/components/ui/InlineMessage';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { CheckboxField } from '@/components/forms/CheckboxField';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { fromMinorUnits } from '@/utils/money';
import type { AccountType } from '@/types/database';
import {
  SELECTABLE_ACCOUNT_TYPES,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccount,
  type AccountRow,
} from '@/features/finance/accounts-api';

export interface AccountFormSheetProps {
  visible: boolean;
  onClose: () => void;
  account: AccountRow | null;
}

export function AccountFormSheet({ visible, onClose, account }: AccountFormSheetProps) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [openingBalance, setOpeningBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(account?.name ?? '');
    setAccountType(account?.account_type ?? 'bank');
    setCurrency(account?.currency ?? SUPPORTED_CURRENCIES[0]);
    setOpeningBalance(account ? fromMinorUnits(account.opening_balance_minor, account.currency) : '');
    setInstitution(account?.institution ?? '');
    setIncludeInNetWorth(account?.include_in_net_worth ?? true);
    setNameError(null);
  }, [visible, account]);

  const pending = createAccount.isPending || updateAccount.isPending || archiveAccount.isPending;
  const error = createAccount.error ?? updateAccount.error ?? archiveAccount.error;

  async function handleSave() {
    if (name.trim().length === 0) {
      setNameError('Give the account a name.');
      return;
    }

    const input = { name, accountType, currency, openingBalance, institution, includeInNetWorth };

    if (account) await updateAccount.mutateAsync({ id: account.id, ...input });
    else await createAccount.mutateAsync(input);

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={account ? 'Edit account' : 'New account'}
      subtitle={
        account
          ? 'The balance stays derived from the ledger.'
          : 'Cash, bank, wallet — anything you move money through.'
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          {account ? (
            <Button
              label="Archive"
              variant="secondary"
              icon="archive-outline"
              disabled={pending}
              onPress={async () => {
                await archiveAccount.mutateAsync(account.id);
                onClose();
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button
              label={account ? 'Save changes' : 'Add account'}
              loading={pending}
              fullWidth
              onPress={() => void handleSave()}
            />
          </View>
        </>
      }
    >
      <TextField
        label="Account name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        required
        placeholder="e.g. NIC Asia savings"
        autoFocus
        size="lg"
      />

      <OptionGroup
        label="Type"
        options={SELECTABLE_ACCOUNT_TYPES}
        value={accountType}
        onChange={setAccountType}
      />

      <FormRow>
        <OptionGroup
          label="Currency"
          options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
          value={currency}
          onChange={setCurrency}
        />
        <MoneyField
          label="Opening balance"
          value={openingBalance}
          onChangeText={setOpeningBalance}
          currency={currency}
          helpText="What was in it when you started tracking."
        />
      </FormRow>

      <TextField
        label="Institution"
        value={institution}
        onChangeText={setInstitution}
        placeholder="Optional — bank, wallet or co-operative"
      />

      <CheckboxField
        checked={includeInNetWorth}
        onChange={setIncludeInNetWorth}
        label="Count towards net worth"
        description="Turn off for accounts that aren't really yours, like a shared household pot."
      />

      <FormError error={error} />
    </FormSheet>
  );
}
