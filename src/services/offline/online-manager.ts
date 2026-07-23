import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, type QueryClient } from '@tanstack/react-query';

/**
 * Real connectivity, made the single source of truth for the whole data layer.
 *
 * TanStack Query's `onlineManager` is what decides whether a query may run and
 * whether a mutation fires now or is parked until later. Its web default
 * (`navigator.onLine`) is fine for browsers but does nothing on a phone, so on
 * native we drive it from NetInfo — and, importantly, we treat "connected to a
 * router but no actual internet" (`isInternetReachable === false`) as offline,
 * because a write to Supabase would hang, not fail fast. Getting this right is
 * what makes offline detection trustworthy enough to build the sync UX on.
 */
export function configureOnlineManager(): void {
  if (Platform.OS === 'web') {
    onlineManager.setEventListener((setOnline) => {
      const update = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
      if (typeof window !== 'undefined') {
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
      }
      update();
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', update);
          window.removeEventListener('offline', update);
        }
      };
    });
    return;
  }

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable ?? state.isConnected ?? false;
      setOnline(Boolean(state.isConnected) && reachable);
    })
  );
}

/** Subscribes a component to connectivity changes. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(onStoreChange),
    () => onlineManager.isOnline(),
    () => true
  );
}

/**
 * How many local changes are queued waiting for a connection.
 *
 * A mutation that can't reach the server while offline is *paused* by TanStack
 * (never dropped); this counts those so the UI can honestly say "3 changes will
 * sync when you're back online" rather than pretending everything is saved.
 */
export function usePendingSyncCount(queryClient: QueryClient): number {
  const cache = queryClient.getMutationCache();
  return useSyncExternalStore(
    (onStoreChange) => cache.subscribe(onStoreChange),
    () => cache.getAll().filter((mutation) => mutation.state.isPaused).length,
    () => 0
  );
}
