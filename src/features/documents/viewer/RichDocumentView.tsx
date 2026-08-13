import { useEffect, useMemo, useRef } from 'react';
import { FlatList, Linking, ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { fontSize as fontSizes, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { splitHighlights } from '@/features/documents/viewer/text-preview';
import { MONOSPACE_FONT } from '@/features/documents/viewer/typography';
import type { RichBlock, RichDocument, RichSpan } from '@/features/documents/viewer/rich/rich-document';

export interface RichDocumentViewProps {
  document: RichDocument;
  query: string;
  /** Block indices containing the query, in order. */
  matches: number[];
  activeMatch: number;
  zoom: number;
}

/** Indent per list level, in points. */
const LIST_INDENT = 20;

const HEADING_SCALE: Record<1 | 2 | 3 | 4, number> = { 1: 1.7, 2: 1.4, 3: 1.2, 4: 1.05 };

/**
 * A formatted document — Word, slides, OpenDocument, EPUB, HTML or Markdown —
 * rendered from the shared block model.
 *
 * Reading, not reproducing: the goal is that the words arrive in the right
 * order with their structure intact and the measure stays comfortable on a
 * phone, not that the page looks like the printout. Blocks are virtualised, so
 * a 400-page book scrolls as smoothly as a memo.
 */
export function RichDocumentView({ document, query, matches, activeMatch, zoom }: RichDocumentViewProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const listRef = useRef<FlatList<RichBlock> | null>(null);

  const baseSize = Math.round((compact ? fontSizes.md - 1 : fontSizes.md) * zoom);
  const targetBlock = activeMatch >= 0 ? matches[activeMatch] : undefined;

  useEffect(() => {
    if (targetBlock === undefined) return;
    listRef.current?.scrollToIndex({ index: targetBlock, animated: true, viewPosition: 0.25 });
  }, [targetBlock]);

  const matchedBlocks = useMemo(() => new Set(matches), [matches]);

  return (
    <FlatList
      ref={listRef}
      data={document.blocks}
      keyExtractor={(_block, index) => `${index}`}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: compact ? spacing.md : spacing.xl,
        paddingVertical: spacing.lg,
        // A readable measure: prose past ~70 characters a line is markedly
        // harder to track back from the end of one line to the start of the next.
        maxWidth: 820,
        width: '100%',
        alignSelf: 'center',
      }}
      initialNumToRender={30}
      windowSize={11}
      removeClippedSubviews
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 60);
      }}
      renderItem={({ item, index }) => (
        <View
          style={{
            backgroundColor:
              index === targetBlock
                ? theme.colors.accentSurface
                : matchedBlocks.has(index)
                  ? theme.colors.warningSurface
                  : 'transparent',
            borderRadius: radius.sm,
          }}
        >
          <Block block={item} query={query} baseSize={baseSize} />
        </View>
      )}
      ListFooterComponent={
        document.truncated ? (
          <ThemedText variant="caption" tone="warning" style={{ paddingVertical: spacing.lg }}>
            This document is longer than the reader shows in one go — the rest isn&apos;t displayed.
          </ThemedText>
        ) : (
          <View style={{ height: spacing.xxl }} />
        )
      }
    />
  );
}

