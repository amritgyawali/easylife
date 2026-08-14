import { Pressable, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, transition } from '@/constants/theme';
import { MORE_MENU_GROUPS, type NavItem } from '@/constants/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ThemedText } from '@/components/ui/ThemedText';

export interface MoreMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Menu for every route that doesn't fit on the mobile tab bar (Settings,
 * Search, Calendar, People, Loans, Investments, ...). Without this, those
 * screens would only be reachable from the desktop sidebar — on a phone
 * there'd be no way to open Settings.
 *
 * Laid out as a grid rather than a list: seventeen destinations as full-width
 * rows is two screens of scrolling, while three-up tiles fit almost all of it
 * above the fold, and the section headings give the eye somewhere to land.
 */
export function MoreMenuSheet({ visible, onClose }: MoreMenuSheetProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <BottomSheet visible={visible} title="More" subtitle="Everything else in your LifeOS" onClose={onClose}>
      {MORE_MENU_GROUPS.map((group) => (
        <View key={group.title} style={{ gap: spacing.sm }}>
          <ThemedText variant="overline" tone="subtle">
            {group.title}
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {group.items.map((item) => (
              <MenuTile
                key={item.href}
                item={item}
                active={pathname === item.href}
                onPress={() => {
                  onClose();
                  router.push(item.href);
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </BottomSheet>
  );
}

function MenuTile({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          // Three per row on a 360px phone, growing to four on a tablet.
          flexGrow: 1,
          flexBasis: 96,
          maxWidth: 160,
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
        },
        transition(),
      ]}
    >
      <View
        accessible={false}
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.colors.accentSurface : theme.colors.surfaceAlt,
        }}
      >
        <Ionicons name={item.icon} size={18} color={active ? theme.colors.primary : theme.colors.textMuted} />
      </View>
      <ThemedText
        variant="caption"
        weight={active ? 'semibold' : 'medium'}
        tone={active ? 'primary' : 'default'}
        numberOfLines={2}
        style={{ textAlign: 'center' }}
      >
        {item.label}
      </ThemedText>
    </Pressable>
  );
}
