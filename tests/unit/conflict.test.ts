import { changedFields, detectConflict, isFinancialEntity, type SyncableRow } from '@/features/sync/conflict';

function row(fields: Record<string, unknown>): SyncableRow {
  return { id: 'r1', version: 1, ...fields };
}

describe('isFinancialEntity', () => {
  it('flags money tables and nothing else', () => {
    expect(isFinancialEntity('financial_transactions')).toBe(true);
    expect(isFinancialEntity('loans')).toBe(true);
    expect(isFinancialEntity('tasks')).toBe(false);
    expect(isFinancialEntity('notes')).toBe(false);
  });
});

describe('changedFields', () => {
  it('ignores sync bookkeeping columns', () => {
    const base = row({ title: 'A', version: 1, updated_at: 't1', device_id: 'd1' });
    const next = row({ title: 'A', version: 2, updated_at: 't2', device_id: 'd2' });
    expect(changedFields(base, next)).toEqual([]);
  });

  it('detects value changes including jsonb by value', () => {
    const base = row({ title: 'A', meta: { a: 1 } });
    const next = row({ title: 'B', meta: { a: 1 } });
    expect(changedFields(base, next)).toEqual(['title']);
  });
});

describe('detectConflict', () => {
  const base = row({ version: 1, title: 'Buy milk', notes: 'from shop', done: false });

  it('applies local when only local changed', () => {
    const local = row({ version: 1, title: 'Buy oat milk', notes: 'from shop', done: false });
    const server = row({ version: 1, title: 'Buy milk', notes: 'from shop', done: false });
    expect(detectConflict({ entityType: 'tasks', base, local, server })).toEqual({ kind: 'apply_local' });
  });

  it('applies server when only server changed', () => {
    const local = row({ version: 1, title: 'Buy milk', notes: 'from shop', done: false });
    const server = row({ version: 2, title: 'Buy milk', notes: 'from shop', done: true });
    expect(detectConflict({ entityType: 'tasks', base, local, server })).toEqual({ kind: 'apply_server' });
  });

  it('merges disjoint non-financial edits automatically', () => {
    const local = row({ version: 1, title: 'Buy oat milk', notes: 'from shop', done: false });
    const server = row({ version: 2, title: 'Buy milk', notes: 'from shop', done: true });

    const result = detectConflict({ entityType: 'tasks', base, local, server });
    expect(result.kind).toBe('merged');
    if (result.kind === 'merged') {
      expect(result.merged.title).toBe('Buy oat milk'); // local's field
      expect(result.merged.done).toBe(true); // server's field
      expect(result.merged.version).toBe(2); // server version carried forward
    }
  });

  it('flags overlapping edits as a conflict', () => {
    const local = row({ version: 1, title: 'Buy oat milk', notes: 'from shop', done: false });
    const server = row({ version: 2, title: 'Buy soy milk', notes: 'from shop', done: false });
    const result = detectConflict({ entityType: 'tasks', base, local, server });
    expect(result.kind).toBe('conflict');
  });

  it('never auto-merges financial rows, even on disjoint fields', () => {
    const money = row({ version: 1, amount_minor: 1000, notes: 'lunch' });
    const local = row({ version: 1, amount_minor: 2000, notes: 'lunch' });
    const server = row({ version: 2, amount_minor: 1000, notes: 'team lunch' });
    const result = detectConflict({
      entityType: 'financial_transactions',
      base: money,
      local,
      server,
    });
    expect(result.kind).toBe('conflict');
  });
});
