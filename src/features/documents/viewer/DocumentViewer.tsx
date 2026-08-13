import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchInput } from '@/components/forms/SearchInput';
import { toUserMessage } from '@/utils/errors';
import { parseDelimited } from '@/features/imports/delimited';
import { signedUrlFor } from '@/features/documents/api';
import { viewerKindIcon, viewerKindLabel } from '@/features/documents/viewer/file-kinds';
import { describeReaderSource, type ReaderSource } from '@/features/documents/viewer/reader-source';
import { READER_URL_TTL_SECONDS, useReaderContent } from '@/features/documents/viewer/use-reader-content';
import {
  decodeTextPreview,
  findMatchingLines,
  findMatchingRows,
} from '@/features/documents/viewer/text-preview';
import { clampZoom, ZOOM_STEP } from '@/features/documents/viewer/typography';
import { useFullscreen } from '@/features/documents/viewer/use-fullscreen';
import { InlineFrame } from '@/features/documents/viewer/InlineFrame';
import { ImageDocumentView } from '@/features/documents/viewer/ImageDocumentView';
import { TableDocumentView } from '@/features/documents/viewer/TableDocumentView';
import { TextDocumentView } from '@/features/documents/viewer/TextDocumentView';
import { ViewerFallbackCard } from '@/features/documents/viewer/ViewerFallbackCard';
import { formatFileSize } from '@/utils/bytes';

export interface DocumentViewerProps {
  source: ReaderSource;
  /** Back/close affordance; shown as an arrow on narrow layouts. */
  onClose?: () => void;
  /** Screen-level actions for this document, e.g. "Save to vault". */
  actions?: ReactNode;
}

type DelimitedView = 'table' | 'text';

/**
 * Reads a document in place — no download, no external app.
 *
 * The viewer is one component per format (`ImageDocumentView`,
 * `TableDocumentView`, `TextDocumentView`, and the browser's own frame for
 * PDFs) behind a single toolbar, so zoom, search and rotation mean the same
 * thing whatever is open, and a new format is a new view rather than another
 * branch in here.
 */
