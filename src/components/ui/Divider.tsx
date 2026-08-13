import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export interface DividerProps {
  /** Indents the rule so it starts under a row's text, not its icon. */
  inset?: number;
  direction?: 'horizontal' | 'vertical';
}

/** Hairline separator between rows inside a card. */
export function Divider({ inset = 0, direction = 'horizontal' }: DividerProps) {
  const theme = useTheme();

  if (direction === 'vertical') {
    return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.border }} />;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ height: 1, marginLeft: inset, backgroundColor: theme.colors.border }}
    />
  );
}
