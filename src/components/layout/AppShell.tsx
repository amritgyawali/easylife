import { useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { useHover } from '@/hooks/useHover';
import { useNavStore } from '@/stores/nav-store';
import { useThemeStore } from '@/stores/theme-store';
import { elevation, fontSize, layout, minTouchTarget, radius, spacing, transition } from '@/constants/theme';
import { MOBILE_TABS, MORE_MENU_ITEMS, NAV_GROUPS, type NavItem } from '@/constants/navigation';
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
    </View>
  );
}

/* ------------------------------------------------------------------ desktop */

function DesktopShell({ children }: PropsWithChildren) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useNavStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useNavStore((state) => state.toggleSidebar);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
      <View
        accessibilityLabel="Main navigation"
        style={[
          {
            width: collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth,
            borderRightWidth: 1,
            borderRightColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceNav,
          },
          transition('width'),
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: collapsed ? spacing.md : spacing.lg,
            height: layout.topBarHeight,
          }}
        >
          <BrandMark />
          {collapsed ? null : (
            <ThemedText variant="body" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
              {APP_NAME}
            </ThemedText>
          )}
        </View>

        <View
          style={{
            paddingHorizontal: collapsed ? spacing.sm : spacing.md,
            paddingBottom: spacing.md,
          }}
        >
          <QuickAddButton placement="sidebar" />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: collapsed ? spacing.sm : spacing.md,
            paddingBottom: spacing.lg,
            gap: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {NAV_GROUPS.map((group) => (
            <View key={group.title} style={{ gap: spacing.xxs }}>
              {collapsed ? (
                <View
                  style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: spacing.sm }}
                />
              ) : (
                <ThemedText
                  variant="overline"
                  tone="subtle"
                  style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}
                >
                  {group.title}
                </ThemedText>
              )}
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  collapsed={collapsed}
                  onPress={() => router.push(item.href)}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            padding: collapsed ? spacing.sm : spacing.md,
            gap: spacing.xxs,
          }}
        >
          <ThemeToggle collapsed={collapsed} />
          <SidebarButton
            icon={collapsed ? 'chevron-forward' : 'chevron-back'}
            label={collapsed ? 'Expand' : 'Collapse'}
            collapsed={collapsed}
            onPress={toggleSidebar}
          />
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <OfflineBanner />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

/** The app's monogram — a filled tile so the sidebar has one anchor point. */
function BrandMark() {
  const theme = useTheme();

  return (
    <View
      accessible={false}
      style={[
        {
          width: 30,
          height: 30,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        },
        elevation('sm', theme.mode),
      ]}
    >
      <ThemedText variant="caption" weight="bold" style={{ color: theme.colors.primaryText }}>
        {APP_NAME.slice(0, 1).toUpperCase()}
      </ThemedText>
    </View>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: minTouchTarget - spacing.xs,
          paddingHorizontal: collapsed ? 0 : spacing.md,
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: radius.md,
          backgroundColor: active
            ? theme.colors.accentSurface
            : pressed || hovered
              ? theme.colors.surfaceAlt
              : 'transparent',
        },
        transition(),
      ]}
    >
      <Ionicons name={item.icon} size={19} color={active ? theme.colors.primary : theme.colors.textMuted} />
      {collapsed ? null : (
        <ThemedText
          variant="label"
          tone={active ? 'primary' : 'default'}
          weight={active ? 'semibold' : 'medium'}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {item.label}
        </ThemedText>
      )}
    </Pressable>
  );
}

function SidebarButton({
  icon,
  label,
  collapsed,
  onPress,
}: {
  icon: NavItem['icon'];
  label: string;
  collapsed: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: minTouchTarget - spacing.xs,
          paddingHorizontal: collapsed ? 0 : spacing.md,
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: radius.md,
          backgroundColor: pressed || hovered ? theme.colors.surfaceAlt : 'transparent',
        },
        transition(),
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      {collapsed ? null : (
        <ThemedText variant="label" tone="muted" weight="medium" numberOfLines={1}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

/**
 * Cycles light → dark → follow-the-system. Kept in the sidebar footer rather
 * than buried in Settings because switching theme is something people do by
 * time of day, not once during setup.
 */
function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const next = preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light';
  const icon =
    preference === 'light' ? 'sunny-outline' : preference === 'dark' ? 'moon-outline' : 'contrast-outline';
  const label = preference === 'light' ? 'Light' : preference === 'dark' ? 'Dark' : 'System theme';

  return (
    <SidebarButton icon={icon} label={label} collapsed={collapsed} onPress={() => setPreference(next)} />
  );
}

/* ------------------------------------------------------------------- mobile */

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
        accessibilityRole="tablist"
        style={[
          {
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceNav,
            paddingTop: spacing.xs,
            paddingBottom: insets.bottom,
            paddingHorizontal: spacing.xs,
          },
          elevation('lg', theme.mode),
        ]}
      >
        {MOBILE_TABS.map((item) => (
          <TabButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(pathname, item.href)}
            onPress={() => router.push(item.href)}
          />
        ))}
        <TabButton
          icon="ellipsis-horizontal"
          label="More"
          active={inMoreSection}
          onPress={() => setMoreOpen(true)}
        />
      </View>

      <QuickAddButton />

      <MoreMenuSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </View>
  );
}

/**
 * A tab whose active state is carried by a filled pill behind the icon, not
 * by colour alone — the shape reads at a glance and survives both themes and
 * colour-vision differences.
 */
function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: NavItem['icon'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: minTouchTarget + spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingVertical: spacing.xxs,
      }}
    >
      <View
        style={[
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.xs,
            borderRadius: radius.full,
            backgroundColor: active ? theme.colors.accentSurface : 'transparent',
          },
          transition(),
        ]}
      >
        <Ionicons name={icon} size={20} color={active ? theme.colors.primary : theme.colors.textMuted} />
      </View>
      <ThemedText
        style={{ fontSize: fontSize.xs - 1 }}
        tone={active ? 'primary' : 'muted'}
        weight={active ? 'semibold' : 'medium'}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
