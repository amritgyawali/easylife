import { getSupabaseClient } from '@/services/supabase/client';
import { AppError } from '@/utils/errors';

/**
 * Permanently deletes the signed-in user's account and all associated data.
 * Actual deletion happens server-side (supabase/functions/delete-account) —
 * it needs the service-role key to remove the auth.users row, which cascades
 * to every user-owned table via ON DELETE CASCADE, plus the user's storage
 * folders in both buckets. The client only ever calls the function with the
 * caller's own access token; it can never delete another user.
 */
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });

  if (error) {
    throw new AppError('unknown', error.message, error);
  }
}
