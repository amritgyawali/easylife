import { useState, type PropsWithChildren } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useCompactLayout';
import { useThemeStore } from '@/stores/theme-store';
import { useUiStore } from '@/stores/ui-store';
import { layout, minTouchTarget, radius, spacing } from '@/constants/theme';
import {
  MOBILE_TABS,
  MORE_MENU_ITEMS,
  NAV_SECTIONS,
  UTILITY_ITEMS,
  type NavItem,
} from '@/constants/navigation';
import { APP_NAME } from '@/constants/app';
import { ThemedText } from '@/components/ui/ThemedText';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { QuickAddButton, QuickAddProvider, useQuickCapture } from '@/components/layout/QuickAddButton';
import { MoreMenuSheet } from '@/components/layout/MoreMenuSheet';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Adaptive shell: a persistent left sidebar plus a top bar on desktop/wide web
 * viewports, a bottom tab bar on narrow mobile viewports. Every top-level
 * route segment (tasks, notes, finance, people, ...) renders its own thin
 * `_layout.tsx` that wraps `<Slot />` in this component, so chrome stays
 * identical everywhere without coupling unrelated route groups together.
 */
export function AppShell({ children }: PropsWithChildren) {
  const { compact } = useLayout();

  return (
    <QuickAddProvider>
      <View style={{ flex: 1 }}>
        {compact ? <MobileShell>{children}</MobileShell> : <DesktopShell>{children}</DesktopShell>}
        <QuickAddButton />
      </View>
    </QuickAddProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop                                                                     */
/* -------------------------------------------------------------------------- */

function DesktopShell({ children }: PropsWithChildren) {
  const theme = useTheme();
  const { expanded } = useLayout();
  const collapsedPreference = useUiStore((state) => state.sidebarCollapsed);

  // Below the `lg` breakpoint there simply isn't room for a 260px sidebar next
  // to a readable content column, so the rail is forced regardless of the
  // user's preference; above it, their choice wins.
  const collapsed = !expanded || collapsedPreference;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
      <Sidebar collapsed={collapsed} canToggle={expanded} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar />
        <OfflineBanner />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

function Sidebar({ collapsed, canToggle }: { collapsed: boolean; canToggle: boolean }) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <View
      style={{
        width: collapsed ? layout.sidebarRailWidth : layout.sidebarWidth,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          height: layout.topBarHeight,
          paddingHorizontal: collapsed ? spacing.md : spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primary,
          }}
        >
          <Ionicons name="layers" size={17} color={theme.colors.primaryText} />
        </View>
        {!collapsed ? (
          <ThemedText variant="body" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
            {APP_NAME}
          </ThemedText>
        ) : null}
        {canToggle && !collapsed ? (
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Collapse sidebar"
            onPress={toggleSidebar}
            control="sm"
            size={16}
          />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: collapsed ? spacing.sm : spacing.md,
          gap: spacing.lg,
          paddingBottom: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {NAV_SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: spacing.xxs }}>
            {!collapsed ? (
              <ThemedText
                variant="overline"
                tone="subtle"
                style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}
              >
                {section.title}
              </ThemedText>
            ) : null}
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(pathname, item.href)}
                onPress={() => router.push(item.href)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          gap: spacing.xxs,
          padding: collapsed ? spacing.sm : spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        {UTILITY_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(pathname, item.href)}
            onPress={() => router.push(item.href)}
          />
        ))}
        {canToggle && collapsed ? (
          <SidebarLink
            item={{ label: 'Expand', href: '#expand', icon: 'chevron-forward' }}
            collapsed={collapsed}
            active={false}
            onPress={toggleSidebar}
          />
        ) : null}
      </View>
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

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      // `title` gives the icon rail a native tooltip on web, which is the only
      // way to learn what a bare icon means without expanding the sidebar.
      {...(Platform.OS === 'web' && collapsed ? { title: item.label } : null)}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            justifyContent: collapsed ? ('center' as const) : ('flex-start' as const),
            gap: spacing.md,
            minHeight: collapsed ? 44 : 40,
            paddingHorizontal: collapsed ? 0 : spacing.md,
            borderRadius: radius.md,
            backgroundColor: active
              ? theme.colors.accentSurface
              : pressed || hovered
                ? theme.colors.surfaceHover
                : 'transparent',
          },
          transition(),
          clickable(),
          focusRing(theme.colors.focus, focused),
        ];
      }}
    >
      <Ionicons
        name={item.icon}
        size={collapsed ? 21 : 19}
        color={active ? theme.colors.primary : theme.colors.textMuted}
      />
      {!collapsed ? (
        <ThemedText
          variant="label"
          tone={active ? 'primary' : 'default'}
          weight={active ? 'semibold' : 'medium'}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {item.label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

/**
 * Desktop top bar: global search, theme switch, and the quick-add action.
 *
 * These are the three controls that belong to the app rather than to any one
 * screen. On a phone they live on the tab bar and in the FAB; giving them a
 * fixed home on desktop keeps them one click away without a floating button
 * hovering over a wide window.
 */
function TopBar() {
  const theme = useTheme();
  const router = useRouter();
  const { open } = useQuickCapture();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const nextPreference = theme.mode === 'dark' ? 'light' : 'dark';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        height: layout.topBarHeight,
        paddingHorizontal: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search everything"
        onPress={() => router.push('/search')}
        style={(state) => {
          const { hovered, focused } = pressState(state);
          return [
            {
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              gap: spacing.sm,
              flex: 1,
              maxWidth: 420,
              height: 36,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hovered ? theme.colors.borderStrong : theme.colors.border,
              backgroundColor: hovered ? theme.colors.surfaceHover : theme.colors.surfaceAlt,
            },
            transition(),
            clickable(),
            focusRing(theme.colors.focus, focused),
          ];
        }}
      >
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <ThemedText variant="label" tone="muted">
          Search tasks, notes, money…
        </ThemedText>
      </Pressable>

      <View style={{ flex: 1 }} />

      <IconButton
        icon={theme.mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
        accessibilityLabel={`Switch to ${nextPreference} theme`}
        onPress={() => setPreference(preference === nextPreference ? 'system' : nextPreference)}
      />
      <Button label="New" icon="add" size="sm" onPress={open} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile                                                                      */
/* -------------------------------------------------------------------------- */

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
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingBottom: insets.bottom,
          paddingTop: spacing.xs,
          paddingHorizontal: spacing.xs,
        }}
      >
        {MOBILE_TABS.map((item) => (
          <TabButton
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onPress={() => router.push(item.href)}
          />
        ))}
        <TabButton
          item={{ label: 'More', href: '#more', icon: 'ellipsis-horizontal' }}
          active={inMoreSection || moreOpen}
          onPress={() => setMoreOpen(true)}
        />
      </View>

      <MoreMenuSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </View>
  );
}

/**
 * One bottom-tab target. The active state is a filled pill behind the icon in
 * addition to the colour change, so which tab you are on is legible without
 * relying on hue — the same rule the rest of the app follows for status.
 */
function TabButton({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={(state) => {
        const { pressed } = pressState(state);
        return [
          {
            flex: 1,
            minHeight: minTouchTarget,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            gap: 3,
            paddingBottom: spacing.xs,
            opacity: pressed ? 0.65 : 1,
          },
          clickable(),
        ];
      }}
    >
      <View
        style={[
          {
            minWidth: 52,
            height: 26,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? theme.colors.accentSurface : 'transparent',
          },
          transition(),
        ]}
      >
        <Ionicons
          name={item.icon}
          size={19}
          color={active ? theme.colors.primary : theme.colors.textMuted}
        />
      </View>
      <ThemedText
        variant="caption"
        tone={active ? 'primary' : 'muted'}
        weight={active ? 'semibold' : 'regular'}
        numberOfLines={1}
        style={{ fontSize: 11 }}
      >
        {item.label}
      </ThemedText>
    </Pressable>
  );
}
