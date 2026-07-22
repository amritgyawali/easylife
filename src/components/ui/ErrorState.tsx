import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import type { AppError } from '@/utils/errors';
import { toUserMessage } from '@/utils/errors';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Standard "something went wrong" screen/section. Always shows a
 * human-readable message (never a raw stack trace) plus a recovery action
 * when one is available, per the error-handling architecture in
 * ARCHITECTURE.md.
 */
export function ErrorState({ error, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  const message = toUserMessage(error as AppError | unknown);

  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl }}
    >
      <ThemedText variant="subtitle" tone="negative" style={{ textAlign: 'center' }}>
        Something went wrong
      </ThemedText>
      <ThemedText variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </ThemedText>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
