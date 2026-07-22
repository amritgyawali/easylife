import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type BadgeTone = 'neutral' | 'primary' | 'positive' | 'negative' | 'warning';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

/**
 * Small status chip for task priority/status, habit cadence, note type, and
 * similar metadata. Tone is always paired with a text label — colour never
 * carries the meaning on its own, per the accessibility rules.
 */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const background: Record<BadgeTone, string> = {
    neutral: theme.colors.surfaceAlt,
    primary: theme.colors.accentSurface,
    positive: theme.colors.positiveSurface,
    negative: theme.colors.negativeSurface,
    warning: theme.colors.warningSurface,
  };

  const textTone: Record<BadgeTone, 'default' | 'primary' | 'positive' | 'negative' | 'warning'> = {
    neutral: 'default',
    primary: 'primary',
    positive: 'positive',
    negative: 'negative',
    warning: 'warning',
  };

  return (
    <View
      style={{
        backgroundColor: background[tone],
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        alignSelf: 'flex-start',
      }}
    >
      <ThemedText variant="caption" tone={textTone[tone]} weight="medium">
        {label}
      </ThemedText>
    </View>
  );
}
