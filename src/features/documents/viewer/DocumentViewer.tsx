import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
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
import { formatFileSize } from '@/utils/bytes';
import { signedUrlFor } from '@/features/documents/api';
import { fileFormatIcon, fileFormatLabel } from '@/features/documents/viewer/file-kinds';
import { describeReaderSource, type ReaderSource } from '@/features/documents/viewer/reader-source';
import { READER_URL_TTL_SECONDS, useReaderContent } from '@/features/documents/viewer/use-reader-content';
import { findMatchingLines } from '@/features/documents/viewer/text-preview';
import {
  gridSearchTargets,
  parseDocumentBytes,
  richSearchTargets,
  type ParsedDocument,
} from '@/features/documents/viewer/parse-document';
import { parseErrorDetail } from '@/features/documents/viewer/parse-error';
import { clampZoom, ZOOM_STEP } from '@/features/documents/viewer/typography';
import { useFullscreen } from '@/features/documents/viewer/use-fullscreen';
import { InlineFrame } from '@/features/documents/viewer/InlineFrame';
import { ImageDocumentView } from '@/features/documents/viewer/ImageDocumentView';
import { MediaDocumentView } from '@/features/documents/viewer/MediaDocumentView';
import { GridDocumentView } from '@/features/documents/viewer/GridDocumentView';
import { RichDocumentView } from '@/features/documents/viewer/RichDocumentView';
import { TextDocumentView } from '@/features/documents/viewer/TextDocumentView';
import { ViewerFallbackCard } from '@/features/documents/viewer/ViewerFallbackCard';

export interface DocumentViewerProps {
  source: ReaderSource;
  /** Back/close affordance; shown as an arrow on narrow layouts. */
  onClose?: () => void;
  /** Screen-level actions for this document, e.g. "Save to vault". */
  actions?: ReactNode;
}

/** Parsing either produced something to read, or an explanation of why not. */
type ParseResult = { ok: true; value: ParsedDocument } | { ok: false; error: unknown };

