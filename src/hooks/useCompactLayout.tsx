import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useWindowDimensions } from 'react-native';

import { breakpoint } from '@/constants/theme';

/**
 * Named layout sizes, from a phone in portrait to a maximised desktop window.
 *
 * - `compact` — phones. Bottom tab bar, single column, full-bleed sheets.
 * - `medium`  — small tablets / split-screen. Sidebar collapses to an icon rail.
 * - `expanded`— laptops. Full sidebar with labels, two-column content.
 * - `wide`    — large desktop monitors. Widest content column, three columns.
 */
export type LayoutSize = 'compact' | 'medium' | 'expanded' | 'wide';

export interface LayoutInfo {
  width: number;
  height: number;
  size: LayoutSize;
  /** Phone-sized: the single switch most components need. */
  compact: boolean;
  /** Anything that shows the desktop sidebar (medium and up). */
  desktop: boolean;
  /** Sidebar can afford labels rather than an icon rail. */
  expanded: boolean;
  wide: boolean;
  /** Portrait phones are the tightest case — used to drop optional columns. */
  narrow: boolean;
}

function sizeFor(width: number): LayoutSize {
  if (width < breakpoint.md) return 'compact';
  if (width < breakpoint.lg) return 'medium';
  if (width < breakpoint.xl) return 'expanded';
  return 'wide';
}

const FALLBACK: LayoutInfo = {
  width: breakpoint.md,
  height: 800,
  size: 'compact',
  compact: true,
  desktop: false,
  expanded: false,
  wide: false,
  narrow: false,
};

const LayoutContext = createContext<LayoutInfo>(FALLBACK);

/**
 * Owns the single window-size subscription used by the responsive UI. This
 * avoids attaching a Dimensions subscriber for every text or card in a long
 * mobile list.
 */
export function CompactLayoutProvider({ children }: PropsWithChildren) {
  const { width, height } = useWindowDimensions();

  const value = useMemo<LayoutInfo>(() => {
    const size = sizeFor(width);
    return {
      width,
      height,
      size,
      compact: size === 'compact',
      desktop: size !== 'compact',
      expanded: size === 'expanded' || size === 'wide',
      wide: size === 'wide',
      narrow: width < breakpoint.sm,
    };
  }, [width, height]);

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

/**
 * Shared narrow-layout switch used by the app shell and reusable UI pieces.
 * Keeping the breakpoint in one place prevents typography, cards, and screens
 * from changing density at slightly different widths.
 */
export function useCompactLayout(): boolean {
  return useContext(LayoutContext).compact;
}

/** Full responsive picture for components that need more than "is it a phone". */
export function useLayout(): LayoutInfo {
  return useContext(LayoutContext);
}

/**
 * Picks the value matching the current layout size, falling back down the
 * scale when a size is omitted — `{ compact: 1, expanded: 3 }` yields 1 on a
 * phone, 1 on a tablet, 3 on a laptop, and 3 on a wide monitor.
 */
export function useResponsiveValue<T>(values: { compact: T; medium?: T; expanded?: T; wide?: T }): T {
  const { size } = useLayout();
  if (size === 'wide') return values.wide ?? values.expanded ?? values.medium ?? values.compact;
  if (size === 'expanded') return values.expanded ?? values.medium ?? values.compact;
  if (size === 'medium') return values.medium ?? values.compact;
  return values.compact;
}
