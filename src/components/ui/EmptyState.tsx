import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Low-emphasis alternative, e.g. "Import instead". */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** `card` gives the state its own surface; `plain` sits on the page. */
  variant?: 'card' | 'plain';
}

/**
 * What a screen shows before it has any data.
 *
 * An empty screen is the first thing a new user sees, so it always names the
 * next action rather than just stating that nothing is here — the action
 * button is the primary one on the screen at that moment.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon = 'sparkles-outline',
  variant = 'card',
}: EmptyStateProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  const content = (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: compact ? spacing.xl : spacing.xxl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceAlt,
          marginBottom: spacing.xs,
        }}
      >
        <Ionicons name={icon} size={26} color={theme.colors.textMuted} />
      </View>

      <ThemedText variant="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 420 }}>
          {description}
        </ThemedText>
      ) : null}

      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <View
          style={{
            flexDirection: compact ? 'column' : 'row',
            alignSelf: 'stretch',
            justifyContent: 'center',
            gap: spacing.sm,
            marginTop: spacing.md,
          }}
        >
          {actionLabel && onAction ? (
            <Button label={actionLabel} onPress={onAction} variant="primary" fullWidth={compact} />
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="secondary"
              fullWidth={compact}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (variant === 'plain') return content;

  return <Card padded={false}>{content}</Card>;
}
