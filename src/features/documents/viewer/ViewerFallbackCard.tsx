import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';

export interface ViewerFallbackCardProps {
  title: string;
  description: string;
  onOpenExternally?: () => void;
}

/**
 * What the reader shows when it can't render something in place — an unknown
 * file type, or a PDF on a platform with no embeddable frame.
 *
 * It always offers the way forward rather than just stating the limit: the
 * same file, opened by whatever *can* display it.
 */
export function ViewerFallbackCard({ title, description, onOpenExternally }: ViewerFallbackCardProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xl,
      }}
    >
      <Ionicons name="document-outline" size={40} color={theme.colors.textMuted} />
      <ThemedText variant="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </ThemedText>
      <ThemedText variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 420 }}>
        {description}
      </ThemedText>
      {onOpenExternally ? (
        <Button
          label={Platform.OS === 'web' ? 'Open as a full page' : 'Open in the system viewer'}
          variant="secondary"
          onPress={onOpenExternally}
        />
      ) : null}
    </View>
  );
}
