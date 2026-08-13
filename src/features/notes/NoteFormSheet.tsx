import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { FormActions, FormRow, FormSheet } from '@/components/ui/FormSheet';
import { FormError } from '@/components/ui/InlineMessage';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';
import type { NoteType } from '@/types/database';
import { useCreateNote, useDeleteNote, useUpdateNote, type NoteRow } from '@/features/notes/api';

export interface NoteFormSheetProps {
  visible: boolean;
  onClose: () => void;
  note: NoteRow | null;
}

/**
 * The subset of `note_type` offered in the composer. The enum also carries
 * types that are created by other features rather than by hand (`financial`,
 * `document`, `contact`, `secure`), so offering them here would be misleading.
 */
const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'plain', label: 'Note' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'journal', label: 'Journal' },
  { value: 'study', label: 'Study' },
  { value: 'meeting', label: 'Meeting' },
];

export function NoteFormSheet({ visible, onClose, note }: NoteFormSheetProps) {
  const theme = useTheme();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('plain');
  const [folder, setFolder] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setNoteType(note?.note_type ?? 'plain');
    setFolder(note?.folder ?? '');
    setIsPinned(note?.is_pinned ?? false);
  }, [visible, note]);

  const pending = createNote.isPending || updateNote.isPending || deleteNote.isPending;
  const error = createNote.error ?? updateNote.error ?? deleteNote.error;

  async function handleSave() {
    const input = { title, content, noteType, folder, isPinned };

    if (note) await updateNote.mutateAsync({ id: note.id, ...input });
    else await createNote.mutateAsync(input);

    onClose();
  }

  return (
    <FormSheet
      visible={visible}
      title={note ? 'Edit note' : 'New note'}
      onClose={onClose}
      size="lg"
      footer={
        <FormActions
          pending={pending}
          onSave={() => void handleSave()}
          saveLabel={note ? 'Save changes' : 'Add note'}
          onDelete={
            note
              ? async () => {
                  await deleteNote.mutateAsync(note.id);
                  onClose();
                }
              : undefined
          }
        />
      }
    >
      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Untitled"
        autoFocus={!note}
        size="lg"
      />

      <TextField
        label="Note"
        value={content}
        onChangeText={setContent}
        placeholder="Write anything…"
        multiline
      />

      <OptionGroup label="Type" options={NOTE_TYPE_OPTIONS} value={noteType} onChange={setNoteType} />

      <FormRow>
        <TextField
          label="Folder"
          value={folder}
          onChangeText={setFolder}
          placeholder="Optional grouping"
          helpText="Notes with the same folder are grouped together."
        />
        <View style={{ gap: spacing.xs, justifyContent: 'flex-end' }}>
          <ThemedText variant="label" weight="medium">
            Pinned
          </ThemedText>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isPinned }}
            accessibilityLabel="Pin this note to the top"
            onPress={() => setIsPinned((value) => !value)}
            style={(state) => {
              const { hovered, focused } = pressState(state);
              return [
                {
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  gap: spacing.sm,
                  minHeight: minTouchTarget,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: isPinned ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isPinned
                    ? theme.colors.accentSurface
                    : hovered
                      ? theme.colors.surfaceHover
                      : theme.colors.surface,
                },
                transition(),
                clickable(),
                focusRing(theme.colors.focus, focused),
              ];
            }}
          >
            <Ionicons
              name={isPinned ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isPinned ? theme.colors.primary : theme.colors.textMuted}
            />
            <ThemedText variant="label" tone={isPinned ? 'primary' : 'default'}>
              {isPinned ? 'Pinned to top' : 'Pin to top'}
            </ThemedText>
          </Pressable>
        </View>
      </FormRow>

      <FormError error={error} />
    </FormSheet>
  );
}
