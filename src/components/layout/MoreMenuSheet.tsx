import { Pressable, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { activeNavHref, MORE_MENU_SECTIONS } from '@/constants/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ThemedText } from '@/components/ui/ThemedText';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export interface MoreMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet menu for every route that doesn't fit on the mobile tab bar
 * (Settings, Search, Calendar, People, Loans, Investments, ...). Without this,
 * those screens would only be reachable from the desktop sidebar — on a phone
 * there'd be no way to open Settings.
 *
 * Rows are grouped exactly as the desktop sidebar groups them, so the two form
 * factors present the same map of the app rather than one long alphabet soup.
 *
 * `body="flush"` because these rows are full-bleed: the pressed highlight
 * should span the sheet's whole width, not sit inside a gutter.
 */
export function MoreMenuSheet({ visible, onClose }: MoreMenuSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const current = activeNavHref(pathname);

  return (
    <BottomSheet visible={visible} title="Everything else" onClose={onClose} body="flush">
      {MORE_MENU_SECTIONS.map((section) => (
        <View key={section.title} style={{ paddingTop: spacing.md }}>
          <ThemedText
            variant="overline"
            tone="subtle"
            style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}
          >
            {section.title}
          </ThemedText>

          {section.items.map((item) => {
            const active = item.href === current;
            return (
              <Pressable
                key={item.href}
                accessibilityRole="link"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onClose();
                  router.push(item.href);
                }}
                style={(state) => {
                  const { pressed, hovered, focused } = pressState(state);
                  return [
                    {
                      flexDirection: 'row' as const,
                      alignItems: 'center' as const,
                      gap: spacing.md,
                      minHeight: minTouchTarget + spacing.sm,
                      paddingHorizontal: spacing.lg,
                      backgroundColor: pressed || hovered ? theme.colors.surfaceHover : 'transparent',
                    },
                    transition(),
                    clickable(),
                    focusRing(theme.colors.focus, focused, -2),
                  ];
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.colors.accentSurface : theme.colors.surfaceAlt,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={active ? theme.colors.primary : theme.colors.textMuted}
                  />
                </View>
                <ThemedText
                  variant="body"
                  weight={active ? 'semibold' : 'regular'}
                  tone={active ? 'primary' : 'default'}
                  style={{ flex: 1 }}
                >
                  {item.label}
                </ThemedText>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSubtle} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </BottomSheet>
  );
}
