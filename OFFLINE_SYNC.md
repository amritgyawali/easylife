# Offline & Sync

**Status (Phase 6):** the conflict-resolution rules and the outbox queue model are implemented as pure, unit-tested engines (`src/features/sync/conflict.ts`, `src/features/sync/outbox.ts`), the server-side conflict log and notifications are surfaced in a "Sync & notifications" screen, and data **exports/backups** are fully working end-to-end (`src/features/export/*`, Settings → Data & backup). What remains for a later pass is wiring those engines to a real mobile SQLite working store and a background drain loop — the web app runs live against Supabase and needs neither. The schema decisions this design depends on (soft deletion, `version`, `device_id` columns — see [DATABASE.md](./DATABASE.md)) were already in place from Phase 1.

## Why the working store is local SQLite on mobile

The mobile app must stay useful with no internet connection. Expo SQLite + Drizzle ORM will be the mobile working database (`src/database/local/`), mirroring the same domain shapes as `src/types/database.ts` so a repository can be swapped between a local-SQLite-backed implementation (mobile) and a Supabase-direct implementation (web) behind one interface (`src/database/repositories/`).

## Sync fields (already in every syncable table)

```
id          uuid   — client-generated (crypto.randomUUID() / expo-crypto), globally unique, never server-assigned
user_id     uuid
created_at  timestamptz
updated_at  timestamptz
deleted_at  timestamptz   — soft-deletion tombstone
version     integer       — incremented on every write, used for conflict detection
device_id   uuid          — which device made the last local write
```

Because `id` is always client-generated, a row created offline can be inserted, referenced by other offline-created rows, and later synced without ever needing a server round-trip to learn its "real" id — this is what makes the outbox pattern below work without id-remapping.

## Planned components

- **Outbox / pending-sync queue** (`src/services/sync/`): every local write also appends a mutation record. A background process drains the queue against Supabase, retrying with exponential backoff on failure.
- **Optimistic UI**: local writes apply immediately to the SQLite store (and are reflected in the UI instantly); the outbox reconciles with the server afterward.
- **Attachment upload queue**: documents/receipts captured offline queue for upload separately from row-level sync, since they're large and slower.
- **Sync status**: a visible indicator (last successful sync time, pending-item count, manual "sync now") — never silent.
- **Idempotent mutations**: because `id` is client-generated and stable, replaying a queued mutation after a retry is safe — an `insert` becomes an upsert keyed on `id`.

## Conflict handling

- Non-overlapping field changes (e.g. two devices edited different fields of the same task) merge automatically.
- Overlapping changes are detected via the `version` column: if the server's `version` has advanced past what the client last saw, the write is rejected client-side-optimistically and both versions are preserved in `sync_conflicts` (`local_payload`, `server_payload` jsonb) rather than one silently overwriting the other.
- **Financial data is never silently discarded.** Any conflict touching `financial_transactions`, `ledger_entries`, `loans`, or `loan_events` always surfaces a conflict-resolution screen — there is no "last write wins" path for money.
- Deleted-record tombstones (`deleted_at`) mean a delete on one device and an edit on another are both visible to the sync engine as explicit events, not as one record simply vanishing.

## Web

Web uses Supabase directly with TanStack Query's own caching (`staleTime`, background refetch) — no local SQLite, no outbox. The domain/repository interfaces are still shared so business logic (validation, ledger balance checks that mirror the DB trigger, formatting) isn't duplicated between platforms.
