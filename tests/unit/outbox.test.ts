import {
  backoffDelayMs,
  dueEntries,
  enqueue,
  markFailed,
  markSynced,
  pendingCount,
  type OutboxEntry,
} from '@/features/sync/outbox';

const T0 = 1_000_000;

describe('backoffDelayMs', () => {
  it('is zero on the first send and grows exponentially, capped', () => {
    expect(backoffDelayMs(0)).toBe(0);
    expect(backoffDelayMs(1)).toBe(5_000);
    expect(backoffDelayMs(2)).toBe(10_000);
    expect(backoffDelayMs(3)).toBe(20_000);
    expect(backoffDelayMs(99)).toBe(5 * 60_000);
  });
});

describe('enqueue coalescing', () => {
  it('keeps one entry per row, merging update payloads', () => {
    let queue = enqueue(
      [],
      { entityType: 'tasks', entityId: 't1', op: 'update', payload: { title: 'A' } },
      T0
    );
    queue = enqueue(
      queue,
      { entityType: 'tasks', entityId: 't1', op: 'update', payload: { done: true } },
      T0
    );

    expect(queue).toHaveLength(1);
    expect(queue[0]!.payload).toEqual({ title: 'A', done: true });
    expect(queue[0]!.op).toBe('update');
  });

  it('folds an update into a still-queued insert', () => {
    let queue = enqueue(
      [],
      { entityType: 'tasks', entityId: 't1', op: 'insert', payload: { title: 'A' } },
      T0
    );
    queue = enqueue(
      queue,
      { entityType: 'tasks', entityId: 't1', op: 'update', payload: { title: 'B' } },
      T0
    );

    expect(queue).toHaveLength(1);
    expect(queue[0]!.op).toBe('insert');
    expect(queue[0]!.payload).toEqual({ title: 'B' });
  });

  it('cancels an insert that is then deleted before syncing', () => {
    let queue = enqueue(
      [],
      { entityType: 'tasks', entityId: 't1', op: 'insert', payload: { title: 'A' } },
      T0
    );
    queue = enqueue(queue, { entityType: 'tasks', entityId: 't1', op: 'delete' }, T0);
    expect(queue).toHaveLength(0);
  });

  it('collapses an update-then-delete into a delete', () => {
    let queue = enqueue(
      [],
      { entityType: 'tasks', entityId: 't1', op: 'update', payload: { title: 'A' } },
      T0
    );
    queue = enqueue(queue, { entityType: 'tasks', entityId: 't1', op: 'delete' }, T0);
    expect(queue).toHaveLength(1);
    expect(queue[0]!.op).toBe('delete');
  });

  it('treats an edit after a queued delete as a fresh insert', () => {
    let queue = enqueue([], { entityType: 'tasks', entityId: 't1', op: 'delete' }, T0);
    queue = enqueue(
      queue,
      { entityType: 'tasks', entityId: 't1', op: 'update', payload: { title: 'A' } },
      T0
    );
    expect(queue).toHaveLength(1);
    expect(queue[0]!.op).toBe('insert');
  });

  it('keeps separate rows independent', () => {
    let queue = enqueue([], { entityType: 'tasks', entityId: 't1', op: 'insert', payload: {} }, T0);
    queue = enqueue(queue, { entityType: 'tasks', entityId: 't2', op: 'insert', payload: {} }, T0);
    expect(pendingCount(queue)).toBe(2);
  });
});

describe('retry scheduling', () => {
  const seed: OutboxEntry[] = [
    {
      entityType: 'tasks',
      entityId: 't1',
      op: 'update',
      payload: {},
      status: 'pending',
      attempts: 0,
      nextAttemptAt: T0,
      updatedAt: T0,
    },
  ];

  it('markFailed increments attempts and pushes the next attempt out', () => {
    const failed = markFailed(seed, 'tasks', 't1', T0);
    expect(failed[0]!.attempts).toBe(1);
    expect(failed[0]!.status).toBe('failed');
    expect(failed[0]!.nextAttemptAt).toBe(T0 + 5_000);
  });

  it('dueEntries excludes entries still in backoff', () => {
    const failed = markFailed(seed, 'tasks', 't1', T0);
    expect(dueEntries(failed, T0 + 1_000)).toHaveLength(0);
    expect(dueEntries(failed, T0 + 5_000)).toHaveLength(1);
  });

  it('markSynced removes the entry', () => {
    expect(markSynced(seed, 'tasks', 't1')).toHaveLength(0);
  });
});
