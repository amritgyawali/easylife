/**
 * The outbox: the queue of local mutations waiting to be pushed to Supabase
 * (see OFFLINE_SYNC.md "Outbox / pending-sync queue"). Modelled as pure
 * reducer functions over an immutable queue so the coalescing and backoff
 * rules can be tested exhaustively without a network or a timer.
 *
 * Because every row's `id` is client-generated and stable, a queued mutation
 * is idempotent — replaying it after a failed attempt is safe, and an
 * `insert` is applied as an upsert keyed on that id.
 */

export type MutationOp = 'insert' | 'update' | 'delete';
export type OutboxStatus = 'pending' | 'failed';

export interface OutboxEntry {
  /** Stable per-entity key: one live entry per (entityType, entityId) at a time. */
  entityType: string;
  entityId: string;
  op: MutationOp;
  /** The full row for insert/update; irrelevant (and ignored) for delete. */
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  /** Epoch ms; the entry is not eligible to send again before this. */
  nextAttemptAt: number;
  updatedAt: number;
}

export interface Mutation {
  entityType: string;
  entityId: string;
  op: MutationOp;
  payload?: Record<string, unknown>;
}

const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;

/**
 * Exponential backoff for the Nth retry, capped. Deterministic (no jitter) so
 * the schedule is testable; jitter, if ever needed, is added at drain time.
 */
export function backoffDelayMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);
}

function keyOf(entry: { entityType: string; entityId: string }): string {
  return `${entry.entityType}:${entry.entityId}`;
}

/**
 * Adds a mutation, coalescing it with any pending mutation for the same row so
 * the queue holds the *net* effect, not a replay of every keystroke:
 *
 *   - insert then update  → a single insert carrying the merged payload
 *   - insert then delete   → nothing (the row never reached the server)
 *   - update then update   → one update with merged payload
 *   - * then delete        → a delete (a queued insert is dropped, see above)
 *
 * A fresh mutation always resets status/attempts: the row changed again, so an
 * earlier failure is no longer the thing we're retrying.
 */
export function enqueue(queue: readonly OutboxEntry[], mutation: Mutation, now: number): OutboxEntry[] {
  const key = keyOf(mutation);
  const existing = queue.find((entry) => keyOf(entry) === key);
  const rest = queue.filter((entry) => keyOf(entry) !== key);

  if (mutation.op === 'delete') {
    // An insert that never synced can just vanish with its delete.
    if (existing && existing.op === 'insert') return rest;
    return [...rest, makeEntry(mutation, 'delete', {}, now)];
  }

  if (existing && existing.op === 'delete') {
    // Re-creating a row that had a pending delete: treat as a fresh insert.
    return [...rest, makeEntry(mutation, 'insert', mutation.payload ?? {}, now)];
  }

  const mergedPayload = { ...(existing?.payload ?? {}), ...(mutation.payload ?? {}) };
  // Once an insert is queued, later edits stay part of that insert until it syncs.
  const op: MutationOp = existing?.op === 'insert' ? 'insert' : mutation.op;

  return [...rest, makeEntry(mutation, op, mergedPayload, now)];
}

function makeEntry(
  mutation: Mutation,
  op: MutationOp,
  payload: Record<string, unknown>,
  now: number
): OutboxEntry {
  return {
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    op,
    payload,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: now,
    updatedAt: now,
  };
}

/** Removes an entry once the server has accepted it. */
export function markSynced(
  queue: readonly OutboxEntry[],
  entityType: string,
  entityId: string
): OutboxEntry[] {
  const key = keyOf({ entityType, entityId });
  return queue.filter((entry) => keyOf(entry) !== key);
}

/** Records a failed attempt and schedules the next one with backoff. */
export function markFailed(
  queue: readonly OutboxEntry[],
  entityType: string,
  entityId: string,
  now: number
): OutboxEntry[] {
  const key = keyOf({ entityType, entityId });
  return queue.map((entry) => {
    if (keyOf(entry) !== key) return entry;
    const attempts = entry.attempts + 1;
    return {
      ...entry,
      status: 'failed',
      attempts,
      nextAttemptAt: now + backoffDelayMs(attempts),
      updatedAt: now,
    };
  });
}

/**
 * One-time repair for entries queued before quick-add's `source` value was
 * fixed from `'quick_add'` to `'quick_entry'` (the only values the DB's
 * `tasks.source` check constraint accepts are `manual`/`quick_entry`/
 * `recurrence`). Those entries could never pass validation and were stuck
 * retrying forever — see `offline.sync_entry_failed` in sync-runner.ts.
 * Rewriting the payload and resetting backoff lets them sync on the very
 * next drain instead of losing the task.
 */
export function repairQuickAddSource(queue: readonly OutboxEntry[]): OutboxEntry[] {
  return queue.map((entry) => {
    if (entry.entityType !== 'tasks' || entry.payload.source !== 'quick_add') return entry;
    return {
      ...entry,
      payload: { ...entry.payload, source: 'quick_entry' },
      status: 'pending',
      attempts: 0,
      nextAttemptAt: 0,
    };
  });
}

/** Entries eligible to send right now, oldest-queued first. */
export function dueEntries(queue: readonly OutboxEntry[], now: number): OutboxEntry[] {
  return queue.filter((entry) => entry.nextAttemptAt <= now).sort((a, b) => a.updatedAt - b.updatedAt);
}

/** Count still waiting to sync — what the status indicator shows. */
export function pendingCount(queue: readonly OutboxEntry[]): number {
  return queue.length;
}
