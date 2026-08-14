import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Illustrative glyph above the title. Decorative only. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** `inline` drops the vertical padding, for empties inside a small card. */
  size?: 'inline' | 'page';
}

/**
 * The "nothing here yet" state for every list in the app.
 *
 * An empty screen is a teaching moment rather than a dead end, so the shape
 * is always the same: a soft glyph, what would be here, and — where there is
 * one — the action that fills it.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'sparkles-outline',
  size = 'page',
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: size === 'page' ? spacing.xxxl : spacing.xl,
        paddingHorizontal: spacing.xl,
      }}
    >
      <View
        accessible={false}
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
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label={actionLabel} onPress={onAction} variant="primary" icon="add" />
        </View>
      ) : null}
    </View>
  );
}
