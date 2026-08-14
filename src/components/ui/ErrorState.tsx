import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
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
  const theme = useTheme();
  const message = toUserMessage(error as AppError | unknown);

  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xxl,
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
          backgroundColor: theme.colors.negativeSurface,
          marginBottom: spacing.xs,
        }}
      >
        <Ionicons name="alert-circle-outline" size={26} color={theme.colors.negative} />
      </View>
      <ThemedText variant="subtitle" style={{ textAlign: 'center' }}>
        Something went wrong
      </ThemedText>
      <ThemedText variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 420 }}>
        {message}
      </ThemedText>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" icon="refresh" />
        </View>
      ) : null}
    </View>
  );
}
