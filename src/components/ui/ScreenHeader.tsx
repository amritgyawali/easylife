import type { ReactNode } from 'react';
import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/useCompactLayout';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Quiet line above the title naming the section this screen belongs to. */
  eyebrow?: string;
  /** Primary action for the screen, e.g. an "Add task" button. */
  action?: ReactNode;
  /** Back affordance for screens pushed on top of another (import detail, …). */
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Consistent title block for every feature screen.
 *
 * On desktop the action sits inline to the right of the title. On a phone it
 * moves to its own full-width row underneath: a long title and a button
 * competing for a 360px line is what produced the squashed two-word buttons
 * and clipped headings the mobile layout used to show.
 */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  action,
  onBack,
  backLabel = 'Go back',
}: ScreenHeaderProps) {
  const { compact } = useLayout();
  const stackAction = compact && Boolean(action);

  const titleBlock = (
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
        <ThemedText variant={compact ? 'label' : 'body'} tone="muted">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <View style={{ gap: stackAction ? spacing.md : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        {onBack ? (
          <View style={{ marginTop: spacing.xxs, marginLeft: -spacing.sm }}>
            <IconButton
              icon="chevron-back"
              accessibilityLabel={backLabel}
              onPress={onBack}
              tone="default"
              variant="soft"
            />
          </View>
        ) : null}
        {titleBlock}
        {!stackAction ? action : null}
      </View>
      {stackAction ? <View style={{ flexDirection: 'row', gap: spacing.sm }}>{action}</View> : null}
    </View>
  );
}
