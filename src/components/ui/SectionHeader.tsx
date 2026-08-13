import type { ReactNode } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface SectionHeaderProps {
  title: string;
  /** Appended after the title as a quiet count — "DUE TODAY · 4". */
  count?: number | string;
  description?: string;
  /** Right-aligned control, usually a small ghost button. */
  action?: ReactNode;
}

/**
 * Label above a group of cards or list rows. Uses the `overline` type variant
 * so every section in the app announces itself the same way, and carries
 * `accessibilityRole="header"` so screen-reader users can jump between groups
 * instead of scrolling through every row.
 */
export function SectionHeader({ title, count, description, action }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ThemedText variant="overline" tone="muted" accessibilityRole="header">
          {count !== undefined ? `${title} · ${count}` : title}
        </ThemedText>
        {description ? (
          <ThemedText variant="caption" tone="subtle">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {action}
    </View>
  );
}
