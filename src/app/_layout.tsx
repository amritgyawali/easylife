import { useState } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { RootErrorBoundary } from '@/components/layout/RootErrorBoundary';
import { EnvGate } from '@/components/layout/EnvGate';
import { AppLockGate } from '@/components/layout/AppLockGate';
import { ThemedView } from '@/components/ui/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { configureOnlineManager } from '@/services/offline/online-manager';
import { persistOptions } from '@/services/offline/persister';

// Point TanStack's connectivity source at real device network state before any
// query or mutation runs (see online-manager.ts). Module scope so it happens
// exactly once, ahead of the first render.
configureOnlineManager();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Keep cached data alive long enough for the persister to still have
            // something to restore after days offline — the default 5 minutes
            // would evict it almost immediately and defeat offline reads.
            gcTime: 1_000 * 60 * 60 * 24 * 30,
          },
        },
      })
  );

  return (
    <RootErrorBoundary>
      <EnvGate>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          // Once the on-disk cache is rehydrated, push any changes that were
          // queued while offline; TanStack also does this automatically the
          // moment connectivity returns.
          onSuccess={() => {
            void queryClient.resumePausedMutations();
          }}
        >
          <AuthProvider>
            <SafeAreaProvider>
              <ThemedRoot />
            </SafeAreaProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
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
