import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { APP_URL } from '@/constants/app';

/**
 * Where Supabase should send the user back to after they click an emailed
 * link (confirmation, magic link, password recovery).
 *
 * These paths deliberately omit the `(auth)` segment: route groups in
 * parentheses organise the file tree without appearing in the URL, so
 * src/app/(auth)/callback.tsx is served at `/callback`, not `/auth/callback`.
 *
 * On web we use the configured public app URL so the link resolves against
 * the deployed origin. On native we let expo-linking build the deep link,
 * which yields `amritlifeos://callback` in a development or production build.
 *
 * Caveat for Expo Go: expo-linking generates an `exp://<lan-ip>:8081/--/...`
 * URL there, which the Expo docs describe as neither stable nor predictable,
 * and which would have to be re-added to Supabase's redirect allow-list every
 * time the LAN address changes. Email-link flows are therefore only reliable
 * in a development build — email + password sign-in works everywhere.
 */
export type AuthRedirectPath = '/callback' | '/reset-password';

export function authRedirectUrl(path: AuthRedirectPath): string {
  if (Platform.OS === 'web') return `${APP_URL}${path}`;
  return Linking.createURL(path);
}
