import { z } from 'zod';

import { APP_NAME, APP_VERSION } from '@/constants/app';
import { AppError } from '@/utils/errors';

/**
 * A full-account backup bundle: a single self-describing JSON document that
 * holds every row the user owns, table by table. It is deliberately a plain
 * dump of the domain tables rather than a re-derived shape, so a restore can
 * be a straight upsert and so nothing about the data is quietly reinterpreted
 * on the way out.
 *
 * `formatVersion` is checked on the way back in: a future schema change bumps
 * it, and an old app refuses a bundle it doesn't understand instead of
 * silently importing rows it can't place. Everything here is pure — the actual
 * fetching and file writing live in `api.ts` / `download.ts`.
 */

export const BACKUP_FORMAT_VERSION = 1;

/**
 * Tables included in a backup, in dependency order (parents before children)
 * so a restore that inserts them in sequence never trips a foreign key. Derived
 * caches (`account_balance_snapshots`), append-only server logs (`audit_logs`)
 * and the auth/session tables are intentionally excluded — they are rebuilt or
 * re-earned, not user content worth restoring.
 */
export const BACKUP_TABLES = [
  'profiles',
  'user_preferences',
  'tags',
  'projects',
  'tasks',
  'task_subtasks',
  'task_dependencies',
  'task_recurrence_rules',
  'task_reminders',
  'habits',
  'habit_entries',
  'notes',
  'note_versions',
  'note_links',
  'calendar_events',
  'accounts',
  'categories',
  'counterparties',
  'counterparty_aliases',
  'exchange_rates',
  'financial_transactions',
  'ledger_entries',
  'transaction_splits',
  'budgets',
  'budget_items',
  'savings_goals',
  'goal_events',
  'loans',
  'loan_events',
  'loan_instalments',
  'loan_reminders',
  'investment_assets',
  'investment_transactions',
  'investment_valuations',
  'documents',
  'import_profiles',
  'entity_tags',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupTableData = Record<BackupTable, unknown[]>;

export interface BackupBundle {
  app: string;
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  userId: string;
  tables: Partial<BackupTableData>;
}

export interface BuildBackupInput {
  userId: string;
  exportedAt: string;
  tables: Partial<BackupTableData>;
}

/** Assembles the in-memory bundle. Pure — no I/O, no clock read. */
export function buildBackup(input: BuildBackupInput): BackupBundle {
  return {
    app: APP_NAME,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: input.exportedAt,
    appVersion: APP_VERSION,
    userId: input.userId,
    tables: input.tables,
  };
}

/** Pretty-prints the bundle for a downloadable `.json` file. */
export function serializeBackup(bundle: BackupBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** One `{ table, count }` per non-empty table, for a restore preview. */
export function summariseBackup(bundle: BackupBundle): { table: BackupTable; count: number }[] {
  return BACKUP_TABLES.map((table) => ({ table, count: bundle.tables[table]?.length ?? 0 })).filter(
    (entry) => entry.count > 0
  );
}

/** Total row count across every table in the bundle. */
export function backupRowCount(bundle: BackupBundle): number {
  return BACKUP_TABLES.reduce((total, table) => total + (bundle.tables[table]?.length ?? 0), 0);
}

const backupSchema = z.object({
  app: z.string(),
  formatVersion: z.number(),
  exportedAt: z.string(),
  appVersion: z.string(),
  userId: z.string(),
  tables: z.record(z.string(), z.array(z.unknown())),
});

/**
 * Validates untrusted JSON (a file the user picked) before it is treated as a
 * backup. Rejects a bundle from a newer format the current app can't safely
 * restore, rather than importing rows into columns that may have moved.
 */
export function parseBackup(raw: string): BackupBundle {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AppError('validation_failed', 'This file is not valid JSON.');
  }

  const result = backupSchema.safeParse(json);
  if (!result.success) {
    throw new AppError('validation_failed', 'This file is not a recognised backup.');
  }

  if (result.data.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new AppError(
      'validation_failed',
      'This backup was made by a newer version of the app. Update the app to restore it.'
    );
  }

  return result.data as BackupBundle;
}
