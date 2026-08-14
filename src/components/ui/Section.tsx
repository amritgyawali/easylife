import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface SectionProps extends PropsWithChildren {
  title: string;
  /** One line of context under the heading. */
  description?: string;
  /** Trailing control on the heading row — usually a "See all" ghost button. */
  action?: ReactNode;
  /** Count shown beside the title, e.g. the number of rows below. */
  count?: number;
}

/**
 * Titled group of content within a screen.
 *
 * Every screen previously hand-rolled its own `<ThemedText variant="label"
 * tone="muted">SOMETHING</ThemedText>` heading with slightly different
 * spacing. This is that pattern, once — so the rhythm between a section
 * heading and its content is identical on every page.
 */
export function Section({ title, description, action, count, children }: SectionProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          minHeight: 28,
        }}
      >
        <View style={{ flex: 1, gap: spacing.xxs, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ThemedText variant="overline" tone="muted" accessibilityRole="header">
              {title}
            </ThemedText>
            {typeof count === 'number' ? (
              <ThemedText variant="overline" tone="subtle" numeric>
                {count}
              </ThemedText>
            ) : null}
          </View>
          {description ? (
            <ThemedText variant="caption" tone="muted">
              {description}
            </ThemedText>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}
