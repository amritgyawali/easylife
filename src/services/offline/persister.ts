import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { APP_VERSION } from '@/constants/app';

/**
 * Persists the query cache to device storage so the app opens straight into
 * the user's real data with no network — every screen they've visited is still
 * there after a cold start on a plane or in a dead zone.
 *
 * AsyncStorage is used on every platform (React Native Web maps it onto
 * `localStorage`), so this one persister covers web and native alike. Only
 * successful query data is written back; in-flight/paused mutations are kept in
 * memory and replayed on reconnect (see `configureOnlineManager`), not frozen
 * to disk, so a half-finished write can never be resurrected in a broken state.
 */
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'amrit-lifeos.query-cache.v1',
  // Coalesce rapid cache churn into at most one disk write per second.
  throttleTime: 1_000,
});

/** Cached data older than this is discarded on restore rather than shown as fresh. */
const MAX_AGE_MS = 1_000 * 60 * 60 * 24 * 30; // 30 days

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: asyncStoragePersister,
  maxAge: MAX_AGE_MS,
  // Bumping the app version invalidates any cache written by an older build,
  // so a shape change to a cached row can never be read back into new code.
  buster: APP_VERSION,
  dehydrateOptions: {
    // Persist only settled query results; never write pending/paused mutations
    // to disk (they can't carry their function across a reload).
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query) => query.state.status === 'success',
  },
};