/**
 * Reads a document in place — no download, no external app.
 *
 * Everything below the toolbar is one of four views (formatted document, grid,
 * text, or the platform's own renderer for PDFs, images and media), chosen by
 * what `parseDocumentBytes` produced. That is what lets a Word file, a
 * spreadsheet, an EPUB and a CSV share one set of controls: zoom, find,
 * rotate, full screen and hand-off mean the same thing whatever is open, and
 * supporting a new format is a parser plus a line in the dispatcher.
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
  const [asPlainText, setAsPlainText] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(-1);
  const [openError, setOpenError] = useState<string | null>(null);

  // A new document starts fresh: carrying the previous file's zoom, rotation,
  // sheet or search over to the next one is never what was meant.
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setAsPlainText(false);
    setSheetIndex(0);
    setSearching(false);
    setQuery('');
    setActiveMatch(-1);
    setOpenError(null);
  }, [meta.key]);

  /**
   * Parsing runs in a memo rather than an effect so the first paint after the
   * bytes arrive already has the document — a spinner that flashes for one
   * frame is worse than none. Formats that need real work (a Word file, a
   * workbook) are the reason it is memoised on the bytes.
   */
  const parsed = useMemo<ParseResult | null>(() => {
    if (!content?.bytes) return null;

    try {
      return {
        ok: true,
        value: parseDocumentBytes({
          bytes: content.bytes,
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          format: meta.format,
        }),
      };
    } catch (failure) {
      return { ok: false, error: failure };
    }
  }, [content?.bytes, meta.fileName, meta.mimeType, meta.format]);

  const document = parsed?.ok ? parsed.value : null;

  const grids = document?.presentation === 'grids' ? document.grids : null;
  const activeGrid =
    document?.presentation === 'delimited' && !asPlainText
      ? document.grid
      : (grids?.[Math.min(sheetIndex, grids.length - 1)] ?? null);

  const textLines =
    document?.presentation === 'text'
      ? document.preview.lines
      : document?.presentation === 'delimited' && asPlainText
        ? document.preview.lines
        : null;

  const searchTargets = useMemo(() => {
    if (document?.presentation === 'rich') return richSearchTargets(document.document);
    if (activeGrid) return gridSearchTargets(activeGrid);
    return textLines;
  }, [document, activeGrid, textLines]);

  const matches = useMemo(
    () => (query.trim() && searchTargets ? findMatchingLines(searchTargets, query) : []),
    [query, searchTargets]
  );

  useEffect(() => {
    setActiveMatch(matches.length > 0 ? 0 : -1);
  }, [matches]);

  // Changing sheet or view mode invalidates the row indices a match refers to.
  useEffect(() => {
    setActiveMatch(-1);
  }, [sheetIndex, asPlainText]);

  const searchable = Boolean(searchTargets);
  const zoomable = meta.kind !== 'pdf' && meta.kind !== 'media' && Boolean(document ?? content?.displayUrl);
  const truncated = document?.presentation === 'text' || document?.presentation === 'delimited';

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

          <Ionicons name={fileFormatIcon(meta.format)} size={20} color={theme.colors.textMuted} />

          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ThemedText variant="subtitle" numberOfLines={1}>
              {meta.title}
            </ThemedText>
            <ThemedText variant="caption" tone="muted" numberOfLines={1}>
              {document?.presentation === 'rich' ? `${document.document.summary} · ` : ''}
              {meta.subtitle}
            </ThemedText>
          </View>

          {!compact ? <Badge label={fileFormatLabel(meta.format)} /> : null}
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

          {document?.presentation === 'delimited' ? (
            <IconButton
              icon={asPlainText ? 'grid-outline' : 'text-outline'}
              accessibilityLabel={asPlainText ? 'Show as a table' : 'Show as plain text'}
              onPress={() => setAsPlainText((current) => !current)}
            />
          ) : null}

          {textLines ? (
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

        {grids && grids.length > 1 ? (
          <SheetTabs
            names={grids.map((grid) => grid.name)}
            selected={Math.min(sheetIndex, grids.length - 1)}
            onSelect={setSheetIndex}
          />
        ) : null}

        {searching && searchable ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <SearchInput
                value={query}
                onChangeText={setQuery}
                autoFocus
                placeholder={activeGrid ? 'Find in rows' : 'Find in document'}
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

        {truncated && document.preview.truncated ? (
          <ThemedText variant="caption" tone="warning">
            Showing the first {formatFileSize(content?.bytes?.length ?? 0)} of this file —{' '}
            {formatFileSize(document.preview.omittedBytes)} more isn&apos;t displayed.
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
          <ErrorState error={error} onRetry={reload} description={parseErrorDetail(error) ?? undefined} />
        ) : parsed && !parsed.ok ? (
          <ViewerFallbackCard
            title="This file couldn't be read here"
            description={parseErrorDetail(parsed.error) ?? toUserMessage(parsed.error)}
            onOpenExternally={() => void openExternally()}
          />
        ) : activeGrid ? (
          <GridDocumentView
            grid={activeGrid}
            query={query}
            matches={matches}
            activeMatch={activeMatch}
            zoom={zoom}
          />
        ) : document?.presentation === 'rich' ? (
          <RichDocumentView
            document={document.document}
            query={query}
            matches={matches}
            activeMatch={activeMatch}
            zoom={zoom}
          />
        ) : textLines ? (
          <TextDocumentView
            lines={textLines}
            query={query}
            matches={matches}
            activeMatch={activeMatch}
            zoom={zoom}
            wrap={wrap}
          />
        ) : (
          <PlatformRenderedBody
            kind={meta.kind}
            format={meta.format}
            title={meta.title}
            displayUrl={content?.displayUrl ?? null}
            zoom={zoom}
            rotation={rotation}
            onOpenExternally={() => void openExternally()}
          />
        )}
      </View>
    </View>
  );
}

/** Worksheet switcher for a workbook with more than one sheet. */
function SheetTabs({
  names,
  selected,
  onSelect,
}: {
  names: string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
      {names.map((name, index) => {
        const active = index === selected;

        return (
          <Pressable
            key={`${name}-${index}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Sheet ${name}`}
            onPress={() => onSelect(index)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.full,
              backgroundColor: active ? theme.colors.accentSurface : theme.colors.surfaceAlt,
            }}
          >
            <ThemedText
              variant="caption"
              tone={active ? 'primary' : 'muted'}
              weight={active ? 'semibold' : 'regular'}
            >
              {name}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface PlatformRenderedBodyProps {
  kind: ReturnType<typeof describeReaderSource>['kind'];
  format: ReturnType<typeof describeReaderSource>['format'];
  title: string;
  displayUrl: string | null;
  zoom: number;
  rotation: number;
  onOpenExternally: () => void;
}

/** The kinds the platform renders itself: PDFs, images, audio and video. */
function PlatformRenderedBody({
  kind,
  format,
  title,
  displayUrl,
  zoom,
  rotation,
  onOpenExternally,
}: PlatformRenderedBodyProps) {
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

  if (kind === 'media') {
    return (
      <MediaDocumentView
        url={displayUrl}
        title={title}
        media={format === 'audio' ? 'audio' : 'video'}
        fallback={
          <ViewerFallbackCard
            title="Playback happens outside the app here"
            description="This build carries no media player of its own — your device's player opens it from the same private link."
            onOpenExternally={onOpenExternally}
          />
        }
      />
    );
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
