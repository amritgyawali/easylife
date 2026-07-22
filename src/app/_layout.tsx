import { useState } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { RootErrorBoundary } from '@/components/layout/RootErrorBoundary';
import { EnvGate } from '@/components/layout/EnvGate';
import { AppLockGate } from '@/components/layout/AppLockGate';
import { ThemedView } from '@/components/ui/ThemedView';
import { useTheme } from '@/hooks/useTheme';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <RootErrorBoundary>
      <EnvGate>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SafeAreaProvider>
              <ThemedRoot />
            </SafeAreaProvider>
          </AuthProvider>
        </QueryClientProvider>
      </EnvGate>
    </RootErrorBoundary>
  );
}

function ThemedRoot() {
  const theme = useTheme();

  return (
    <ThemedView style={{ flex: 1 }}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <AppLockGate>
        <Slot />
      </AppLockGate>
    </ThemedView>
  );
}
