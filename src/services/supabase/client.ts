import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '@/constants/env';
import type { Database } from '@/types/database';
import { LargeSecureStore } from '@/services/supabase/secure-store-adapter';

let client: SupabaseClient<Database> | null = null;

/**
 * Singleton Supabase client. Uses the encrypted SecureStore-backed adapter
 * on native (see secure-store-adapter.ts) and falls back to the browser's
 * own storage on web, where `expo-secure-store` has no secure native
 * counterpart to wrap. The anon key is safe to embed in the client — it can
 * only do what Row Level Security allows (see supabase/policies).
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const env = getEnv();

  client = createClient<Database>(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  return client;
}

/**
 * Supabase's auto token refresh relies on being told when the app returns
 * to the foreground; on native it does nothing on its own. Call this once
 * near the app root (see src/app/_layout.tsx).
 */
export function registerAuthRefreshOnAppStateChange(): () => void {
  if (Platform.OS === 'web') return () => {};

  const subscription = AppState.addEventListener('change', (state) => {
    const supabase = getSupabaseClient();
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });

  return () => subscription.remove();
}
