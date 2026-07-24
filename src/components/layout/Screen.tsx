import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';

export interface ScreenProps extends PropsWithChildren {
  /** Rendered above the scroll area and pinned, e.g. a ScreenHeader + filters. */
  header?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Set for screens that own their own scrolling (e.g. a FlatList). */
  scrollable?: boolean;
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
 */
export function Screen({ header, onRefresh, refreshing = false, scrollable = true, children }: ScreenProps) {
  const theme = useTheme();

  const body = (
    <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', gap: spacing.lg }}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {header ? (
        <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', gap: spacing.md }}>{header}</View>
        </View>
      ) : null}
      {scrollable ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: header ? 0 : spacing.lg,
            paddingBottom: spacing.lg + FAB_CLEARANCE,
            gap: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            padding: spacing.lg,
            paddingTop: header ? 0 : spacing.lg,
            paddingBottom: spacing.lg + FAB_CLEARANCE,
          }}
        >
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}
