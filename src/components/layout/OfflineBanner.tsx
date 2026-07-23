import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { useIsOnline, usePendingSyncCount } from '@/services/offline/online-manager';

/**
 * The honest, always-visible status line for the offline engine.
 *
 * The rule from OFFLINE_SYNC.md is "never silent": the user should always be
 * able to tell whether their data has reached the server. So this shows three
 * states and nothing in between —
 *   - offline: work is saved locally and will sync later;
 *   - online with a queue: those changes are being pushed right now;
 *   - online and empty: it renders nothing, staying out of the way.
 */
export function OfflineBanner() {
  const theme = useTheme();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const pending = usePendingSyncCount(queryClient);

  if (online && pending === 0) return null;

  const offline = !online;
  const background = offline ? theme.colors.warningSurface : theme.colors.accentSurface;
  const tone = offline ? 'warning' : 'primary';
  const icon = offline ? 'cloud-offline-outline' : 'sync-outline';

  const message = offline
    ? pending > 0
      ? `Offline — ${pending} ${pending === 1 ? 'change' : 'changes'} saved here, will sync when you reconnect`
      : 'Offline — your changes are saved on this device and will sync when you reconnect'
    : `Syncing ${pending} ${pending === 1 ? 'change' : 'changes'}…`;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: background,
      }}
    >
      <Ionicons name={icon} size={16} color={theme.colors[offline ? 'warning' : 'primary']} />
      <ThemedText variant="caption" tone={tone} weight="medium" style={{ flex: 1 }}>
        {message}
      </ThemedText>
    </View>
  );
}
