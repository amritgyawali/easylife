import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { useIsOnline, usePendingSyncCount } from '@/services/offline/online-manager';
import { useOutboxCount } from '@/services/offline/outbox-store';

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
  // Both queued write paths: durable outbox entries (quick-add) and TanStack's
  // in-memory paused mutations (the existing edit screens).
  const pending = usePendingSyncCount(queryClient) + useOutboxCount();

  if (online && pending === 0) return null;

  const offline = !online;
  const accent = offline ? theme.colors.warning : theme.colors.primary;

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
        backgroundColor: offline ? theme.colors.warningSurface : theme.colors.accentSurface,
        // A coloured rule on the leading edge distinguishes the two states
        // even before the text is read.
        borderLeftWidth: 3,
        borderLeftColor: accent,
      }}
    >
      <View
        accessible={false}
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surface,
        }}
      >
        <Ionicons name={offline ? 'cloud-offline-outline' : 'sync-outline'} size={13} color={accent} />
      </View>
      <ThemedText variant="caption" weight="medium" style={{ flex: 1, color: accent }}>
        {message}
      </ThemedText>
    </View>
  );
}
