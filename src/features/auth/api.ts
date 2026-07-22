import type { AuthError, Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/services/supabase/client';
import { APP_URL } from '@/constants/app';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Thin wrapper around supabase-js Auth. Every function maps Supabase's
 * AuthError into our AppError taxonomy so the UI layer never has to parse
 * provider-specific error strings, and never logs the credentials/tokens
 * involved (see SECURITY.md — auth tokens are never logged).
 */

function mapAuthError(error: AuthError): AppError {
  const status = error.status ?? 0;

  if (status === 400 || error.message.toLowerCase().includes('invalid login credentials')) {
    return new AppError('auth_failed', error.message, error);
  }
  if (status === 429) {
    return new AppError('rate_limited', error.message, error);
  }
  if (status >= 500) {
    return new AppError('service_unavailable', error.message, error);
  }
  return new AppError('unknown', error.message, error);
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName?: string;
}

export async function signUpWithPassword({ email, password, fullName }: SignUpInput): Promise<{
  session: Session | null;
  requiresEmailConfirmation: boolean;
}> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error) throw mapAuthError(error);

  logger.info('auth.sign_up', { hasSession: Boolean(data.session) });

  return {
    session: data.session,
    requiresEmailConfirmation: !data.session,
  };
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw mapAuthError(error);
  if (!data.session) throw new AppError('auth_failed', 'No session returned after sign-in');

  logger.info('auth.sign_in_password');
  return data.session;
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback` },
  });

  if (error) throw mapAuthError(error);
  logger.info('auth.magic_link_sent');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/auth/reset-password`,
  });

  if (error) throw mapAuthError(error);
  logger.info('auth.password_reset_requested');
}

export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) throw mapAuthError(error);
  logger.info('auth.password_updated');
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw mapAuthError(error);
  logger.info('auth.sign_out');
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw mapAuthError(error);
  return data.session;
}
