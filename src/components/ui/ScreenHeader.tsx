import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useCompactLayout } from '@/hooks/useCompactLayout';
import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Small label above the title — the section a sub-page belongs to. */
  eyebrow?: string;
  /** Primary action for the screen, e.g. an "Add task" button. */
  action?: ReactNode;
  /** Shows a back control. Pass `true` to pop the stack, or a route to go to. */
  back?: boolean | string;
}

/**
 * Consistent title block for every feature screen. Keeps the heading
 * semantics (`accessibilityRole="header"`) in one place so screen readers get
 * a reliable landmark on each screen rather than it depending on whoever
 * wrote the screen remembering.
 *
 * On a phone the action drops below the title rather than squeezing beside
 * it — a long title plus a button on one 360px row leaves neither readable.
 */
export function ScreenHeader({ title, subtitle, eyebrow, action, back }: ScreenHeaderProps) {
  const compact = useCompactLayout();
  const router = useRouter();

  const heading = (
    <View style={{ flex: 1, gap: spacing.xxs, minWidth: 0 }}>
      {eyebrow ? (
        <ThemedText variant="overline" tone="muted">
          {eyebrow}
        </ThemedText>
      ) : null}
      <ThemedText variant="title" accessibilityRole="header">
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText variant="body" tone="muted">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );

  const backButton = back ? (
    <IconButton
      icon="chevron-back"
      accessibilityLabel="Go back"
      variant="outlined"
      onPress={() => {
        if (typeof back === 'string') router.push(back);
        else if (router.canGoBack()) router.back();
        else router.push('/');
      }}
    />
  ) : null;

  if (compact && action) {
    return (
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {backButton}
          {heading}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>{action}</View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      {backButton}
      {heading}
      {action ? <View style={{ flexDirection: 'row', gap: spacing.sm }}>{action}</View> : null}
    </View>
  );
}
