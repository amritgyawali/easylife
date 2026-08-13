import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useCompactLayout';
import { layout, spacing } from '@/constants/theme';

export type ScreenWidth = 'narrow' | 'content' | 'wide' | 'full';

export interface ScreenProps extends PropsWithChildren {
  /** Rendered above the scroll area and pinned, e.g. a ScreenHeader + filters. */
  header?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Set for screens that own their own scrolling (e.g. a FlatList). */
  scrollable?: boolean;
  /**
   * Content column cap. `content` (default) suits lists and detail screens;
   * `wide` is for dashboards that lay out in columns; `narrow` for reading and
   * single-column forms; `full` opts out entirely (the document reader).
   */
  width?: ScreenWidth;
}

/**
 * Extra bottom padding reserved on phone screens so the floating quick-add
 * button (56px, plus its own margin) never sits on top of the last row of a
 * list — without this the bottom item of most task/note/transaction lists was
 * unreachable/hidden behind the FAB. On desktop the quick-add lives in the top
 * bar instead, so no clearance is needed.
 */
const FAB_CLEARANCE = 88;

const MAX_WIDTH: Record<ScreenWidth, number | undefined> = {
  narrow: layout.narrow,
  content: layout.content,
  wide: layout.wide,
  full: undefined,
};

/**
 * Standard page container for every feature screen: safe-area insets, the
 * themed background, consistent gutters, a pinned header, and optional
 * pull-to-refresh.
 *
 * Centralising this keeps padding and the content column identical across the
 * app — on a wide desktop viewport the content is capped and centred rather
 * than stretching a task list across 2000px, and on a phone every screen gets
 * the same 16px gutter instead of each one choosing its own.
 */
export function Screen({
  header,
  onRefresh,
  refreshing = false,
  scrollable = true,
  width = 'content',
  children,
}: ScreenProps) {
  const theme = useTheme();
  const { compact, wide } = useLayout();
  const [scrolled, setScrolled] = useState(false);

  const gutter = compact ? spacing.lg : wide ? spacing.xxl : spacing.xl;
  const sectionGap = compact ? spacing.md : spacing.lg;
  const maxWidth = MAX_WIDTH[width];
  const bottomPadding = gutter + (compact ? FAB_CLEARANCE : spacing.xl);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = event.nativeEvent.contentOffset.y > 2;
    if (next !== scrolled) setScrolled(next);
  }

  const column = (content: ReactNode, gap: number, fill = false) => (
    <View style={{ width: '100%', maxWidth, alignSelf: 'center', gap, flex: fill ? 1 : undefined }}>
      {content}
    </View>
  );

  // A non-scrolling screen owns its own scrolling inside (a FlatList, the
  // document reader), so its column has to fill the remaining height rather
  // than shrink to its content.
  const body = column(children, sectionGap, !scrollable);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {header ? (
        <View
          style={{
            paddingHorizontal: gutter,
            paddingTop: compact ? spacing.md : gutter,
            paddingBottom: compact ? spacing.md : spacing.lg,
            backgroundColor: theme.colors.background,
            // The header is pinned above the scroll area, so it needs its own
            // edge once content passes underneath it — otherwise rows appear
            // to slide out of the title on a phone.
            borderBottomWidth: 1,
            borderBottomColor: scrolled ? theme.colors.border : 'transparent',
            zIndex: 1,
          }}
        >
          {column(header, spacing.md)}
        </View>
      ) : null}

      {scrollable ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingTop: header ? sectionGap : gutter,
            paddingBottom: bottomPadding,
          }}
          onScroll={header ? handleScroll : undefined}
          scrollEventThrottle={32}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.textMuted}
                colors={[theme.colors.primary]}
                progressBackgroundColor={theme.colors.surface}
              />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            paddingHorizontal: gutter,
            paddingTop: header ? sectionGap : gutter,
            paddingBottom: compact ? spacing.md : gutter,
          }}
        >
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}
