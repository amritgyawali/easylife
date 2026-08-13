import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export type CardTone = 'surface' | 'sunken' | 'accent' | 'outline';
export type CardElevation = 'none' | 'sm' | 'md';

export interface CardProps extends ViewProps {
  padded?: boolean;
  tone?: CardTone;
  /** `sm` for the resting state of content cards, `md` for things that float. */
  elevation?: CardElevation;
  /** Turns the card into a single large tap target (list tiles, nav cards). */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * The app's content container. Everything sits on a card: metrics, lists,
 * forms, empty states.
 *
 * On phones cards are tighter and flatter (a heavy shadow on every row of a
 * long list turns into visual mud, and costs a compositor layer per row); on
 * desktop they get a slightly larger radius and a soft shadow so the page
 * reads as layered rather than as a wall of outlined boxes.
 */
export function Card({
  style,
  padded = true,
  tone = 'surface',
  elevation = 'sm',
  onPress,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  const background: Record<CardTone, string> = {
    surface: theme.colors.surface,
    sunken: theme.colors.surfaceSunken,
    accent: theme.colors.accentSurface,
    outline: 'transparent',
  };

  const borderColor: Record<CardTone, string> = {
    surface: theme.colors.border,
    sunken: theme.colors.border,
    accent: theme.colors.primary,
    outline: theme.colors.border,
  };

  // Shadows are a desktop affordance here; on mobile the border does the work.
  const shadow = compact || elevation === 'none' ? theme.elevation.none : theme.elevation[elevation];

  const base: ViewStyle = {
    backgroundColor: background[tone],
    borderRadius: compact ? radius.md : radius.lg,
    borderWidth: 1,
    borderColor: borderColor[tone],
    padding: padded ? (compact ? spacing.md : spacing.lg) : 0,
    ...shadow,
  };

  if (!onPress) {
    return <View style={[base, style]} {...rest} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          base,
          transition(),
          clickable(),
          {
            backgroundColor: pressed || hovered ? theme.colors.surfaceHover : base.backgroundColor,
            borderColor: hovered ? theme.colors.borderStrong : base.borderColor,
            opacity: pressed ? 0.96 : 1,
          },
          focusRing(theme.colors.focus, focused),
          style as ViewStyle,
        ];
      }}
      {...rest}
    />
  );
}
