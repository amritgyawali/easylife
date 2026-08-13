import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type BadgeTone = 'neutral' | 'primary' | 'positive' | 'negative' | 'warning';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Small colored dot instead of an icon — for status without extra weight. */
  dot?: boolean;
}

/**
 * Small status chip for task priority/status, habit cadence, note type, and
 * similar metadata. Tone is always paired with a text label — colour never
 * carries the meaning on its own, per the accessibility rules — and the
 * optional dot/icon gives a second, non-colour cue.
 */
export function Badge({ label, tone = 'neutral', size = 'sm', icon, dot = false }: BadgeProps) {
  const theme = useTheme();

  const background: Record<BadgeTone, string> = {
    neutral: theme.colors.surfaceAlt,
    primary: theme.colors.accentSurface,
    positive: theme.colors.positiveSurface,
    negative: theme.colors.negativeSurface,
    warning: theme.colors.warningSurface,
  };

  const foreground: Record<BadgeTone, string> = {
    neutral: theme.colors.textMuted,
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
  };

  const textTone: Record<BadgeTone, 'muted' | 'primary' | 'positive' | 'negative' | 'warning'> = {
    neutral: 'muted',
    primary: 'primary',
    positive: 'positive',
    negative: 'negative',
    warning: 'warning',
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: background[tone],
        borderRadius: radius.full,
        paddingHorizontal: size === 'md' ? spacing.md : spacing.sm,
        paddingVertical: size === 'md' ? spacing.xs : spacing.xxs,
        alignSelf: 'flex-start',
      }}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: foreground[tone] }} />
      ) : null}
      {icon ? <Ionicons name={icon} size={size === 'md' ? 14 : 12} color={foreground[tone]} /> : null}
      <ThemedText variant="caption" tone={textTone[tone]} weight="semibold" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}
