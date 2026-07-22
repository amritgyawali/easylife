import type { Database, TaskStatus } from '@/types/database';

/**
 * Task row shapes and vocabulary, kept separate from `api.ts`.
 *
 * `api.ts` imports the Supabase client at module scope, which drags in
 * AsyncStorage and SecureStore — native modules that don't exist in a plain
 * Node test environment. Pure logic like `grouping.ts` needs these types and
 * constants but no client, so they live here and everything stays testable.
 */

export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type SubtaskRow = Database['public']['Tables']['task_subtasks']['Row'];

/** Statuses that mean "no longer on the list" — used everywhere open work is counted. */
export const CLOSED_TASK_STATUSES: TaskStatus[] = ['completed', 'cancelled'];
