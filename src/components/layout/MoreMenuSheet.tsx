import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, spacing } from '@/constants/theme';
import { MORE_MENU_ITEMS } from '@/constants/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ThemedText } from '@/components/ui/ThemedText';

export interface MoreMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet menu for every route that doesn't fit on the mobile tab bar
 * (Settings, Search, Calendar, People, Loans, Investments, ...). Without this,
 * those screens (`MORE_MENU_ITEMS` in navigation.ts) would only be reachable
 * from the desktop sidebar — on a phone there'd be no way to open Settings.
 *
 * `body="flush"` because these rows are full-bleed: the pressed highlight
 * should span the sheet's whole width, not sit inside a gutter.
 */
export function MoreMenuSheet({ visible, onClose }: MoreMenuSheetProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <BottomSheet visible={visible} title="More" onClose={onClose} body="flush">
      {MORE_MENU_ITEMS.map((item) => (
        <Pressable
          key={item.href}
          accessibilityRole="button"
          onPress={() => {
            onClose();
            router.push(item.href);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: minTouchTarget + spacing.xs,
            paddingHorizontal: spacing.md,
            backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
          })}
        >
          <Ionicons name={item.icon} size={20} color={theme.colors.textMuted} />
          <ThemedText variant="body" style={{ flex: 1 }}>
            {item.label}
          </ThemedText>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ))}
    </BottomSheet>
  );
}
