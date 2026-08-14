import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { layout, spacing } from '@/constants/theme';

export interface ScreenProps extends PropsWithChildren {
  /** Rendered above the scroll area and pinned, e.g. a ScreenHeader + filters. */
  header?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Set for screens that own their own scrolling (e.g. a FlatList). */
  scrollable?: boolean;
  /**
   * Content column width. `content` (default) suits lists, tables and
   * dashboards; `prose` narrows it for reading- and form-heavy screens, where
   * a full-width measure is tiring to read.
   */
  width?: 'content' | 'prose' | 'full';
}

/**
 * Extra bottom padding reserved on every scrollable screen so the floating
 * quick-add button (56px, plus its own margin) never sits on top of the last
 * row of a list — without this the bottom item of most task/note/transaction
 * lists was unreachable/hidden behind the FAB on phones.
 */
const FAB_CLEARANCE = 88;

/**
 * Standard page container for every feature screen: safe-area insets, the
 * themed background, consistent gutters, and optional pull-to-refresh.
 *
 * Centralising this keeps the padding and the max content width identical
 * across the app — on a wide desktop viewport the content is capped rather
 * than stretching a task list across 2000px.
 *
 * The header is pinned outside the scroll view and separated by a hairline
 * rule, so the page title and its filters stay put while a long list scrolls
 * underneath — the behaviour desktop users expect and the one that keeps the
 * primary action reachable on a phone.
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
  const compact = useCompactLayout();
  const gutter = compact ? spacing.md : spacing.xl;
  const sectionGap = compact ? spacing.md : spacing.lg;

  const maxWidth =
    width === 'full' ? undefined : width === 'prose' ? layout.maxProseWidth : layout.maxContentWidth;

  const column = { width: '100%' as const, maxWidth, alignSelf: 'center' as const };

  const body = <View style={[column, { gap: sectionGap }]}>{children}</View>;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {header ? (
        <View
          style={{
            paddingHorizontal: gutter,
            paddingTop: compact ? spacing.md : spacing.lg,
            paddingBottom: compact ? spacing.md : spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          <View style={[column, { gap: spacing.md }]}>{header}</View>
        </View>
      ) : null}

      {scrollable ? (
        <ScrollView
          contentContainerStyle={{
            padding: gutter,
            paddingBottom: gutter + FAB_CLEARANCE,
            gap: sectionGap,
          }}
          keyboardShouldPersistTaps="handled"
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
            padding: gutter,
            paddingBottom: gutter + FAB_CLEARANCE,
          }}
        >
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}
