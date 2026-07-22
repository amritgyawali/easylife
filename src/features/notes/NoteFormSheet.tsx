import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { FormSheet } from '@/components/ui/FormSheet';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { TextField } from '@/components/forms/TextField';
import { OptionGroup } from '@/components/forms/OptionGroup';
import { Checkbox } from '@/components/ui/Checkbox';
import { toUserMessage } from '@/utils/errors';
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
      footer={
        <>
          {note ? (
            <Button
              label="Delete"
              variant="danger"
              disabled={pending}
              onPress={async () => {
                await deleteNote.mutateAsync(note.id);
                onClose();
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Button label="Save" loading={pending} fullWidth onPress={() => void handleSave()} />
          </View>
        </>
      }
    >
      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Untitled"
        autoFocus={!note}
      />

      <TextField
        label="Note"
        value={content}
        onChangeText={setContent}
        placeholder="Write anything…"
        multiline
      />

      <OptionGroup label="Type" options={NOTE_TYPE_OPTIONS} value={noteType} onChange={setNoteType} />

      <TextField label="Folder" value={folder} onChangeText={setFolder} placeholder="Optional grouping" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Checkbox checked={isPinned} onChange={setIsPinned} accessibilityLabel="Pin this note to the top" />
        <ThemedText variant="body">Pin to top</ThemedText>
      </View>

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {toUserMessage(error)}
        </ThemedText>
      ) : null}
    </FormSheet>
  );
}
