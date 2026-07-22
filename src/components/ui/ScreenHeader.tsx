import type { ReactNode } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Primary action for the screen, e.g. an "Add task" button. */
  action?: ReactNode;
}

/**
 * Consistent title block for every feature screen. Keeps the heading
 * semantics (`accessibilityRole="header"`) in one place so screen readers get
 * a reliable landmark on each screen rather than it depending on whoever
 * wrote the screen remembering.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ThemedText variant="title" accessibilityRole="header">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="body" tone="muted">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {action}
    </View>
  );
}