export function DocumentViewer({ source, onClose, actions }: DocumentViewerProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const fullscreen = useFullscreen();

  const containerRef = useRef<View | null>(null);
  const meta = useMemo(() => describeReaderSource(source), [source]);
  const { content, isLoading, error, reload } = useReaderContent(source);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [wrap, setWrap] = useState(compact);
  const [delimitedView, setDelimitedView] = useState<DelimitedView>('table');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(-1);
  const [openError, setOpenError] = useState<string | null>(null);

  // A new document starts fresh: carrying the previous file's zoom, rotation
  // or search over to the next one is never what was meant.
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setDelimitedView('table');
    setSearching(false);
    setQuery('');
    setActiveMatch(-1);
    setOpenError(null);
  }, [meta.key]);

  const preview = useMemo(() => (content?.bytes ? decodeTextPreview(content.bytes) : null), [content?.bytes]);

  const table = useMemo(
    () => (preview && meta.kind === 'delimited' ? parseDelimited(preview.text) : null),
    [preview, meta.kind]
  );

  const showingTable = meta.kind === 'delimited' && delimitedView === 'table' && table !== null;

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    if (showingTable && table) return findMatchingRows(table.rows, query);
    if (preview) return findMatchingLines(preview.lines, query);
    return [];
  }, [query, showingTable, table, preview]);

  useEffect(() => {
    setActiveMatch(matches.length > 0 ? 0 : -1);
  }, [matches]);

  const searchable = preview !== null && !preview.binary;
  const zoomable = meta.kind !== 'pdf' && meta.kind !== 'unsupported';

  const openExternally = useCallback(async () => {
    setOpenError(null);
    try {
      const url =
        content?.displayUrl ??
        (source.origin === 'vault'
          ? await signedUrlFor(source.document, READER_URL_TTL_SECONDS)
          : source.file.uri);

      await Linking.openURL(url);
    } catch (failure) {
      setOpenError(toUserMessage(failure));
    }
  }, [content?.displayUrl, source]);

  const stepMatch = (delta: number) => {
    if (matches.length === 0) return;
    setActiveMatch((current) => (current + delta + matches.length) % matches.length);
  };

  return (
    <View
      ref={containerRef}
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: compact ? 0 : radius.lg,
        borderWidth: compact ? 0 : 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          gap: spacing.sm,
          padding: compact ? spacing.sm : spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {onClose ? (
            <IconButton icon="arrow-back" accessibilityLabel="Close document" onPress={onClose} />
          ) : null}

          <Ionicons name={viewerKindIcon(meta.kind)} size={20} color={theme.colors.textMuted} />

          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ThemedText variant="subtitle" numberOfLines={1}>
              {meta.title}
            </ThemedText>
            <ThemedText variant="caption" tone="muted" numberOfLines={1}>
              {meta.subtitle}
            </ThemedText>
          </View>

          {!compact ? <Badge label={viewerKindLabel(meta.kind)} /> : null}
          {actions}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xxs }}>
          {searchable ? (
            <IconButton
              icon={searching ? 'close-outline' : 'search-outline'}
              accessibilityLabel={searching ? 'Hide search' : 'Search in document'}
              tone={searching ? 'primary' : 'muted'}
              onPress={() => {
                setSearching((open) => !open);
                if (searching) setQuery('');
              }}
            />
          ) : null}

          {meta.kind === 'delimited' && table ? (
            <IconButton
              icon={delimitedView === 'table' ? 'text-outline' : 'grid-outline'}
              accessibilityLabel={delimitedView === 'table' ? 'Show as plain text' : 'Show as a table'}
              onPress={() => setDelimitedView((mode) => (mode === 'table' ? 'text' : 'table'))}
            />
          ) : null}

          {preview && !showingTable ? (
            <IconButton
              icon={wrap ? 'return-down-forward-outline' : 'remove-outline'}
              accessibilityLabel={wrap ? 'Stop wrapping long lines' : 'Wrap long lines'}
              tone={wrap ? 'primary' : 'muted'}
              onPress={() => setWrap((current) => !current)}
            />
          ) : null}

          {meta.kind === 'image' ? (
            <IconButton
              icon="refresh-outline"
              accessibilityLabel="Rotate 90 degrees"
              onPress={() => setRotation((current) => (current + 90) % 360)}
            />
          ) : null}

          {zoomable ? (
            <>
              <IconButton
                icon="remove-circle-outline"
                accessibilityLabel="Zoom out"
                onPress={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
              />
              <ThemedText
                variant="caption"
                tone="muted"
                accessibilityLabel={`Zoom ${Math.round(zoom * 100)} percent`}
                style={{ minWidth: 44, textAlign: 'center' }}
              >
                {Math.round(zoom * 100)}%
              </ThemedText>
              <IconButton
                icon="add-circle-outline"
                accessibilityLabel="Zoom in"
                onPress={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
              />
            </>
          ) : null}

          <View style={{ flex: 1 }} />

          {fullscreen.available ? (
            <IconButton
              icon={fullscreen.isFullscreen ? 'contract-outline' : 'expand-outline'}
              accessibilityLabel={fullscreen.isFullscreen ? 'Exit full screen' : 'Read full screen'}
              onPress={() => fullscreen.toggle(containerRef.current)}
            />
          ) : null}

          <IconButton
            icon="open-outline"
            accessibilityLabel="Open outside the app"
            onPress={() => void openExternally()}
          />
        </View>

        {searching && searchable ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <SearchInput
                value={query}
                onChangeText={setQuery}
                autoFocus
                placeholder={showingTable ? 'Find in rows' : 'Find in text'}
                accessibilityLabel="Find in document"
              />
            </View>
            <ThemedText variant="caption" tone="muted" accessibilityLiveRegion="polite">
              {query.trim() ? `${matches.length === 0 ? 0 : activeMatch + 1}/${matches.length}` : ''}
            </ThemedText>
            <IconButton
              icon="chevron-up-outline"
              accessibilityLabel="Previous match"
              disabled={matches.length === 0}
              onPress={() => stepMatch(-1)}
            />
            <IconButton
              icon="chevron-down-outline"
              accessibilityLabel="Next match"
              disabled={matches.length === 0}
              onPress={() => stepMatch(1)}
            />
          </View>
        ) : null}

        {openError ? (
          <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
            {openError}
          </ThemedText>
        ) : null}

        {preview?.truncated ? (
          <ThemedText variant="caption" tone="warning">
            Showing the first {formatFileSize(content?.bytes?.length ?? 0)} of this file —{' '}
            {formatFileSize(preview.omittedBytes)} more isn&apos;t displayed.
          </ThemedText>
        ) : null}
      </View>

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
            <ActivityIndicator color={theme.colors.primary} />
            <ThemedText variant="caption" tone="muted">
              Opening {meta.fileName}…
            </ThemedText>
          </View>
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <DocumentBody
            kind={meta.kind}
            title={meta.title}
            displayUrl={content?.displayUrl ?? null}
            preview={preview}
            table={showingTable ? table : null}
            query={query}
            matches={matches}
            activeMatch={activeMatch}
            zoom={zoom}
            rotation={rotation}
            wrap={wrap}
            onOpenExternally={() => void openExternally()}
          />
        )}
      </View>
    </View>
  );
}

