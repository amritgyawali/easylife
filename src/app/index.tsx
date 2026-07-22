import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/auth/useProfile';
import { useTheme } from '@/hooks/useTheme';
import { AppShell } from '@/components/layout/AppShell';
import { ComingSoonScreen } from '@/components/layout/ComingSoonScreen';

/**
 * Root route: gates on auth, then onboarding, then shows the dashboard.
 * The dashboard itself (customisable cards, quick actions) is Phase 2 work —
 * this renders a placeholder inside the real navigation shell so the shell
 * is fully exercised from day one.
 */
export default function RootIndexScreen() {
  const theme = useTheme();
  const { session, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading: isProfileLoading } = useProfile();

  if (isAuthLoading || (session && isProfileLoading)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (data && !data.profile.onboarding_completed) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppShell>
      <ComingSoonScreen title="Dashboard" phase="Phase 2 (Daily life)" />
    </AppShell>
  );
}
