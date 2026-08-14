import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/forms/SearchInput';
import { formatFileSize } from '@/utils/bytes';
import { formatIsoDate } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import type { DocumentType } from '@/types/database';
import { useDocuments, type DocumentRow, type PickedFile } from '@/features/documents/api';
import { useFilePicker } from '@/features/documents/use-file-picker';
import { UploadSheet } from '@/features/documents/UploadSheet';
import { DocumentViewer } from '@/features/documents/viewer/DocumentViewer';
import { FileDropZone } from '@/features/documents/viewer/FileDropZone';
import { resolveViewerKind, viewerKindIcon } from '@/features/documents/viewer/file-kinds';
import { releaseReaderSource, type ReaderSource } from '@/features/documents/viewer/reader-source';

/** Width of the library rail on desktop — wide enough for a real file name. */
const LIBRARY_WIDTH = 320;

/**
 * The Reader: open a PDF, a scan, a statement or any text file and read it in
 * the page.
 *
 * Two things make it different from the vault list it sits beside. A file can
 * be read straight off the device without being uploaded at all — dropped
 * onto the page, opened, and only saved if the user decides it's worth
 * keeping. And a stored document opens *in place* through a short-lived
 * private link, so reading a bank statement never means a copy of it landing
 * in a downloads folder.
 *
 * The layout is one component for both shapes: a library rail beside the
 * document on desktop, and a single pane on a phone that swaps between the
 * list and the document, because a 360px-wide split view is unreadable in
 * both halves.
 */
