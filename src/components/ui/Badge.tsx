import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export type BadgeTone = 'neutral' | 'primary' | 'positive' | 'negative' | 'warning' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Optional leading icon. The label always carries the meaning on its own. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Shows a small filled dot instead of an icon — for status like "Active". */
  dot?: boolean;
}

/**
 * Small status chip for task priority/status, habit cadence, note type, and
 * similar metadata. Tone is always paired with a text label — colour never
 * carries the meaning on its own, per the accessibility rules.
 */
export function Badge({ label, tone = 'neutral', size = 'md', icon, dot = false }: BadgeProps) {
  const theme = useTheme();

  const background: Record<BadgeTone, string> = {
    neutral: theme.colors.surfaceAlt,
    primary: theme.colors.accentSurface,
    positive: theme.colors.positiveSurface,
    negative: theme.colors.negativeSurface,
    warning: theme.colors.warningSurface,
    info: theme.colors.infoSurface,
  };

  const foreground: Record<BadgeTone, string> = {
    neutral: theme.colors.textMuted,
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
    info: theme.colors.info,
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: background[tone],
        borderRadius: radius.full,
        paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        paddingVertical: size === 'sm' ? 1 : spacing.xxs,
        alignSelf: 'flex-start',
      }}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: foreground[tone] }} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 11 : 13} color={foreground[tone]} />
      ) : null}
      <ThemedText
        variant="caption"
        weight="semibold"
        style={[{ color: foreground[tone] }, size === 'sm' && { fontSize: fontSize.xs - 1 }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}
