import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthScreenLayout } from '@/components/layout/AuthScreenLayout';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';

/**
 * Landing point for magic-link / email-confirmation / password-recovery
 * redirects. On web, supabase-js reads the token from the URL automatically
 * (detectSessionInUrl: true) and AuthProvider's onAuthStateChange listener
 * picks up the resulting session — this screen just waits for that and
 * routes onward.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(session ? '/' : '/(auth)/sign-in');
  }, [isLoading, session, router]);

  return (
    <AuthScreenLayout title="Signing you in" subtitle="One moment...">
      <ActivityIndicator color={theme.colors.primary} />
    </AuthScreenLayout>
  );
}
