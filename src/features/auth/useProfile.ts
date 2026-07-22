import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { AppError } from '@/utils/errors';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];

export interface ProfileWithPreferences {
  profile: ProfileRow;
  preferences: UserPreferencesRow;
}

async function fetchProfile(userId: string): Promise<ProfileWithPreferences> {
  const supabase = getSupabaseClient();

  const [profileResult, preferencesResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
  ]);

  if (profileResult.error) throw new AppError('unknown', profileResult.error.message, profileResult.error);
  if (preferencesResult.error)
    throw new AppError('unknown', preferencesResult.error.message, preferencesResult.error);

  return { profile: profileResult.data, preferences: preferencesResult.data };
}

export const profileQueryKey = (userId: string) => ['profile', userId] as const;

/** Profile + preferences for the signed-in user. Both rows are created automatically on sign-up (see handle_new_user trigger). */
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: profileQueryKey(user?.id ?? 'anonymous'),
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user),
  });
}

export interface UpdateProfileInput {
  fullName?: string;
  defaultCurrency?: string;
  onboardingCompleted?: boolean;
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!user) throw new AppError('session_expired', 'No signed-in user');
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('profiles')
        .update({
          ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
          ...(input.defaultCurrency !== undefined ? { default_currency: input.defaultCurrency } : {}),
          ...(input.onboardingCompleted !== undefined
            ? { onboarding_completed: input.onboardingCompleted }
            : {}),
        })
        .eq('id', user.id);

      if (error) throw new AppError('unknown', error.message, error);
    },
    onSuccess: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) });
    },
  });
}

export interface UpdatePreferencesInput {
  timezone?: string;
  language?: 'en' | 'ne';
  dateSystem?: 'AD' | 'BS';
  weekStart?: number;
  theme?: 'light' | 'dark' | 'system';
  fiscalYearStartMonth?: number;
  biometricLockEnabled?: boolean;
  pinLockEnabled?: boolean;
  autoLockMinutes?: number;
  /** Bulk on/off toggle for all notification categories, used by onboarding's single yes/no question. Settings can later edit categories individually via the same jsonb column. */
  notificationPreferencesEnabled?: boolean;
}

const DEFAULT_NOTIFICATION_CATEGORIES = [
  'task_reminders',
  'habit_reminders',
  'bill_reminders',
  'loan_due_reminders',
  'weekly_summary',
] as const;

export function useUpdatePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      if (!user) throw new AppError('session_expired', 'No signed-in user');
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('user_preferences')
        .update({
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.dateSystem !== undefined ? { date_system: input.dateSystem } : {}),
          ...(input.weekStart !== undefined ? { week_start: input.weekStart } : {}),
          ...(input.theme !== undefined ? { theme: input.theme } : {}),
          ...(input.fiscalYearStartMonth !== undefined
            ? { fiscal_year_start_month: input.fiscalYearStartMonth }
            : {}),
          ...(input.biometricLockEnabled !== undefined
            ? { biometric_lock_enabled: input.biometricLockEnabled }
            : {}),
          ...(input.pinLockEnabled !== undefined ? { pin_lock_enabled: input.pinLockEnabled } : {}),
          ...(input.autoLockMinutes !== undefined ? { auto_lock_minutes: input.autoLockMinutes } : {}),
          ...(input.notificationPreferencesEnabled !== undefined
            ? {
                notification_preferences: Object.fromEntries(
                  DEFAULT_NOTIFICATION_CATEGORIES.map((category) => [
                    category,
                    input.notificationPreferencesEnabled,
                  ])
                ),
              }
            : {}),
        })
        .eq('user_id', user.id);

      if (error) throw new AppError('unknown', error.message, error);
    },
    onSuccess: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) });
    },
  });
}
