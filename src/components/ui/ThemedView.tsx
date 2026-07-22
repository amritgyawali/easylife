import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/constants/theme';

export interface ThemedViewProps extends ViewProps {
  background?: keyof Theme['colors'];
}

export function ThemedView({ style, background = 'background', ...rest }: ThemedViewProps) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme.colors[background] }, style]} {...rest} />;
}
