import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { MORE_MENU_ITEMS } from '@/constants/navigation';
import { ThemedText } from '@/components/ui/ThemedText';

export interface MoreMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet menu for every route that doesn't fit on the 5-item mobile tab
 * bar (Settings, Search, Calendar, People, Loans, Investments, ...). Without
 * this, those screens (`MORE_MENU_ITEMS` in navigation.ts) were only reachable
 * on the desktop sidebar — on a phone there was no way to open Settings at all.
 */
export function MoreMenuSheet({ visible, onClose }: MoreMenuSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: '80%',
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderTopWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <ThemedText variant="subtitle" accessibilityRole="header">
              More
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}
              style={{
                minWidth: minTouchTarget,
                minHeight: minTouchTarget,
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}>
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
                  minHeight: minTouchTarget + spacing.md,
                  paddingHorizontal: spacing.lg,
                  backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
                })}
              >
                <Ionicons name={item.icon} size={22} color={theme.colors.textMuted} />
                <ThemedText variant="body" style={{ flex: 1 }}>
                  {item.label}
                </ThemedText>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
