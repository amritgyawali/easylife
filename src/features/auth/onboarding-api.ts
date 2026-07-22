import { getSupabaseClient } from '@/services/supabase/client';
import { AppError } from '@/utils/errors';
import { toMinorUnits } from '@/utils/money';
import type { AccountType } from '@/types/database';

export interface OnboardingAccountInput {
  name: string;
  accountType: AccountType;
  currency: string;
  openingBalance: string;
}

/**
 * Creates one starting account (cash, and optionally a bank/wallet) during
 * onboarding. This is a plain insert into `accounts` — the full accounts
 * feature (editing, archiving, balance reporting) is Phase 3 work, but the
 * table and its RLS policy already exist, so onboarding can safely use it.
 */
export async function createOnboardingAccount(userId: string, input: OnboardingAccountInput): Promise<void> {
  const supabase = getSupabaseClient();

  const openingBalanceMinor = toMinorUnits(input.openingBalance || '0', input.currency);

  const { error } = await supabase.from('accounts').insert({
    user_id: userId,
    name: input.name,
    account_type: input.accountType,
    currency: input.currency,
    opening_balance_minor: openingBalanceMinor,
  });

  if (error) throw new AppError('unknown', error.message, error);
}
