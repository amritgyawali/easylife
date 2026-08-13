import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { toUserMessage } from '@/utils/errors';

export type InlineMessageTone = 'info' | 'positive' | 'warning' | 'negative';

export interface InlineMessageProps {
  tone?: InlineMessageTone;
  title?: string;
  message: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  action?: ReactNode;
}

const DEFAULT_ICON: Record<InlineMessageTone, ComponentProps<typeof Ionicons>['name']> = {
  info: 'information-circle-outline',
  positive: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  negative: 'close-circle-outline',
};

/**
 * A tinted strip carrying one piece of status — a save failure, a caveat about
 * the data, a confirmation. Used inline in forms and cards, where a full
 * `ErrorState` (which owns the whole screen) would be far too heavy.
 *
 * Errors are announced politely rather than assertively: they follow an action
 * the user just took, so they'll be read in context without interrupting.
 */
export function InlineMessage({ tone = 'info', title, message, icon, action }: InlineMessageProps) {
  const theme = useTheme();

  const surface: Record<InlineMessageTone, string> = {
    info: theme.colors.accentSurface,
    positive: theme.colors.positiveSurface,
    warning: theme.colors.warningSurface,
    negative: theme.colors.negativeSurface,
  };

  const accent: Record<InlineMessageTone, string> = {
    info: theme.colors.primary,
    positive: theme.colors.positive,
    warning: theme.colors.warning,
    negative: theme.colors.negative,
  };

  const textTone: Record<InlineMessageTone, 'primary' | 'positive' | 'warning' | 'negative'> = {
    info: 'primary',
    positive: 'positive',
    warning: 'warning',
    negative: 'negative',
  };

  return (
    <View
      accessibilityRole={tone === 'negative' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: surface[tone],
      }}
    >
      <Ionicons name={icon ?? DEFAULT_ICON[tone]} size={18} color={accent[tone]} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        {title ? (
          <ThemedText variant="label" weight="semibold" tone={textTone[tone]}>
            {title}
          </ThemedText>
        ) : null}
        <ThemedText variant="label" tone={title ? 'default' : textTone[tone]}>
          {message}
        </ThemedText>
      </View>
      {action}
    </View>
  );
}

/**
 * Renders whatever a mutation threw as a readable line, or nothing when the
 * mutation is fine — so call sites can drop it in unconditionally.
 */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return <InlineMessage tone="negative" message={toUserMessage(error)} />;
}
