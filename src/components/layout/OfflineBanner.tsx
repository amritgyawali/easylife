import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { spacing } from '@/constants/theme';
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
  const compact = useCompactLayout();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  // Both queued write paths: durable outbox entries (quick-add) and TanStack's
  // in-memory paused mutations (the existing edit screens).
  const pending = usePendingSyncCount(queryClient) + useOutboxCount();

  if (online && pending === 0) return null;

  const offline = !online;
  const accent = offline ? theme.colors.warning : theme.colors.primary;

  // On a phone the banner sits above every screen, so it stays to one short
  // line; the full explanation is only shown where there is room for it.
  const message = offline
    ? pending > 0
      ? compact
        ? `Offline · ${pending} saved here`
        : `Offline — ${pending} ${pending === 1 ? 'change' : 'changes'} saved on this device, syncing when you reconnect`
      : compact
        ? 'Offline · saved on this device'
        : 'Offline — your changes are saved on this device and will sync when you reconnect'
    : `Syncing ${pending} ${pending === 1 ? 'change' : 'changes'}…`;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: offline ? theme.colors.warningSurface : theme.colors.accentSurface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      {offline ? (
        <Ionicons name="cloud-offline-outline" size={15} color={accent} />
      ) : (
        <ActivityIndicator size="small" color={accent} />
      )}
      <ThemedText variant="caption" tone={offline ? 'warning' : 'primary'} weight="medium" numberOfLines={1}>
        {message}
      </ThemedText>
    </View>
  );
}
