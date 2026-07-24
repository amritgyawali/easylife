import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';

export interface CardProps extends ViewProps {
  padded?: boolean;
}

export function Card({ style, padded = true, ...rest }: CardProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: compact ? radius.md : radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? (compact ? spacing.md : spacing.lg) : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
