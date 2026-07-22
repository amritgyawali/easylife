import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View
      accessibilityRole="text"
      style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl }}
    >
      <ThemedText variant="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {description}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}
