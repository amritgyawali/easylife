import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { ThemedText } from '@/components/ui/ThemedText';

export interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Action row pinned below the scrollable body, e.g. Save / Cancel. */
  footer?: ReactNode;
  /**
   * `padded` (default) gutters the body for form fields. `flush` removes the
   * gutters so full-bleed rows — a menu list, say — can span edge to edge.
   */
  body?: 'padded' | 'flush';
}

/** Share of the visible viewport a sheet may occupy before its body scrolls. */
const MAX_HEIGHT_RATIO = 0.9;
const COMPACT_MAX_HEIGHT_RATIO = 0.84;

/**
 * The one modal shell every bottom sheet in the app is built on.
 *
 * Consolidated so the three things that are easy to get subtly wrong on mobile
 * live in exactly one place:
 *
 * 1. **Height tracks the *visible* viewport, not the layout viewport.**
 *    react-native-web renders `Modal` as a `position: fixed` overlay, which
 *    mobile browsers pin to the layout viewport — and that does *not* shrink
 *    when the on-screen keyboard opens. A `flex: 1` scrim therefore keeps its
 *    full pre-keyboard height and pushes the footer (the Save button) below
 *    the fold, behind the keyboard. `useVisualViewport` follows the complete
 *    visible rectangle instead, so the footer stays reachable while typing.
 *
 * 2. **The body is the only part allowed to shrink.** Flex children default to
 *    a minimum size of their *content*, so a form taller than the sheet won't
 *    shrink to fit `maxHeight` — it overflows and drags the footer off-screen
 *    with it. `flexShrink: 1` + `minHeight: 0` on the body (and `overflow:
 *    'hidden'` to contain the paint) makes the scroll area absorb the excess
 *    while the header and footer keep their natural height.
 *
 * 3. **Safe-area insets.** Bottom padding clears the iOS home indicator,
 *    applied to whichever element is actually last (footer, or body when
 *    there is no footer).
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  footer,
  body = 'padded',
  children,
}: BottomSheetProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const insets = useSafeAreaInsets();
  const visualViewport = useVisualViewport();
  const sheetSpacing = compact ? spacing.md : spacing.lg;
  const maxHeightRatio = compact ? COMPACT_MAX_HEIGHT_RATIO : MAX_HEIGHT_RATIO;

  // Reason (1). Null on native and on browsers without visualViewport, where
  // filling the parent is already correct.
  const scrim =
    visualViewport != null
      ? {
          position: 'absolute' as const,
          top: visualViewport.top,
          left: visualViewport.left,
          width: visualViewport.width,
          height: visualViewport.height,
        }
      : { flex: 1 };

  // Reason (3). Only the last element carries it, so it is never doubled.
  const safeBottom = Math.max(sheetSpacing, insets.bottom);

  return (
    <Modal
      visible={visible}
      transparent
      // react-native-web's slide animation leaves a transformed fixed layer,
      // which compounds Safari's keyboard viewport bugs. Native keeps the
      // platform-conventional slide; web uses a compositor-safe fade.
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[scrim, { backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }]}>
        {/* Tapping the scrim dismisses, matching the platform convention. */}
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <KeyboardAvoidingView
          // `padding` makes the entire sheet rise by the keyboard height on
          // iOS. Reducing its height instead keeps the header/footer anchored
          // and gives the lost space to the scrollable form body.
          behavior={Platform.OS === 'ios' ? 'height' : undefined}
          style={{
            maxHeight: `${maxHeightRatio * 100}%`,
            marginHorizontal: compact ? spacing.sm : 0,
            overflow: 'hidden',
          }}
        >
          {/* Reason (2): shrink to the shell rather than to this content. */}
          <View
            style={{
              flexShrink: 1,
              minHeight: 0,
              overflow: 'hidden',
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: compact ? radius.lg : radius.xl,
              borderTopRightRadius: compact ? radius.lg : radius.xl,
              borderTopWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: sheetSpacing,
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

            {/* Reason (2): the one region that may shrink below its content. */}
            <ScrollView
              style={{ flexShrink: 1, minHeight: 0 }}
              contentContainerStyle={
                body === 'flush'
                  ? { paddingBottom: footer ? 0 : safeBottom }
                  : {
                      padding: sheetSpacing,
                      gap: sheetSpacing,
                      paddingBottom: footer ? sheetSpacing : safeBottom,
                    }
              }
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  padding: sheetSpacing,
                  paddingBottom: safeBottom,
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
