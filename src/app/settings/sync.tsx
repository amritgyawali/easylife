import { Platform, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { List, ListRow } from '@/components/ui/List';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ThemedText } from '@/components/ui/ThemedText';
import { spacing } from '@/constants/theme';
import { formatIsoDate } from '@/utils/date';
import { isFinancialEntity } from '@/features/sync/conflict';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useResolveConflict,
  useSyncConflicts,
  unreadCount,
  type ConflictChoice,
  type SyncConflictRow,
} from '@/features/sync/api';

/**
 * Sync & notifications: the "never silent" surface from OFFLINE_SYNC.md.
 *
 * On web the app talks to Supabase live, so there is nothing queued to sync;
 * the value here is the conflict queue and the notification log. When two
 * devices edit the same row, both versions are preserved server-side and land
 * here for the user to choose between — financial rows are always flagged so a
 * money conflict is never resolved by reflex.
 */
export default function SyncScreen() {
  const conflictsQuery = useSyncConflicts();
  const notificationsQuery = useNotifications();
  const resolve = useResolveConflict();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const conflicts = conflictsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const unread = unreadCount(notifications);

  return (
    <Screen
      onRefresh={() => {
        void conflictsQuery.refetch();
        void notificationsQuery.refetch();
      }}
      refreshing={conflictsQuery.isRefetching || notificationsQuery.isRefetching}
      header={<ScreenHeader eyebrow="Settings" title="Sync & notifications" subtitle={syncSubtitle()} />}
    >
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Unresolved conflicts" count={conflicts.length || undefined} />

        {conflictsQuery.isLoading ? (
          <SkeletonList rows={2} />
        ) : conflictsQuery.error ? (
          <ErrorState error={conflictsQuery.error} onRetry={() => void conflictsQuery.refetch()} />
        ) : conflicts.length === 0 ? (
          <Card>
            <ThemedText variant="body" tone="muted">
              Nothing to resolve — every change is in sync across your devices.
            </ThemedText>
          </Card>
        ) : (
          conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              busy={resolve.isPending}
              onResolve={(choice) => resolve.mutate({ id: conflict.id, choice })}
            />
          ))
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader
          title="Notifications"
          count={unread > 0 ? `${unread} unread` : undefined}
          action={
            unread > 0 ? (
              <Button
                label="Mark all read"
                size="sm"
                variant="ghost"
                onPress={() => markAllRead.mutate()}
                loading={markAllRead.isPending}
              />
            ) : null
          }
        />

        {notificationsQuery.isLoading ? (
          <SkeletonList rows={3} />
        ) : notificationsQuery.error ? (
          <ErrorState error={notificationsQuery.error} onRetry={() => void notificationsQuery.refetch()} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            description="Reminders, extraction results and export updates will show up here."
          />
        ) : (
          <List>
            {notifications.map((notification) => (
              <ListRow
                key={notification.id}
                icon={notification.read_at === null ? 'mail-unread-outline' : 'mail-open-outline'}
                iconTone={notification.read_at === null ? 'primary' : 'muted'}
                title={notification.title}
                subtitle={notification.body ?? undefined}
                caption={formatIsoDate(notification.created_at.slice(0, 10))}
                meta={notification.read_at === null ? <Badge label="New" tone="primary" dot /> : null}
                trailing={
                  notification.read_at === null ? (
                    <Button
                      label="Mark read"
                      size="sm"
                      variant="ghost"
                      onPress={() => markRead.mutate(notification.id)}
                    />
                  ) : null
                }
              />
            ))}
          </List>
        )}
      </View>
    </Screen>
  );
}

function syncSubtitle(): string {
  return Platform.OS === 'web'
    ? 'Changes sync live while you are online'
    : 'Changes are saved on this device and sync in the background';
}

function ConflictCard({
  conflict,
  busy,
  onResolve,
}: {
  conflict: SyncConflictRow;
  busy: boolean;
  onResolve: (choice: ConflictChoice) => void;
}) {
  const financial = isFinancialEntity(conflict.entity_type);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <ThemedText variant="body" weight="semibold" style={{ flex: 1 }}>
          {humaniseEntity(conflict.entity_type)}
        </ThemedText>
        {financial ? <Badge label="Money — review carefully" tone="warning" /> : null}
      </View>

      <ThemedText variant="body" tone="muted">
        This item was changed on more than one device (this device saw version {conflict.local_version}, the
        server now has version {conflict.server_version}). Choose which version to keep — the other is
        discarded.
      </ThemedText>

      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Button
          label="Keep this device's version"
          icon="phone-portrait-outline"
          onPress={() => onResolve('kept_local')}
          disabled={busy}
        />
        <Button
          label="Keep server version"
          variant="secondary"
          onPress={() => onResolve('kept_server')}
          disabled={busy}
        />
      </View>
    </Card>
  );
}

function humaniseEntity(entityType: string): string {
  return entityType.replace(/_/g, ' ').replace(/^\w/, (character) => character.toUpperCase());
}
