import { useEffect, useMemo, useRef } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { HighlightedText } from '@/features/documents/viewer/HighlightedText';
import {
  BASE_MONOSPACE_SIZE,
  MONOSPACE_FONT,
  MONOSPACE_LINE_HEIGHT_RATIO,
  monospaceCharWidth,
} from '@/features/documents/viewer/typography';

export interface TextDocumentViewProps {
  lines: string[];
  query: string;
  /** Line indices containing the query, in order. */
  matches: number[];
  /** Which entry of `matches` to keep in view; -1 for none. */
  activeMatch: number;
  zoom: number;
  /** Off gives a fixed-width canvas that scrolls sideways, for logs and tables. */
  wrap: boolean;
}

/**
 * A text document, rendered line by line.
 *
 * Virtualised rather than dumped into one `Text`: a 2 MB log is ~40,000
 * lines, and laying all of them out at once locks the UI thread for seconds
 * on a phone. `FlatList` keeps that to the couple of screens actually
 * visible, which is also what makes jumping between search hits instant.
 */
export function TextDocumentView({ lines, query, matches, activeMatch, zoom, wrap }: TextDocumentViewProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList<string> | null>(null);

  const fontSize = Math.round(BASE_MONOSPACE_SIZE * zoom);
  const lineHeight = Math.round(fontSize * MONOSPACE_LINE_HEIGHT_RATIO);
  const gutterWidth = Math.max(40, `${lines.length}`.length * monospaceCharWidth(fontSize) + spacing.md);

  // Only the longest line matters for the canvas width, and only when the
  // text isn't wrapped. Capped so one runaway minified line can't create a
  // scroll area megapixels wide.
  const canvasWidth = useMemo(() => {
    if (wrap) return undefined;
    const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
    return Math.min(Math.max(longest, 40) * monospaceCharWidth(fontSize) + gutterWidth + spacing.xl, 40_000);
  }, [lines, wrap, fontSize, gutterWidth]);

  const targetLine = activeMatch >= 0 ? matches[activeMatch] : undefined;

  useEffect(() => {
    if (targetLine === undefined) return;
    listRef.current?.scrollToIndex({ index: targetLine, animated: true, viewPosition: 0.3 });
  }, [targetLine]);

  const matchedLines = useMemo(() => new Set(matches), [matches]);

  const list = (
    <FlatList
      ref={listRef}
      data={lines}
      keyExtractor={(_line, index) => `${index}`}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: spacing.sm, paddingRight: spacing.lg }}
      initialNumToRender={60}
      windowSize={11}
      removeClippedSubviews
      // Without a fixed row height an off-screen index can't be measured, so
      // a jump to a far-away match is retried once the list has scrolled
      // roughly there.
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
        }, 60);
      }}
      renderItem={({ item, index }) => {
        const isActive = index === targetLine;

        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingHorizontal: spacing.md,
              backgroundColor: isActive
                ? theme.colors.accentSurface
                : matchedLines.has(index)
                  ? theme.colors.surfaceAlt
                  : 'transparent',
            }}
          >
            <ThemedText
              selectable={false}
              style={{
                width: gutterWidth,
                fontFamily: MONOSPACE_FONT,
                fontSize: Math.max(10, fontSize - 2),
                lineHeight,
                color: theme.colors.textMuted,
                textAlign: 'right',
                paddingRight: spacing.sm,
              }}
            >
              {index + 1}
            </ThemedText>
            <View style={{ flex: wrap ? 1 : undefined }}>
              <HighlightedText
                value={item}
                query={query}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontFamily={MONOSPACE_FONT}
              />
            </View>
          </View>
        );
      }}
    />
  );

  if (wrap) return <View style={{ flex: 1 }}>{list}</View>;

  return (
    <ScrollView
      horizontal
      style={{ flex: 1 }}
      contentContainerStyle={{ width: canvasWidth }}
      showsHorizontalScrollIndicator
    >
      {list}
    </ScrollView>
  );
}
