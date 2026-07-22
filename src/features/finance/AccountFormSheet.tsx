import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { MoneyField } from '@/components/forms/MoneyField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { SUPPORTED_CURRENCIES } from '@/constants/app';
import { toUserMessage } from '@/utils/errors';
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
      onClose={onClose}
      footer={
        <>
          {account ? (
            <Button
              label="Archive"
              variant="secondary"
              disabled={pending}
              onPress={async () => {
                await archiveAccount.mutateAsync(account.id);
                onClose();
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button label="Save" loading={pending} fullWidth onPress={() => void handleSave()} />
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
        placeholder="e.g. NIC Asia savings"
        autoFocus
      />

      <OptionGroup
        label="Type"
        options={SELECTABLE_ACCOUNT_TYPES}
        value={accountType}
        onChange={setAccountType}
      />

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
      />

      <TextField
        label="Institution"
        value={institution}
        onChangeText={setInstitution}
        placeholder="Optional — bank, wallet or co-operative"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Checkbox
          checked={includeInNetWorth}
          onChange={setIncludeInNetWorth}
          accessibilityLabel="Include this account in net worth"
        />
        <ThemedText variant="body">Count towards net worth</ThemedText>
      </View>

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
