import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import type { TaskPriority, TaskStatus } from '@/types/database';
import type { IsoDate } from '@/utils/date';
import type { TaskRow } from '@/features/tasks/types';

export { CLOSED_TASK_STATUSES } from '@/features/tasks/types';
export type { ProjectRow, SubtaskRow, TaskRow } from '@/features/tasks/types';

export const taskKeys = {
  all: (userId: string) => ['tasks', userId] as const,
  list: (userId: string) => ['tasks', userId, 'list'] as const,
  subtasks: (userId: string, taskId: string) => ['tasks', userId, 'subtasks', taskId] as const,
  projects: (userId: string) => ['tasks', userId, 'projects'] as const,
};

const TASK_COLUMNS =
  'id,title,description,status,priority,due_date,due_time,start_date,project_id,list_name,estimated_minutes,completed_at,created_at,updated_at';

async function fetchTasks(userId: string): Promise<TaskRow[]> {
  const supabase = getSupabaseClient();
  return unwrap(
    await supabase
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .is('archived_at', null)
      // Nulls last so undated tasks sink below anything actually scheduled.
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(500)
  ) as unknown as TaskRow[];
}

/**
 * Every non-archived task for the user, fetched once and filtered in memory.
 *
 * A personal task list is small (the query is capped at 500 rows), and every
 * screen that shows tasks — Today, Planner, the dashboard, search — wants a
 * different slice of the same set. One cached query beats six overlapping
 * server round-trips, and it makes completing a task update all of them at
 * once with no refetch.
 */
export function useTasks() {
  const userId = useUserId();

  return useQuery({
    queryKey: taskKeys.list(userId),
    queryFn: () => fetchTasks(userId),
    enabled: userId !== 'anonymous',
  });
}

export function useProjects() {
  const userId = useUserId();

  return useQuery({
    queryKey: taskKeys.projects(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .is('archived_at', null)
          .order('name')
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: IsoDate | null;
  dueTime?: string | null;
  projectId?: string | null;
  estimatedMinutes?: number | null;
}

export function useCreateTask() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('tasks').insert({
          user_id: owner,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status: input.status ?? 'inbox',
          priority: input.priority ?? 'none',
          due_date: input.dueDate ?? null,
          due_time: input.dueTime ?? null,
          project_id: input.projectId ?? null,
          estimated_minutes: input.estimatedMinutes ?? null,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all(userId) }),
  });
}

export function useUpdateTask() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: TaskInput & { id: string }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('tasks')
          .update({
            title: input.title.trim(),
            description: input.description?.trim() || null,
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.priority !== undefined ? { priority: input.priority } : {}),
            due_date: input.dueDate ?? null,
            due_time: input.dueTime ?? null,
            project_id: input.projectId ?? null,
            estimated_minutes: input.estimatedMinutes ?? null,
          })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all(userId) }),
  });
}

/**
 * Toggles completion, writing `completed_at` alongside `status` so the two
 * can never disagree (reports read `completed_at`, the list reads `status`).
 * Optimistic: a checkbox that waits for a round-trip feels broken.
 */
export function useToggleTaskComplete() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('tasks')
          .update({
            status: completed ? 'completed' : 'inbox',
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq('id', id)
      );
    },
    onMutate: async ({ id, completed }) => {
      const key = taskKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TaskRow[]>(key);

      queryClient.setQueryData<TaskRow[]>(key, (rows) =>
        rows?.map((row) =>
          row.id === id
            ? {
                ...row,
                status: completed ? 'completed' : 'inbox',
                completed_at: completed ? new Date().toISOString() : null,
              }
            : row
        )
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(taskKeys.list(userId), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all(userId) }),
  });
}

/** Soft delete — the row stays for the future sync engine, it just leaves every query. */
export function useDeleteTask() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all(userId) }),
  });
}
