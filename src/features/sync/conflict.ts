/**
 * Conflict detection for the offline-first sync engine (see OFFLINE_SYNC.md),
 * kept as pure functions so the "when does money need a human?" rules are
 * unit-testable without a database or a running device.
 *
 * The model is three-way: `base` is the row as the local device last saw it
 * from the server, `local` is the device's current edited copy, and `server`
 * is what the server holds now. Comparing both sides against `base` — rather
 * than local against server — is what lets two devices that touched different
 * fields merge cleanly instead of clobbering each other.
 */

/** Tables whose conflicts must always be resolved by a human, never merged. */
export const FINANCIAL_ENTITY_TYPES = [
  'financial_transactions',
  'ledger_entries',
  'loans',
  'loan_events',
  'loan_instalments',
] as const;

export type FinancialEntityType = (typeof FINANCIAL_ENTITY_TYPES)[number];

export function isFinancialEntity(entityType: string): boolean {
  return (FINANCIAL_ENTITY_TYPES as readonly string[]).includes(entityType);
}

/** The minimum every syncable row carries (see OFFLINE_SYNC.md "Sync fields"). */
export interface SyncableRow {
  id: string;
  version: number;
  [field: string]: unknown;
}

/** Fields that are bookkeeping, not user content — never counted as a change. */
const IGNORED_FIELDS = new Set(['version', 'updated_at', 'created_at', 'device_id', 'created_by_device_id']);

/**
 * The keys whose value differs between two versions of a row, ignoring the
 * sync bookkeeping columns. Uses a stable JSON comparison so nested objects
 * (jsonb columns) compare by value rather than by reference.
 */
export function changedFields(base: SyncableRow, next: SyncableRow): string[] {
  const keys = new Set([...Object.keys(base), ...Object.keys(next)]);
  const changed: string[] = [];

  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    if (!valuesEqual(base[key], next[key])) changed.push(key);
  }

  return changed.sort();
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Cheap structural compare good enough for jsonb columns and arrays; both
  // sides are already plain JSON values coming off the wire.
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export type ConflictResolution =
  /** Local is unchanged and the server moved on — just take the server row. */
  | { kind: 'apply_server' }
  /** Server hasn't moved since base, or only local changed — push local. */
  | { kind: 'apply_local' }
  /** Both moved but touched disjoint fields — safe automatic three-way merge. */
  | { kind: 'merged'; merged: SyncableRow; localFields: string[]; serverFields: string[] }
  /** Genuinely overlapping (or financial) — a human must choose. */
  | { kind: 'conflict'; localFields: string[]; serverFields: string[] };

/**
 * Decides what to do with one row given all three versions.
 *
 * Overlapping edits, and *any* edit to a financial entity that the server also
 * changed, resolve to `conflict` so the row is preserved in `sync_conflicts`
 * for the user rather than one side silently winning.
 */
export function detectConflict(args: {
  entityType: string;
  base: SyncableRow;
  local: SyncableRow;
  server: SyncableRow;
}): ConflictResolution {
  const { entityType, base, local, server } = args;

  const localFields = changedFields(base, local);
  const serverFields = changedFields(base, server);

  // The server row is identical to what local started from: local is the only
  // edit in play, so it wins outright.
  if (server.version === base.version || serverFields.length === 0) {
    return localFields.length === 0 ? { kind: 'apply_server' } : { kind: 'apply_local' };
  }

  // The server moved but local never actually edited anything: take the server.
  if (localFields.length === 0) {
    return { kind: 'apply_server' };
  }

  const overlap = localFields.filter((field) => serverFields.includes(field));

  // Money is never merged automatically, even across disjoint fields — the
  // safe-by-default rule from OFFLINE_SYNC.md.
  if (overlap.length > 0 || isFinancialEntity(entityType)) {
    return { kind: 'conflict', localFields, serverFields };
  }

  // Disjoint, non-financial: apply each side's own changes onto the newer
  // server row, and carry the server's version forward as the new base.
  const merged: SyncableRow = { ...server };
  for (const field of localFields) merged[field] = local[field];

  return { kind: 'merged', merged, localFields, serverFields };
}
