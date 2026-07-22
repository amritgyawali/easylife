import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface FormSheetProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Action row pinned below the scrollable body, e.g. Save / Cancel. */
  footer?: React.ReactNode;
}

/**
 * Modal container used for every create/edit form in the daily-life features.
 *
 * One component rather than a per-feature modal so dismissal, keyboard
 * avoidance and the close affordance behave identically everywhere. It renders
 * as a bottom sheet on mobile and a centred dialog on wide viewports, and the
 * body scrolls independently of the footer so long forms never push the save
 * button off-screen.
 */
export function FormSheet({ visible, title, onClose, footer, children }: FormSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        {/* Tapping the scrim dismisses, matching the platform convention. */}
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ maxHeight: '90%' }}
        >
          <View
            style={{
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
                {title}
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

            <ScrollView
              contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
