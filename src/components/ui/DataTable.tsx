import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useHover } from '@/hooks/useHover';
import { minTouchTarget, radius, spacing, transition } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';

export type ColumnAlign = 'left' | 'right';

export interface Column<T> {
  /** Stable identifier, also used as the sort key. */
  key: string;
  header: string;
  /** Returns a string for default text treatment, or any node for custom cells. */
  render: (row: T) => ReactNode;
  /** Proportional width on wide viewports. Defaults to 1. */
  flex?: number;
  /** Fixed width in px; wins over `flex` when set. */
  width?: number;
  align?: ColumnAlign;
  /** Renders with fixed-width digits and right alignment — use for money. */
  numeric?: boolean;
  /** Makes the header cell a sort control. */
  sortable?: boolean;
  /**
   * How the column survives a phone viewport, where a real table cannot fit:
   * `title`/`meta` build the stacked row's headline, `detail` (the default)
   * becomes a label/value pair beneath it, and `hidden` is dropped entirely.
   */
  compact?: 'title' | 'meta' | 'detail' | 'hidden';
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Pinned summary row below the body, e.g. column totals. */
  footer?: ReactNode;
  /** Accessible name for the table as a whole. */
  accessibilityLabel?: string;
}

/**
 * The one table in the app.
 *
 * A column layout is a desktop affordance: below the breakpoint every row
 * collapses into a stacked card (title, meta, then label/value pairs) instead
 * of shrinking columns to unreadable slivers or forcing a horizontal scroll.
 * Because both layouts are driven by the same `columns` array, a screen
 * describes its data once and gets a table on a laptop and a readable list on
 * a phone, and the two can't drift apart.
 */
export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowPress,
  empty,
  sort,
  onSortChange,
  footer,
  accessibilityLabel,
}: DataTableProps<T>) {
  const compact = useCompactLayout();

  if (data.length === 0 && empty) {
    return <Card padded={false}>{empty}</Card>;
  }

  if (compact) {
    return (
      <Card padded={false} accessibilityLabel={accessibilityLabel}>
        {data.map((row, index) => (
          <StackedRow
            key={keyExtractor(row)}
            row={row}
            columns={columns}
            first={index === 0}
            onPress={onRowPress ? () => onRowPress(row) : undefined}
          />
        ))}
        {footer ? <FooterBar>{footer}</FooterBar> : null}
      </Card>
    );
  }

  return (
    <Card padded={false} accessibilityLabel={accessibilityLabel}>
      <HeaderRow columns={columns} sort={sort} onSortChange={onSortChange} />
      {data.map((row, index) => (
        <TableRow
          key={keyExtractor(row)}
          row={row}
          columns={columns}
          first={index === 0}
          onPress={onRowPress ? () => onRowPress(row) : undefined}
        />
      ))}
      {footer ? <FooterBar>{footer}</FooterBar> : null}
    </Card>
  );
}

function cellStyle<T>(column: Column<T>) {
  const align = column.align ?? (column.numeric ? 'right' : 'left');
  return {
    flex: column.width ? undefined : (column.flex ?? 1),
    width: column.width,
    alignItems: align === 'right' ? ('flex-end' as const) : ('flex-start' as const),
    minWidth: 0,
  };
}

function HeaderRow<T>({
  columns,
  sort,
  onSortChange,
}: {
  columns: Column<T>[];
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: theme.colors.surfaceAlt,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      {columns.map((column) => {
        const active = sort?.key === column.key;
        const label = (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <ThemedText variant="overline" tone={active ? 'primary' : 'muted'} numberOfLines={1}>
              {column.header}
            </ThemedText>
            {active ? (
              <Ionicons
                name={sort?.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={theme.colors.primary}
              />
            ) : null}
          </View>
        );

        if (!column.sortable || !onSortChange) {
          return (
            <View key={column.key} style={cellStyle(column)}>
              {label}
            </View>
          );
        }

        return (
          <Pressable
            key={column.key}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${column.header}`}
            onPress={() =>
              onSortChange({
                key: column.key,
                direction: active && sort?.direction === 'asc' ? 'desc' : 'asc',
              })
            }
            style={cellStyle(column)}
          >
            {label}
          </Pressable>
        );
      })}
    </View>
  );
}

function TableRow<T>({
  row,
  columns,
  first,
  onPress,
}: {
  row: T;
  columns: Column<T>[];
  first: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: minTouchTarget + spacing.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
        backgroundColor: hovered ? theme.colors.surfaceAlt : 'transparent',
        ...transition(),
      }}
    >
      {columns.map((column) => (
        <View key={column.key} style={cellStyle(column)}>
          <Cell column={column} row={row} />
        </View>
      ))}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} {...hoverProps}>
      {content}
    </Pressable>
  );
}

/**
 * Strings get the house text treatment automatically so a column only has to
 * opt into custom rendering when it actually needs a badge or a control.
 */
function Cell<T>({ column, row }: { column: Column<T>; row: T }) {
  const rendered = column.render(row);

  if (typeof rendered === 'string' || typeof rendered === 'number') {
    return (
      <ThemedText variant="body" numeric={column.numeric} numberOfLines={1}>
        {rendered}
      </ThemedText>
    );
  }

  return <>{rendered}</>;
}

function StackedRow<T>({
  row,
  columns,
  first,
  onPress,
}: {
  row: T;
  columns: Column<T>[];
  first: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const title = columns.find((column) => column.compact === 'title') ?? columns[0];
  const meta = columns.find((column) => column.compact === 'meta');
  const details = columns.filter(
    (column) => column !== title && column !== meta && column.compact !== 'hidden'
  );

  // A table with no columns has nothing to stack; render nothing rather than
  // an empty bordered row.
  if (!title) return null;

  const content = (
    <View
      style={{
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Cell column={title} row={row} />
        </View>
        {meta ? <Cell column={meta} row={row} /> : null}
      </View>

      {details.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {details.map((column) => (
            <View key={column.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <ThemedText variant="caption" tone="muted" style={{ flex: 1 }}>
                {column.header}
              </ThemedText>
              <Cell column={column} row={row} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={{ backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent' }}>{content}</View>
      )}
    </Pressable>
  );
}

function FooterBar({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceAlt,
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
      }}
    >
      {children}
    </View>
  );
}
