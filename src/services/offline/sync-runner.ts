import { onlineManager, type QueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { dueEntries, type OutboxEntry } from '@/features/sync/outbox';
import { logger } from '@/utils/logger';
import { getOutbox, resolveFailed, resolveSynced, subscribeOutbox } from '@/services/offline/outbox-store';

/**
 * Drains the persisted outbox to Supabase whenever there's a connection.
 *
 * Kept generic on purpose: every syncable row carries a client-generated `id`
 * and its own `user_id`, so applying a queued write is the same shape for any
 * table — upsert the payload (idempotent on `id`, so a retry can never
 * duplicate) or soft-delete by id. Adding a new offline-capable entity is one
 * line in `OUTBOX_TABLES` plus its invalidation key, not a new code path.
 */

/** entityType → { table to write, query key prefix to refresh after a sync }. */
const OUTBOX_TABLES: Record<string, { table: string; invalidate: readonly string[] }> = {
  tasks: { table: 'tasks', invalidate: ['tasks'] },
  notes: { table: 'notes', invalidate: ['notes'] },
};

// The table name is only known at runtime, so the generated per-table column
// types don't apply; PostgREST validates the payload server-side and RLS keeps
// it scoped to the user. This narrow shape is all the runner needs.
interface DynamicTable {
  upsert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => Promise<{ error: unknown }>;
  };
}

function tableFor(table: string): DynamicTable {
  return (getSupabaseClient() as unknown as { from: (name: string) => DynamicTable }).from(table);
}

async function applyEntry(entry: OutboxEntry): Promise<void> {
  const handler = OUTBOX_TABLES[entry.entityType];
  if (!handler) throw new Error(`No offline sync handler for "${entry.entityType}"`);

  const table = tableFor(handler.table);

  if (entry.op === 'delete') {
    const { error } = await table.update({ deleted_at: new Date().toISOString() }).eq('id', entry.entityId);
    if (error) throw error;
    return;
  }

  const { error } = await table.upsert(entry.payload);
  if (error) throw error;
}

let draining = false;

/** Pushes every currently-due entry once. No-op while offline or already running. */
export async function drainOutbox(queryClient: QueryClient): Promise<void> {
  if (draining || !onlineManager.isOnline()) return;
  draining = true;
  try {
    const touched = new Set<string>();

    for (const entry of dueEntries(getOutbox(), Date.now())) {
      try {
        await applyEntry(entry);
        resolveSynced(entry.entityType, entry.entityId);
        touched.add(entry.entityType);
      } catch (error) {
        // Kept in the queue with a backed-off next attempt, never dropped.
        logger.error('offline.sync_entry_failed', error);
        resolveFailed(entry.entityType, entry.entityId);
      }
    }

    for (const entityType of touched) {
      const key = OUTBOX_TABLES[entityType]?.invalidate;
      if (key) void queryClient.invalidateQueries({ queryKey: [...key] });
    }
  } finally {
    draining = false;
  }
}

/**
 * Starts draining: on reconnect, whenever the queue changes, and on a slow
 * interval so a backed-off entry eventually gets its retry. Returns a cleanup
 * that detaches every listener.
 */
export function startSyncRunner(queryClient: QueryClient): () => void {
  const kick = () => {
    void drainOutbox(queryClient);
  };

  const unsubscribeOnline = onlineManager.subscribe((online) => {
    if (online) kick();
  });
  const unsubscribeOutbox = subscribeOutbox(kick);
  const interval = setInterval(kick, 20_000);

  kick();

  return () => {
    unsubscribeOnline();
    unsubscribeOutbox();
    clearInterval(interval);
  };
}
