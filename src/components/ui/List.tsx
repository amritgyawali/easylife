import { Children, Fragment, type ComponentProps, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export interface ListProps {
  children: ReactNode;
  /** Left indent for the separators, so they line up with a row's text. */
  dividerInset?: number;
  /** Drop the card chrome when the list is already inside one. */
  bare?: boolean;
}

/**
 * A card full of rows, with hairlines drawn *between* them automatically.
 *
 * Doing this here rather than in each row means no screen has to know which
 * item is last (the classic source of a stray trailing rule above a card's
 * bottom edge), and a list of five things reads as five things rather than as
 * one undifferentiated block of text.
 */
export function List({ children, dividerInset = 0, bare = false }: ListProps) {
  const rows = Children.toArray(children).filter(Boolean);

  const content = rows.map((row, index) => (
    <Fragment key={index}>
      {index > 0 ? <Divider inset={dividerInset} /> : null}
      {row}
    </Fragment>
  ));

  if (bare) return <View>{content}</View>;

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      {content}
    </Card>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Third line for supporting detail — dates, accounts, counts. */
  caption?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconTone?: 'muted' | 'primary' | 'positive' | 'negative' | 'warning';
  /** Replaces the icon slot entirely (avatar, checkbox, colour swatch). */
  leading?: ReactNode;
  /** Right-hand value, e.g. an amount. Rendered above `trailing`. */
  value?: string;
  valueTone?: 'default' | 'muted' | 'positive' | 'negative';
  /** Controls at the end of the row (icon buttons, badges). */
  trailing?: ReactNode;
  /** Chips under the title — badges, tags. */
  meta?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  chevron?: boolean;
  accessibilityLabel?: string;
}

/**
 * The standard row: leading affordance, a title stack, an optional value, and
 * trailing controls. Every row is at least `minTouchTarget` tall and grows
 * with its content, so a phone list never produces a 30px-tall tap target.
 */
export function ListRow({
  title,
  subtitle,
  caption,
  icon,
  iconTone = 'muted',
  leading,
  value,
  valueTone = 'default',
  trailing,
  meta,
  onPress,
  selected = false,
  chevron = false,
  accessibilityLabel,
}: ListRowProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  const iconColor = {
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    positive: theme.colors.positive,
    negative: theme.colors.negative,
    warning: theme.colors.warning,
  }[iconTone];

  const body = (
    <>
      {leading ??
        (icon ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        ) : null)}

      <View style={{ flex: 1, gap: spacing.xxs, minWidth: 0 }}>
        <ThemedText variant="body" weight="medium" numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="label" tone="muted" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
        {caption ? (
          <ThemedText variant="caption" tone="subtle" numberOfLines={1}>
            {caption}
          </ThemedText>
        ) : null}
        {meta ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginTop: spacing.xxs,
            }}
          >
            {meta}
          </View>
        ) : null}
      </View>

      {value ? (
        <ThemedText variant="body" weight="semibold" tone={valueTone} numeric numberOfLines={1}>
          {value}
        </ThemedText>
      ) : null}
      {trailing}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} /> : null}
    </>
  );

  const layout: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: compact ? spacing.md : spacing.lg,
    minHeight: minTouchTarget + spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: compact ? spacing.md : spacing.lg,
    backgroundColor: selected ? theme.colors.accentSurface : 'transparent',
  };

  if (!onPress) {
    return <View style={layout}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          layout,
          transition(),
          clickable(),
          {
            backgroundColor: selected
              ? theme.colors.accentSurface
              : pressed || hovered
                ? theme.colors.surfaceHover
                : 'transparent',
          },
          focusRing(theme.colors.focus, focused, -2),
        ];
      }}
    >
      {body}
    </Pressable>
  );
}