interface DocumentBodyProps {
  kind: ReturnType<typeof describeReaderSource>['kind'];
  title: string;
  displayUrl: string | null;
  preview: ReturnType<typeof decodeTextPreview> | null;
  table: ReturnType<typeof parseDelimited> | null;
  query: string;
  matches: number[];
  activeMatch: number;
  zoom: number;
  rotation: number;
  wrap: boolean;
  onOpenExternally: () => void;
}

function DocumentBody({
  kind,
  title,
  displayUrl,
  preview,
  table,
  query,
  matches,
  activeMatch,
  zoom,
  rotation,
  wrap,
  onOpenExternally,
}: DocumentBodyProps) {
  if (preview?.binary) {
    return (
      <ViewerFallbackCard
        title="This file isn't text"
        description="It was labelled as text but contains binary data, so showing it here would only produce noise."
        onOpenExternally={onOpenExternally}
      />
    );
  }

  if (table) {
    return (
      <TableDocumentView
        table={table}
        query={query}
        matches={matches}
        activeMatch={activeMatch}
        zoom={zoom}
      />
    );
  }

  if (preview) {
    return (
      <TextDocumentView
        lines={preview.lines}
        query={query}
        matches={matches}
        activeMatch={activeMatch}
        zoom={zoom}
        wrap={wrap}
      />
    );
  }

  if (!displayUrl) {
    return (
      <ViewerFallbackCard
        title="Nothing to show"
        description="This document could not be opened for reading."
        onOpenExternally={onOpenExternally}
      />
    );
  }

  if (kind === 'image') {
    return <ImageDocumentView url={displayUrl} title={title} zoom={zoom} rotation={rotation} />;
  }

  if (kind === 'pdf') {
    return (
      <InlineFrame
        url={displayUrl}
        title={title}
        fallback={
          <ViewerFallbackCard
            title="This browser won't page through a PDF in place"
            description={
              Platform.OS === 'web'
                ? 'Safari on iPhone and iPad only ever shows the first page of an embedded PDF. Opening it as a full page uses the same private link and still costs no download.'
                : 'Reading a PDF inside the app needs a native viewer, which this build deliberately does without so it keeps running in Expo Go. Your device’s own viewer opens it from the same private link.'
            }
            onOpenExternally={onOpenExternally}
          />
        }
      />
    );
  }

  return (
    <ViewerFallbackCard
      title="No preview for this file type"
      description="It is stored safely and can be opened with an app that understands it."
      onOpenExternally={onOpenExternally}
    />
  );
}
