import { Children, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { spacing } from '@/constants/theme';

export interface GridProps {
  children: ReactNode;
  /**
   * Narrowest a column may get before the grid drops to fewer columns. The
   * column count is derived from this and the measured container width.
   */
  minColumnWidth?: number;
  /** Hard cap on columns, e.g. a two-up layout that should never become three. */
  maxColumns?: number;
  gap?: number;
}

/**
 * Responsive multi-column layout for cards.
 *
 * Columns are computed from the *container's* measured width rather than the
 * window's, which matters here because the desktop sidebar takes 260px out of
 * the viewport and a window-based calculation would consistently fit one
 * column too many. Below the first breakpoint it degrades to a plain stack,
 * which is the correct phone layout anyway.
 */
export function Grid({ children, minColumnWidth = 280, maxColumns = 3, gap = spacing.lg }: GridProps) {
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(Boolean);

  function measure(event: LayoutChangeEvent) {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  }

  const columns =
    width === 0 ? 1 : Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (minColumnWidth + gap))));

  // A single column renders as a plain stack: no fixed child widths, so a card
  // is free to size itself before the first measurement pass lands.
  if (columns === 1) {
    return (
      <View onLayout={measure} style={{ gap }}>
        {items}
      </View>
    );
  }

  const columnWidth = (width - gap * (columns - 1)) / columns;

  return (
    <View onLayout={measure} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {items.map((child, index) => (
        <View key={index} style={{ width: columnWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}
