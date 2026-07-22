import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Shared guard + chrome for every authenticated top-level route segment
 * (today, tasks, notes, finance, people, loans, investments, documents,
 * reports, settings, habits, calendar, imports, scan). Each of those
 * directories' `_layout.tsx` is a one-line wrapper around this component,
 * so route guarding and navigation chrome can never drift between sections.
 */
export function AuthenticatedLayout() {
  const theme = useTheme();
  const { session, isLoading } = useAuth();

  if (isLoading) {
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

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
