import { useEffect, useMemo, useRef } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import type { DelimitedTable } from '@/features/imports/delimited';
import { HighlightedText } from '@/features/documents/viewer/HighlightedText';
import {
  BASE_MONOSPACE_SIZE,
  MONOSPACE_FONT,
  MONOSPACE_LINE_HEIGHT_RATIO,
  monospaceCharWidth,
} from '@/features/documents/viewer/typography';

export interface TableDocumentViewProps {
  table: DelimitedTable;
  query: string;
  /** Row indices with a matching cell, in order. */
  matches: number[];
  activeMatch: number;
  zoom: number;
}

const MIN_COLUMN_WIDTH = 88;
const MAX_COLUMN_WIDTH = 280;
/** Rows sampled to size the columns — enough to be representative, cheap on a 50k-row export. */
const WIDTH_SAMPLE_ROWS = 120;
const ROW_NUMBER_WIDTH = 52;

/**
 * A CSV/TSV read as a spreadsheet rather than as raw text.
 *
 * This is the whole reason a statement export is worth opening in the app at
 * all: the same parser the import pipeline uses (`parseDelimited`) already
 * knows how to find the header under a bank's preamble and how to honour
 * RFC 4180 quoting, so a payee called `"SHRESTHA, RAM"` lands in one cell
 * here exactly as it does on import.
 */
export function TableDocumentView({ table, query, matches, activeMatch, zoom }: TableDocumentViewProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList<string[]> | null>(null);

  const fontSize = Math.round(BASE_MONOSPACE_SIZE * zoom);
  const lineHeight = Math.round(fontSize * MONOSPACE_LINE_HEIGHT_RATIO);
  const rowHeight = lineHeight + spacing.sm * 2;

  const columnWidths = useMemo(() => {
    const charWidth = monospaceCharWidth(fontSize);
    const sample = table.rows.slice(0, WIDTH_SAMPLE_ROWS);

    return table.header.map((heading, column) => {
      const longest = sample.reduce((max, row) => Math.max(max, row[column]?.length ?? 0), heading.length);
      return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest * charWidth + spacing.lg * 2));
    });
  }, [table, fontSize]);

  const totalWidth = useMemo(
    () => columnWidths.reduce((sum, width) => sum + width, ROW_NUMBER_WIDTH),
    [columnWidths]
  );

  const targetRow = activeMatch >= 0 ? matches[activeMatch] : undefined;

  useEffect(() => {
    if (targetRow === undefined) return;
    listRef.current?.scrollToIndex({ index: targetRow, animated: true, viewPosition: 0.3 });
  }, [targetRow]);

  const matchedRows = useMemo(() => new Set(matches), [matches]);

  if (table.header.length === 0) {
    return (
      <View style={{ padding: spacing.xl }}>
        <ThemedText variant="body" tone="muted">
          No columns could be found in this file. Switch to the text view to see it as it was written.
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ minWidth: '100%' }}>
      {/* The header sits outside the vertical list, so it stays put while the
          rows scroll under it — and inside the horizontal scroll, so it moves
          with the columns it labels. */}
      <View style={{ width: totalWidth, flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.surfaceAlt,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ width: ROW_NUMBER_WIDTH, padding: spacing.sm }} />
          {table.header.map((heading, column) => (
            <View key={column} style={{ width: columnWidths[column], padding: spacing.sm }}>
              <ThemedText
                variant="caption"
                weight="semibold"
                numberOfLines={2}
                style={{ fontSize: Math.max(11, fontSize - 1) }}
              >
                {heading || `Column ${column + 1}`}
              </ThemedText>
            </View>
          ))}
        </View>

        <FlatList
          ref={listRef}
          data={table.rows}
          keyExtractor={(_row, index) => `${index}`}
          style={{ flex: 1 }}
          initialNumToRender={40}
          windowSize={11}
          removeClippedSubviews
          getItemLayout={(_data, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
          renderItem={({ item, index }) => {
            const isActive = index === targetRow;

            return (
              <View
                style={{
                  flexDirection: 'row',
                  height: rowHeight,
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  backgroundColor: isActive
                    ? theme.colors.accentSurface
                    : matchedRows.has(index)
                      ? theme.colors.warningSurface
                      : index % 2 === 1
                        ? theme.colors.surfaceAlt
                        : 'transparent',
                }}
              >
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{
                    width: ROW_NUMBER_WIDTH,
                    paddingHorizontal: spacing.sm,
                    textAlign: 'right',
                    fontFamily: MONOSPACE_FONT,
                  }}
                >
                  {index + 1}
                </ThemedText>
                {table.header.map((_heading, column) => (
                  <View key={column} style={{ width: columnWidths[column], paddingHorizontal: spacing.sm }}>
                    <HighlightedText
                      value={item[column] ?? ''}
                      query={query}
                      fontSize={fontSize}
                      lineHeight={lineHeight}
                      fontFamily={MONOSPACE_FONT}
                      numberOfLines={1}
                    />
                  </View>
                ))}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: spacing.xl }}>
              <ThemedText variant="body" tone="muted">
                This file has a header but no data rows.
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            <View style={{ padding: spacing.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xxs,
                  borderRadius: radius.full,
                  backgroundColor: theme.colors.surfaceAlt,
                }}
              >
                <ThemedText variant="caption" tone="muted">
                  {table.rows.length.toLocaleString()} rows · {table.header.length} columns
                  {table.skippedLines > 0 ? ` · ${table.skippedLines} preamble lines skipped` : ''}
                </ThemedText>
              </View>
            </View>
          }
        />
      </View>
    </ScrollView>
  );
}