function Block({ block, query, baseSize }: { block: RichBlock; query: string; baseSize: number }) {
  const theme = useTheme();

  switch (block.kind) {
    case 'heading':
      return (
        <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
          <Spans
            spans={block.spans}
            query={query}
            size={Math.round(baseSize * HEADING_SCALE[block.level])}
            weight="700"
            accessibilityRole="header"
          />
        </View>
      );

    case 'paragraph':
      return (
        <View style={{ paddingVertical: spacing.xs }}>
          <Spans spans={block.spans} query={query} size={baseSize} />
        </View>
      );

    case 'listItem':
      return (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            paddingVertical: spacing.xxs,
            paddingLeft: block.level * LIST_INDENT,
          }}
        >
          <ThemedText
            tone="muted"
            style={{ fontSize: baseSize, lineHeight: Math.round(baseSize * 1.5), minWidth: 18 }}
          >
            {block.marker}
          </ThemedText>
          <View style={{ flex: 1 }}>
            <Spans spans={block.spans} query={query} size={baseSize} />
          </View>
        </View>
      );

    case 'quote':
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.colors.border,
            paddingLeft: spacing.md,
            paddingVertical: spacing.xs,
            marginVertical: spacing.xs,
          }}
        >
          <Spans spans={block.spans} query={query} size={baseSize} italic />
        </View>
      );

    case 'code':
      return (
        <ScrollView
          horizontal
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: radius.md,
            marginVertical: spacing.sm,
          }}
          contentContainerStyle={{ padding: spacing.md }}
        >
          <Text
            selectable
            style={{
              fontFamily: MONOSPACE_FONT,
              fontSize: baseSize - 1,
              lineHeight: Math.round((baseSize - 1) * 1.45),
              color: theme.colors.text,
            }}
          >
            {block.text}
          </Text>
        </ScrollView>
      );

    case 'table':
      return <BlockTable block={block} query={query} size={baseSize} />;

    case 'divider':
      return (
        <View
          style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: spacing.lg }}
          accessibilityElementsHidden
        />
      );

    case 'section':
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.xl,
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
          <ThemedText variant="caption" tone="muted" weight="semibold">
            {block.label.toUpperCase()}
          </ThemedText>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        </View>
      );

    case 'placeholder':
      return (
        <View
          style={{
            padding: spacing.md,
            marginVertical: spacing.xs,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
          }}
        >
          <ThemedText variant="caption" tone="muted">
            {block.label}
          </ThemedText>
        </View>
      );
  }
}

/** A compact table inside a document — for big data, the grid view is the place. */
function BlockTable({
  block,
  query,
  size,
}: {
  block: Extract<RichBlock, { kind: 'table' }>;
  query: string;
  size: number;
}) {
  const theme = useTheme();
  const columnWidth = Math.max(120, Math.round(size * 9));

  return (
    <ScrollView
      horizontal
      style={{
        marginVertical: spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: radius.md,
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt }}>
          {block.columns.map((heading, column) => (
            <View key={column} style={{ width: columnWidth, padding: spacing.sm }}>
              <ThemedText variant="caption" weight="semibold">
                {heading}
              </ThemedText>
            </View>
          ))}
        </View>
        {block.rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            {block.columns.map((_heading, column) => (
              <View key={column} style={{ width: columnWidth, padding: spacing.sm }}>
                <Spans spans={[{ text: row[column] ?? '' }]} query={query} size={size - 1} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

interface SpansProps {
  spans: RichSpan[];
  query: string;
  size: number;
  weight?: '400' | '500' | '600' | '700';
  italic?: boolean;
  accessibilityRole?: 'header';
}

/**
 * Renders a run of spans as one selectable `Text`, with the search term picked
 * out inside it.
 *
 * Nested `Text` is the only way to style part of a line on React Native, and
 * it behaves the same on web — so bold, links and search highlighting all work
 * identically on a phone and in the browser with no platform branch.
 */
function Spans({ spans, query, size, weight, italic, accessibilityRole }: SpansProps) {
  const theme = useTheme();
  const lineHeight = Math.round(size * 1.55);

  return (
    <Text
      selectable
      accessibilityRole={accessibilityRole}
      style={{ fontSize: size, lineHeight, color: theme.colors.text }}
    >
      {spans.map((span, spanIndex) => {
        const segments = splitHighlights(span.text, query);

        return segments.map((segment, segmentIndex) => (
          <Text
            key={`${spanIndex}-${segmentIndex}`}
            onPress={span.href ? () => void Linking.openURL(span.href!).catch(() => undefined) : undefined}
            style={{
              fontWeight: span.bold ? '700' : weight,
              fontStyle: span.italic || italic ? 'italic' : 'normal',
              textDecorationLine: span.underline || span.href ? 'underline' : 'none',
              fontFamily: span.code ? MONOSPACE_FONT : undefined,
              color: span.href
                ? theme.colors.primary
                : segment.match
                  ? theme.colors.warning
                  : theme.colors.text,
              backgroundColor: segment.match
                ? theme.colors.warningSurface
                : span.code
                  ? theme.colors.surfaceAlt
                  : undefined,
            }}
          >
            {segment.text}
          </Text>
        ));
      })}
    </Text>
  );
}
