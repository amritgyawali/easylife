import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useHover } from '@/hooks/useHover';
import { minTouchTarget, radius, spacing, transition } from '@/constants/theme';
import { ThemedText, type TextTone } from '@/components/ui/ThemedText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned primary value, e.g. an amount. */
  value?: string;
  valueTone?: TextTone;
  /** Right-aligned secondary line under the value. */
  valueHint?: string;
  /** Circular leading glyph. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconTone?: 'neutral' | 'primary' | 'positive' | 'negative' | 'warning';
  /** Custom leading element — a checkbox or avatar — replacing `icon`. */
  leading?: ReactNode;
  /** Custom trailing element, replacing `value`. */
  trailing?: ReactNode;
  /** Chips under the title: status, category, due date. */
  meta?: ReactNode;
  onPress?: () => void;
  /** Draws the separator above this row. Pass false for the first row. */
  divider?: boolean;
  /** Extra styling for the title — e.g. striking through a completed task. */
  titleStyle?: TextStyle;
  disabled?: boolean;
}

/**
 * The standard row for every list in the app — transactions, tasks, notes,
 * accounts, people, documents.
 *
 * Before this existed each feature built its own row out of raw Views, so
 * padding, icon size and value alignment differed slightly on every screen.
 * Everything is optional, but the geometry is fixed: leading glyph, a
 * title/subtitle stack that absorbs the remaining width, then a right-aligned
 * value.
 */
export function ListRow({
  title,
  subtitle,
  value,
  valueTone = 'default',
  valueHint,
  icon,
  iconTone = 'neutral',
  leading,
  trailing,
  meta,
  onPress,
  divider = true,
  titleStyle,
  disabled = false,
}: ListRowProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const { hovered, hoverProps } = useHover();

  const iconColor: Record<NonNullable<ListRowProps['iconTone']>, string> = {
    neutral: theme.colors.textMuted,
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
  };

  const iconBackground: Record<NonNullable<ListRowProps['iconTone']>, string> = {
    neutral: theme.colors.surfaceAlt,
    primary: theme.colors.accentSurface,
    positive: theme.colors.positiveSurface,
    negative: theme.colors.negativeSurface,
    warning: theme.colors.warningSurface,
  };

  const body = (pressed: boolean) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: compact ? spacing.md : spacing.lg,
        paddingVertical: spacing.md,
        minHeight: minTouchTarget + spacing.md,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: theme.colors.border,
        backgroundColor: pressed || hovered ? theme.colors.surfaceAlt : 'transparent',
        opacity: disabled ? 0.55 : 1,
        ...transition(),
      }}
    >
      {leading ??
        (icon ? (
          <View
            accessible={false}
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: iconBackground[iconTone],
            }}
          >
            <Ionicons name={icon} size={18} color={iconColor[iconTone]} />
          </View>
        ) : null)}

      <View style={{ flex: 1, gap: spacing.xxs, minWidth: 0 }}>
        <ThemedText variant="body" weight="medium" numberOfLines={1} style={titleStyle}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
        {meta ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: spacing.xs,
              marginTop: spacing.xxs,
            }}
          >
            {meta}
          </View>
        ) : null}
      </View>

      {trailing ??
        (value ? (
          <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
            <ThemedText variant="body" weight="semibold" tone={valueTone} numeric numberOfLines={1}>
              {value}
            </ThemedText>
            {valueHint ? (
              <ThemedText variant="caption" tone="muted" numeric numberOfLines={1}>
                {valueHint}
              </ThemedText>
            ) : null}
          </View>
        ) : null)}

      {onPress && !trailing ? (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSubtle} />
      ) : null}
    </View>
  );

  if (!onPress) return body(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...hoverProps}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}
