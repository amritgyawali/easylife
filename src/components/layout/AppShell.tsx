import { useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { spacing, minTouchTarget, radius, fontSize } from '@/constants/theme';
import { MOBILE_TABS, MORE_MENU_ITEMS, SIDEBAR_ITEMS, type NavItem } from '@/constants/navigation';
import { APP_NAME } from '@/constants/app';
import { ThemedText } from '@/components/ui/ThemedText';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { QuickAddButton } from '@/components/layout/QuickAddButton';
import { MoreMenuSheet } from '@/components/layout/MoreMenuSheet';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Adaptive shell: a persistent left sidebar on desktop/wide web viewports
 * (section 5: "Desktop and web navigation"), a bottom tab bar on narrow
 * mobile viewports (section 5: "Mobile navigation"). Every top-level route
 * segment (tasks, notes, finance, people, ...) renders its own thin
 * `_layout.tsx` that wraps `<Slot />` in this component, so chrome stays
 * identical everywhere without coupling unrelated route groups together.
 */
export function AppShell({ children }: PropsWithChildren) {
  const compact = useCompactLayout();

  return (
    <View style={{ flex: 1 }}>
      {compact ? <MobileShell>{children}</MobileShell> : <DesktopShell>{children}</DesktopShell>}
      <QuickAddButton />
    </View>
  );
}

function DesktopShell({ children }: PropsWithChildren) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View
        style={{
          width: 260,
          borderRightWidth: 1,
          borderRightColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl }}>
          <ThemedText variant="subtitle" weight="bold">
            {APP_NAME}
          </ThemedText>
          <View style={{ gap: spacing.xxs }}>
            {SIDEBAR_ITEMS.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                onPress={() => router.push(item.href)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>
        <OfflineBanner />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

function SidebarLink({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: active
          ? theme.colors.accentSurface
          : pressed
            ? theme.colors.surfaceAlt
            : 'transparent',
      })}
    >
      <Ionicons name={item.icon} size={20} color={active ? theme.colors.primary : theme.colors.textMuted} />
      <ThemedText
        variant="body"
        tone={active ? 'primary' : 'default'}
        weight={active ? 'semibold' : 'regular'}
      >
        {item.label}
      </ThemedText>
    </Pressable>
  );
}

function MobileShell({ children }: PropsWithChildren) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  // "More" is active whenever the current route is one of the overflow
  // screens, so the tab still reflects where you are after the sheet closes.
  const inMoreSection = MORE_MENU_ITEMS.some((item) => isActive(pathname, item.href));

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <View style={{ flex: 1 }}>{children}</View>
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingBottom: insets.bottom,
        }}
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.push(item.href)}
              style={{
                flex: 1,
                minHeight: minTouchTarget + spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                paddingVertical: spacing.xs,
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? theme.colors.primary : theme.colors.textMuted}
              />
              <ThemedText
                style={{ fontSize: fontSize.xs - 1 }}
                tone={active ? 'primary' : 'muted'}
                weight={active ? 'semibold' : 'regular'}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: inMoreSection }}
          accessibilityLabel="More"
          onPress={() => setMoreOpen(true)}
          style={{
            flex: 1,
            minHeight: minTouchTarget + spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingVertical: spacing.xs,
          }}
        >
          <Ionicons
            name="menu-outline"
            size={20}
            color={inMoreSection ? theme.colors.primary : theme.colors.textMuted}
          />
          <ThemedText
            style={{ fontSize: fontSize.xs - 1 }}
            tone={inMoreSection ? 'primary' : 'muted'}
            weight={inMoreSection ? 'semibold' : 'regular'}
          >
            More
          </ThemedText>
        </Pressable>
      </View>

      <MoreMenuSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </View>
  );
}
