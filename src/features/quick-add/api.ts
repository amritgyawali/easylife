import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { taskKeys, type TaskRow } from '@/features/tasks/api';
import { noteKeys, type NoteRow } from '@/features/notes/api';
import type { IsoDate } from '@/utils/date';
import type { NoteType, TaskPriority } from '@/types/database';
import { enqueueOutbox } from '@/services/offline/outbox-store';
import { drainOutbox } from '@/services/offline/sync-runner';

/**
 * Quick capture, built to never lose a thought — even with no connection.
 *
 * Each add does three things and returns immediately, so it feels instant and
 * works fully offline: it writes an optimistic row straight into the query
 * cache (so the item appears the moment you tap Add), queues a durable outbox
 * entry (so it survives an app restart and syncs on reconnect), then nudges the
 * runner to push it now if there's a connection. There is no `await` on the
 * network in the happy path — that's what makes it usable on a dead train.
 *
 * `id` is client-generated so the optimistic row and the row that eventually
 * lands in Supabase are the same row; the outbox upsert is keyed on it, so a
 * replay can never create a duplicate.
 */
export function useQuickAdd() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  const addTask = (input: { title: string; dueDate?: IsoDate | null; priority?: TaskPriority }): void => {
    const owner = requireUserId(userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const title = input.title.trim();
    const priority = input.priority ?? 'none';
    const dueDate = input.dueDate ?? null;

    const optimistic: TaskRow = {
      id,
      user_id: owner,
      title,
      description: null,
      status: 'inbox',
      priority,
      due_date: dueDate,
      due_time: null,
      start_date: null,
      project_id: null,
      list_name: null,
      estimated_minutes: null,
      actual_minutes: null,
      parent_task_id: null,
      waiting_for: null,
      // 'quick_add' is not one of the values the DB's `source` check
      // constraint allows ('manual' | 'quick_entry' | 'recurrence') — using
      // it here made every quick-added task fail its outbox sync forever
      // (see offline.sync_entry_failed in sync-runner.ts).
      source: 'quick_entry',
      completed_at: null,
      cancelled_at: null,
      archived_at: null,
      deleted_at: null,
      device_id: null,
      created_at: now,
      updated_at: now,
      version: 1,
    };

    queryClient.setQueryData<TaskRow[]>(taskKeys.list(owner), (old) => [optimistic, ...(old ?? [])]);

    enqueueOutbox({
      entityType: 'tasks',
      entityId: id,
      op: 'insert',
      // Only the columns a task insert sets, mirroring useCreateTask, plus the
      // client id the upsert keys on.
      payload: {
        id,
        user_id: owner,
        title,
        status: 'inbox',
        priority,
        due_date: dueDate,
        source: 'quick_entry',
      },
    });

    void drainOutbox(queryClient);
  };

  const addNote = (input: { title: string; content?: string; noteType?: NoteType }): void => {
    const owner = requireUserId(userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const title = input.title.trim() || 'Untitled';
    const content = input.content ?? '';
    const noteType: NoteType = input.noteType ?? 'plain';

    const optimistic: NoteRow = {
      id,
      user_id: owner,
      title,
      content,
      content_checklist: null,
      note_type: noteType,
      folder: null,
      is_pinned: false,
      is_favorite: false,
      is_locked: false,
      archived_at: null,
      deleted_at: null,
      device_id: null,
      created_at: now,
      updated_at: now,
      version: 1,
    };

    queryClient.setQueryData<NoteRow[]>(noteKeys.list(owner), (old) => [optimistic, ...(old ?? [])]);

    enqueueOutbox({
      entityType: 'notes',
      entityId: id,
      op: 'insert',
      payload: { id, user_id: owner, title, content, note_type: noteType },
    });

    void drainOutbox(queryClient);
  };

  return { addTask, addNote };
}
