import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useCompactLayout';
import { radius, spacing } from '@/constants/theme';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconButton } from '@/components/ui/IconButton';

export interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  title: string;
  /** Optional line under the title explaining what the form does. */
  subtitle?: string;
  onClose: () => void;
  /** Action row pinned below the scrollable body, e.g. Save / Cancel. */
  footer?: ReactNode;
  /**
   * `padded` (default) gutters the body for form fields. `flush` removes the
   * gutters so full-bleed rows — a menu list, say — can span edge to edge.
   */
  body?: 'padded' | 'flush';
  /** Dialog width on desktop. `lg` suits two-column forms (imports, scan). */
  size?: 'md' | 'lg';
}

/** Share of the visible viewport a sheet may occupy before its body scrolls. */
const MAX_HEIGHT_RATIO = 0.9;
const COMPACT_MAX_HEIGHT_RATIO = 0.84;

const DIALOG_WIDTH = { md: 560, lg: 760 } as const;

/**
 * The one modal shell every sheet and dialog in the app is built on.
 *
 * It presents differently by form factor, because the same presentation is
 * wrong on both: on a phone it is a bottom sheet, anchored to the thumb, with
 * a grab handle and safe-area padding; on a desktop viewport it is a centred
 * dialog with a capped width, because a full-width sheet glued to the bottom
 * of a 1600px window is neither reachable nor readable.
 *
 * Consolidated here so the three things that are easy to get subtly wrong on
 * mobile live in exactly one place:
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
  subtitle,
  onClose,
  footer,
  body = 'padded',
  size = 'md',
  children,
}: BottomSheetProps) {
  const theme = useTheme();
  const { compact } = useLayout();
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
  const safeBottom = compact ? Math.max(sheetSpacing, insets.bottom) : sheetSpacing;

  const panelRadius = compact
    ? { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }
    : { borderRadius: radius.lg };

  return (
    <Modal
      visible={visible}
      transparent
      // react-native-web's slide animation leaves a transformed fixed layer,
      // which compounds Safari's keyboard viewport bugs. Native keeps the
      // platform-conventional slide; web uses a compositor-safe fade.
      animationType={Platform.OS === 'web' ? 'fade' : compact ? 'slide' : 'fade'}
      onRequestClose={onClose}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <View
        style={[
          scrim,
          {
            backgroundColor: theme.colors.overlay,
            justifyContent: compact ? 'flex-end' : 'center',
            alignItems: compact ? 'stretch' : 'center',
            padding: compact ? 0 : spacing.xl,
          },
        ]}
      >
        {/* Tapping the scrim dismisses, matching the platform convention. */}
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <KeyboardAvoidingView
          // `padding` makes the entire sheet rise by the keyboard height on
          // iOS. Reducing its height instead keeps the header/footer anchored
          // and gives the lost space to the scrollable form body.
          behavior={Platform.OS === 'ios' ? 'height' : undefined}
          style={{
            maxHeight: `${maxHeightRatio * 100}%`,
            width: compact ? '100%' : '100%',
            maxWidth: compact ? undefined : DIALOG_WIDTH[size],
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
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...panelRadius,
              ...theme.elevation.lg,
            }}
          >
            {compact ? (
              <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: radius.full,
                    backgroundColor: theme.colors.borderStrong,
                  }}
                />
              </View>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing.md,
                padding: sheetSpacing,
                paddingBottom: subtitle ? sheetSpacing : spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <ThemedText variant="subtitle" accessibilityRole="header">
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText variant="label" tone="muted">
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
              <View style={{ marginTop: -spacing.xs, marginRight: -spacing.sm }}>
                <IconButton
                  icon="close"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  tone="muted"
                  size={22}
                />
              </View>
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
                  backgroundColor: theme.colors.surface,
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
