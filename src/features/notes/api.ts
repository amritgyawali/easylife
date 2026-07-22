import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseClient } from '@/services/supabase/client';
import { useUserId, requireUserId } from '@/features/shared/use-current-user';
import { unwrap, unwrapVoid } from '@/features/shared/unwrap';
import type { Database, NoteType } from '@/types/database';

export type NoteRow = Database['public']['Tables']['notes']['Row'];

export const noteKeys = {
  all: (userId: string) => ['notes', userId] as const,
  list: (userId: string) => ['notes', userId, 'list'] as const,
};

export function useNotes() {
  const userId = useUserId();

  return useQuery({
    queryKey: noteKeys.list(userId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      return unwrap(
        await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .is('archived_at', null)
          // Pinned first, then most recently touched — the two things that
          // actually predict what someone is looking for.
          .order('is_pinned', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(300)
      );
    },
    enabled: userId !== 'anonymous',
  });
}

export interface NoteInput {
  title: string;
  content: string;
  noteType: NoteType;
  folder?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export function useCreateNote() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NoteInput) => {
      const owner = requireUserId(userId);
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase.from('notes').insert({
          user_id: owner,
          title: input.title.trim() || 'Untitled',
          content: input.content,
          note_type: input.noteType,
          folder: input.folder?.trim() || null,
          is_pinned: input.isPinned ?? false,
          is_favorite: input.isFavorite ?? false,
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}

export function useUpdateNote() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<NoteInput> & { id: string }) => {
      const supabase = getSupabaseClient();

      unwrapVoid(
        await supabase
          .from('notes')
          .update({
            ...(input.title !== undefined ? { title: input.title.trim() || 'Untitled' } : {}),
            ...(input.content !== undefined ? { content: input.content } : {}),
            ...(input.noteType !== undefined ? { note_type: input.noteType } : {}),
            ...(input.folder !== undefined ? { folder: input.folder?.trim() || null } : {}),
            ...(input.isPinned !== undefined ? { is_pinned: input.isPinned } : {}),
            ...(input.isFavorite !== undefined ? { is_favorite: input.isFavorite } : {}),
          })
          .eq('id', id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}

export function useDeleteNote() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      unwrapVoid(await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all(userId) }),
  });
}
