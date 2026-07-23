import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  enqueue as enqueuePure,
  markFailed,
  markSynced,
  type Mutation,
  type OutboxEntry,
} from '@/features/sync/outbox';
import { logger } from '@/utils/logger';

/**
 * The durable side of the offline engine: a queue of local writes persisted to
 * device storage so a change made offline survives even a full app restart and
 * is replayed to Supabase on reconnect.
 *
 * This is the missing piece TanStack's in-memory mutation pausing can't cover —
 * a paused mutation can't carry its function across a reload. Here the *data*
 * (entity, op, payload) is what's persisted, and a generic runner
 * (`sync-runner.ts`) knows how to apply it, so replay needs nothing from the
 * process that queued it. The pure reducers in `@/features/sync/outbox` do the
 * coalescing and backoff maths; this module just owns the persisted state.
 */

const STORAGE_KEY = 'amrit-lifeos.outbox.v1';

let queue: OutboxEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    // A failed persist must never crash a user action; the in-memory queue
    // still drains this session, we just lose cross-restart durability for it.
    logger.error('offline.outbox_persist_failed', error);
  }
}

/** Loads any queue left over from a previous session. Safe to call more than once. */
export async function initOutbox(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) queue = JSON.parse(raw) as OutboxEntry[];
  } catch (error) {
    logger.error('offline.outbox_load_failed', error);
  }
  loaded = true;
  emit();
}

export function getOutbox(): readonly OutboxEntry[] {
  return queue;
}

export function subscribeOutbox(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Queues a write (coalescing with any pending write for the same row). */
export function enqueueOutbox(mutation: Mutation): void {
  queue = enqueuePure(queue, mutation, Date.now());
  void persist();
  emit();
}

/** Drops an entry the server has accepted. */
export function resolveSynced(entityType: string, entityId: string): void {
  queue = markSynced(queue, entityType, entityId);
  void persist();
  emit();
}

/** Records a failed attempt and schedules the next retry with backoff. */
export function resolveFailed(entityType: string, entityId: string): void {
  queue = markFailed(queue, entityType, entityId, Date.now());
  void persist();
  emit();
}

/** How many local writes are still queued — for the offline status banner. */
export function useOutboxCount(): number {
  return useSyncExternalStore(
    subscribeOutbox,
    () => queue.length,
    () => 0
  );
}
