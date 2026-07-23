import {
  BACKUP_FORMAT_VERSION,
  backupRowCount,
  buildBackup,
  parseBackup,
  serializeBackup,
  summariseBackup,
  type BackupBundle,
} from '@/features/export/backup';
import { isAppError } from '@/utils/errors';

function sampleBundle(): BackupBundle {
  return buildBackup({
    userId: 'user-1',
    exportedAt: '2026-07-23T00:00:00.000Z',
    tables: {
      tasks: [{ id: 't1' }, { id: 't2' }],
      accounts: [{ id: 'a1' }],
      notes: [],
    },
  });
}

describe('buildBackup', () => {
  it('stamps the format version, timestamp and user', () => {
    const bundle = sampleBundle();
    expect(bundle.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(bundle.exportedAt).toBe('2026-07-23T00:00:00.000Z');
    expect(bundle.userId).toBe('user-1');
  });
});

describe('summariseBackup / backupRowCount', () => {
  it('lists only non-empty tables with their counts', () => {
    const summary = summariseBackup(sampleBundle());
    expect(summary).toEqual([
      { table: 'tasks', count: 2 },
      { table: 'accounts', count: 1 },
    ]);
  });

  it('totals rows across all tables', () => {
    expect(backupRowCount(sampleBundle())).toBe(3);
  });
});

describe('parseBackup', () => {
  it('round-trips a serialized bundle', () => {
    const bundle = sampleBundle();
    const restored = parseBackup(serializeBackup(bundle));
    expect(restored.userId).toBe('user-1');
    expect(restored.tables.tasks).toHaveLength(2);
  });

  it('rejects non-JSON input', () => {
    expect(() => parseBackup('not json {')).toThrow();
    try {
      parseBackup('not json {');
    } catch (error) {
      expect(isAppError(error) && error.code).toBe('validation_failed');
    }
  });

  it('rejects a file that is not shaped like a backup', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow();
  });

  it('refuses a bundle from a newer format version', () => {
    const future = JSON.stringify({
      app: 'Amrit LifeOS',
      formatVersion: BACKUP_FORMAT_VERSION + 1,
      exportedAt: '2026-07-23T00:00:00.000Z',
      appVersion: '9.9.9',
      userId: 'user-1',
      tables: {},
    });
    expect(() => parseBackup(future)).toThrow();
  });
});
