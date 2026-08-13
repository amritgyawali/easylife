import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { Grid } from '@/components/layout/Grid';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
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

/**
 * Notes, as a card wall rather than a list: a note's value is in its first few
 * lines, so each card shows a preview. On a wide screen the cards tile into
 * columns, which is what makes a wall of notes scannable instead of a mile of
 * scrolling.
 */
export default function NotesScreen() {
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

  const pinned = matching.filter((note) => note.is_pinned);
  const rest = matching.filter((note) => !note.is_pinned);

  function openSheet(note: NoteRow | null) {
    setEditing(note);
    setSheetOpen(true);
  }

  const renderNote = (note: NoteRow) => (
    <NoteCard
      key={note.id}
      note={note}
      onOpen={() => openSheet(note)}
      onTogglePin={() => updateNote.mutate({ id: note.id, isPinned: !note.is_pinned })}
    />
  );

  return (
    <Screen
      width="wide"
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      header={
        <>
          <ScreenHeader
            title="Notes"
            subtitle="Everything you've written down, newest first."
            action={<Button label="New note" size="sm" icon="add" onPress={() => openSheet(null)} />}
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
          icon="document-text-outline"
          title={query ? 'No matching notes' : 'No notes yet'}
          description={
            query ? 'Try a different search.' : 'Capture a thought, a meeting, or a journal entry.'
          }
          actionLabel={query ? undefined : 'New note'}
          onAction={query ? undefined : () => openSheet(null)}
        />
      ) : (
        <>
          {pinned.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Pinned" count={pinned.length} />
              <Grid minColumnWidth={300}>{pinned.map(renderNote)}</Grid>
            </View>
          ) : null}

          {rest.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {pinned.length > 0 ? <SectionHeader title="All notes" count={rest.length} /> : null}
              <Grid minColumnWidth={300}>{rest.map(renderNote)}</Grid>
            </View>
          ) : null}
        </>
      )}

      <NoteFormSheet visible={sheetOpen} note={editing} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

function NoteCard({
  note,
  onOpen,
  onTogglePin,
}: {
  note: NoteRow;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <Card
      onPress={onOpen}
      accessibilityLabel={`Open note ${note.title}`}
      style={{ gap: spacing.sm, height: '100%' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <ThemedText variant="subtitle" style={{ flex: 1 }} numberOfLines={2}>
          {note.title || 'Untitled'}
        </ThemedText>
        {/* Claims the responder so pinning doesn't also open the note. */}
        <View onStartShouldSetResponder={() => true} style={{ marginTop: -spacing.xs, marginRight: -spacing.sm }}>
          <IconButton
            icon={note.is_pinned ? 'bookmark' : 'bookmark-outline'}
            tone={note.is_pinned ? 'primary' : 'muted'}
            accessibilityLabel={note.is_pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
            onPress={onTogglePin}
          />
        </View>
      </View>

      {note.content ? (
        <ThemedText variant="label" tone="muted" numberOfLines={4}>
          {note.content}
        </ThemedText>
      ) : null}

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge label={note.note_type} />
        {note.folder ? <Badge label={note.folder} tone="primary" icon="folder-outline" /> : null}
      </View>

      <ThemedText variant="caption" tone="subtle">
        Updated {new Date(note.updated_at).toLocaleDateString()}
      </ThemedText>
    </Card>
  );
}