export default function ReaderScreen() {
  const theme = useTheme();
  const compact = useCompactLayout();
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();

  const { data: documents, isLoading, error, refetch } = useDocuments();
  const { pickDocument, pickPhoto } = useFilePicker();

  const [source, setSource] = useState<ReaderSource | null>(null);
  const [query, setQuery] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);
  const [fileToSave, setFileToSave] = useState<PickedFile | null>(null);

  // The open source is mirrored in a ref so the previous file's object URL can
  // be released exactly once, without doing it inside a state updater (which
  // React is free to call more than once).
  const openRef = useRef<ReaderSource | null>(null);

  const openSource = useCallback((next: ReaderSource | null) => {
    if (openRef.current && openRef.current !== next) releaseReaderSource(openRef.current);
    openRef.current = next;
    setSource(next);
    setPickError(null);
  }, []);

  useEffect(() => () => releaseReaderSource(openRef.current), []);

  // `?documentId=` is applied once per value: re-applying it whenever the
  // vault list refetches would yank the user back out of a file they opened
  // from disk in the meantime.
  const appliedDocumentId = useRef<string | null>(null);

  useEffect(() => {
    if (!documentId || !documents || appliedDocumentId.current === documentId) return;

    const match = documents.find((row) => row.id === documentId);
    if (!match) return;

    appliedDocumentId.current = documentId;
    openSource({ origin: 'vault', document: match });
  }, [documentId, documents, openSource]);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!documents) return [];
    if (!needle) return documents;

    return documents.filter(
      (document) =>
        document.title.toLowerCase().includes(needle) ||
        (document.institution?.toLowerCase().includes(needle) ?? false) ||
        document.mime_type.toLowerCase().includes(needle)
    );
  }, [documents, query]);

  function openDocument(document: DocumentRow) {
    appliedDocumentId.current = document.id;
    openSource({ origin: 'vault', document });
    // Keeps the URL shareable on web and survives a reload.
    router.setParams({ documentId: document.id });
  }

  function openLocalFile(file: PickedFile) {
    appliedDocumentId.current = null;
    openSource({ origin: 'local', file });
    router.setParams({ documentId: '' });
  }

  async function pick(kind: 'file' | 'camera' | 'library') {
    setPickError(null);
    try {
      const file =
        kind === 'file' ? await pickDocument({ anyType: true }) : await pickPhoto(kind === 'camera');
      if (file) openLocalFile(file);
    } catch (failure) {
      setPickError(toUserMessage(failure));
    }
  }

  const library = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        padding: compact ? spacing.md : spacing.lg,
        paddingBottom: spacing.xxxl * 2,
        gap: spacing.md,
      }}
    >
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title" accessibilityRole="header">
          Reader
        </ThemedText>
        <ThemedText variant="body" tone="muted">
          Open a PDF, scan or statement and read it right here — nothing is downloaded, and a file only leaves
          your device if you save it.
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button label="Open a file" size="sm" onPress={() => void pick('file')} />
        <Button label="Photo" size="sm" variant="secondary" onPress={() => void pick('library')} />
        {Platform.OS !== 'web' ? (
          <Button label="Camera" size="sm" variant="secondary" onPress={() => void pick('camera')} />
        ) : null}
      </View>

      {Platform.OS === 'web' && !compact ? (
        <ThemedText variant="caption" tone="muted">
          …or drag a file anywhere onto this page.
        </ThemedText>
      ) : null}

      {pickError ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {pickError}
        </ThemedText>
      ) : null}

      <View
        style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: spacing.xs }}
        accessibilityElementsHidden
      />

      <ThemedText variant="label" tone="muted">
        From your vault
      </ThemedText>

      <SearchInput value={query} onChangeText={setQuery} placeholder="Search documents" />

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : matching.length === 0 ? (
        <EmptyState
          icon={query ? 'search-outline' : 'reader-outline'}
          title={query ? 'Nothing matches' : 'Your vault is empty'}
          description={
            query
              ? 'Try a different search.'
              : 'Files you save from here show up in this list, ready to reopen on any device.'
          }
        />
      ) : (
        matching.map((document) => (
          <LibraryRow
            key={document.id}
            document={document}
            selected={source?.origin === 'vault' && source.document.id === document.id}
            onPress={() => openDocument(document)}
          />
        ))
      )}
    </ScrollView>
  );

  const viewer = source ? (
    <DocumentViewer
      source={source}
      onClose={compact ? () => openSource(null) : undefined}
      actions={
        source.origin === 'local' ? (
          <Button label="Save" size="sm" variant="secondary" onPress={() => setFileToSave(source.file)} />
        ) : null
      }
    />
  ) : (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        padding: spacing.xl,
        gap: spacing.sm,
      }}
    >
      <Ionicons name="reader-outline" size={40} color={theme.colors.textMuted} />
      <ThemedText variant="subtitle">Nothing open yet</ThemedText>
      <ThemedText variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 420 }}>
        {Platform.OS === 'web'
          ? 'Drag a file onto the page, or pick one from your vault, and it opens here.'
          : 'Pick a file or choose one from your vault, and it opens here.'}
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FileDropZone onFileDropped={openLocalFile}>
        {compact ? (
          source ? (
            viewer
          ) : (
            library
          )
        ) : (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View
              style={{
                width: LIBRARY_WIDTH,
                borderRightWidth: 1,
                borderRightColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              {library}
            </View>
            <View style={{ flex: 1, padding: spacing.lg }}>{viewer}</View>
          </View>
        )}
      </FileDropZone>

      <UploadSheet
        file={fileToSave}
        defaultDocumentType={fileToSave ? suggestDocumentType(fileToSave) : 'other'}
        onUploaded={(result) => openDocument(result.document)}
        onClose={() => setFileToSave(null)}
      />
    </SafeAreaView>
  );
}

/**
 * A first guess at what the file is, so the save form opens on the likely
 * answer instead of always on "statement". The user can still change it.
 */
function suggestDocumentType(file: PickedFile): DocumentType {
  switch (resolveViewerKind({ name: file.name, mimeType: file.mimeType })) {
    case 'delimited':
      return 'bank_statement';
    case 'image':
      return 'receipt';
    default:
      return 'other';
  }
}

function LibraryRow({
  document,
  selected,
  onPress,
}: {
  document: DocumentRow;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const kind = resolveViewerKind({ name: document.storage_path, mimeType: document.mime_type });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Read ${document.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected
          ? theme.colors.accentSurface
          : pressed
            ? theme.colors.surfaceAlt
            : theme.colors.surface,
      })}
    >
      <Ionicons
        name={viewerKindIcon(kind)}
        size={20}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
      />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ThemedText variant="label" numberOfLines={1} tone={selected ? 'primary' : 'default'}>
          {document.title}
        </ThemedText>
        <ThemedText variant="caption" tone="muted" numberOfLines={1}>
          {formatFileSize(document.file_size_bytes)}
          {document.institution ? ` · ${document.institution}` : ''}
          {document.document_date ? ` · ${formatIsoDate(document.document_date)}` : ''}
        </ThemedText>
      </View>
      {document.extraction_status === 'confirmed' ? <Badge label="Imported" tone="positive" /> : null}
    </Pressable>
  );
}
