import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface DividerProps {
  /** Insets the rule from the container edge, to align with row content. */
  inset?: number;
  /** Optional centred caption, e.g. a date separator in a list. */
  label?: string;
  direction?: 'horizontal' | 'vertical';
}

/** Hairline rule. One component so divider colour never drifts per screen. */
export function Divider({ inset = 0, label, direction = 'horizontal' }: DividerProps) {
  const theme = useTheme();

  if (direction === 'vertical') {
    return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.border }} />;
  }

  if (!label) {
    return <View style={{ height: 1, marginHorizontal: inset, backgroundColor: theme.colors.border }} />;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: inset }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      <ThemedText variant="caption" tone="subtle">
        {label}
      </ThemedText>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
    </View>
  );
}
