import { useMutation } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap } from '@/features/shared/unwrap';
import { BACKUP_TABLES, buildBackup, type BackupBundle, type BackupTable } from '@/features/export/backup';

/**
 * Pulls the user's own rows, table by table, into an in-memory backup bundle.
 *
 * This runs against Supabase directly (the web/live path); RLS already scopes
 * every table to the signed-in user, and the explicit `user_id` filter is a
 * second belt-and-braces guard so a bug can never widen the export. `profiles`
 * is the one table keyed on `id` rather than `user_id`. Selects are issued in
 * parallel — a backup is read-only, so ordering between tables doesn't matter,
 * and the dependency ordering only matters on the way back in (a restore).
 */
async function fetchTable(userId: string, table: BackupTable): Promise<unknown[]> {
  const supabase = getSupabaseClient();
  const column = table === 'profiles' ? 'id' : 'user_id';
  // The table name is only known at runtime, so the generated per-table column
  // types can't apply here; the filter is a plain (column, value) pair that
  // PostgREST validates server-side. `unwrap` still gives the usual error path.
  const builder = supabase.from(table).select('*') as unknown as {
    eq: (column: string, value: string) => Promise<Parameters<typeof unwrap<unknown[]>>[0]>;
  };
  return unwrap(await builder.eq(column, userId));
}

export function useCreateBackup() {
  const userId = useUserId();

  return useMutation({
    mutationFn: async (): Promise<BackupBundle> => {
      const owner = requireUserId(userId);

      const results = await Promise.all(BACKUP_TABLES.map((table) => fetchTable(owner, table)));

      const tables = Object.fromEntries(
        BACKUP_TABLES.map((table, index) => [table, results[index] ?? []])
      ) as Record<BackupTable, unknown[]>;

      return buildBackup({ userId: owner, exportedAt: new Date().toISOString(), tables });
    },
  });
}

/** Fetches just the confirmed transactions for a spreadsheet (CSV) export. */
export function useTransactionExportData() {
  const userId = useUserId();

  return useMutation({
    mutationFn: async () => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      return unwrap(
        await supabase
          .from('financial_transactions')
          .select('*')
          .eq('user_id', owner)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
      );
    },
  });
}
