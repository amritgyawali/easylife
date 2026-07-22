import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/forms/SearchInput';
import { useNotes, useUpdateNote, type NoteRow } from '@/features/notes/api';
import { NoteFormSheet } from '@/features/notes/NoteFormSheet';

export default function NotesScreen() {
  const theme = useTheme();
  const { data: notes, isLoading, error, refetch, isRefetching } = useNotes();
  const updateNote = useUpdateNote();

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<NoteRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!notes) return [];
    if (!needle) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) ||
        note.content.toLowerCase().includes(needle) ||
        (note.folder?.toLowerCase().includes(needle) ?? false)
    );
  }, [notes, query]);

  function openSheet(note: NoteRow | null) {
    setEditing(note);
    setSheetOpen(true);
  }

  return (
    <Screen
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="Notes"
            subtitle="Everything you've written down, newest first."
            action={<Button label="New note" size="sm" onPress={() => openSheet(null)} />}
          />
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search notes" />
        </>
      }
    >
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : matching.length === 0 ? (
        <EmptyState
          title={query ? 'No matching notes' : 'No notes yet'}
          description={
            query ? 'Try a different search.' : 'Capture a thought, a meeting, or a journal entry.'
          }
          actionLabel={query ? undefined : 'New note'}
          onAction={query ? undefined : () => openSheet(null)}
        />
      ) : (
        matching.map((note) => (
          <Pressable
            key={note.id}
            accessibilityRole="button"
            accessibilityLabel={`Open note ${note.title}`}
            onPress={() => openSheet(note)}
          >
            <Card style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                <ThemedText variant="subtitle" style={{ flex: 1 }} numberOfLines={1}>
                  {note.title}
                </ThemedText>
                <IconButton
                  icon={note.is_pinned ? 'bookmark' : 'bookmark-outline'}
                  tone={note.is_pinned ? 'primary' : 'muted'}
                  accessibilityLabel={note.is_pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                  onPress={() => updateNote.mutate({ id: note.id, isPinned: !note.is_pinned })}
                />
              </View>

              {note.content ? (
                <ThemedText variant="body" tone="muted" numberOfLines={3}>
                  {note.content}
                </ThemedText>
              ) : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <Badge label={note.note_type} />
                {note.folder ? <Badge label={note.folder} tone="primary" /> : null}
                {note.is_pinned ? <Badge label="Pinned" tone="primary" /> : null}
              </View>

              <ThemedText variant="caption" style={{ color: theme.colors.textMuted }}>
                Updated {new Date(note.updated_at).toLocaleString()}
              </ThemedText>
            </Card>
          </Pressable>
        ))
      )}

      <NoteFormSheet visible={sheetOpen} note={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
