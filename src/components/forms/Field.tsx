import type { PropsWithChildren, ReactNode } from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';

import { controlHeight, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { Theme } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface FieldProps extends PropsWithChildren {
  label: string;
  /** Validation message. Takes the place of `helpText` while present. */
  error?: string | null;
  helpText?: string;
  /** Marks the field required and appends a visible asterisk to the label. */
  required?: boolean;
  /** Trailing control on the label row, e.g. a "Use today" shortcut. */
  action?: ReactNode;
}

/**
 * Label / control / message chrome shared by every field in the app.
 *
 * Each field type only has to render its own control; the label typography,
 * the gap above it, the error colour and the live-region announcement all
 * come from here. That is what makes a money field, a date field and a plain
 * text field look like members of the same form rather than three separate
 * ones — and it means an accessibility fix lands everywhere at once.
 */
export function Field({ label, error, helpText, required, action, children }: FieldProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <ThemedText variant="label" tone="muted" weight="medium">
          {label}
          {required ? (
            <ThemedText variant="label" tone="negative">
              {' *'}
            </ThemedText>
          ) : null}
        </ThemedText>
        {action}
      </View>

      {children}

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : helpText ? (
        <ThemedText variant="caption" tone="subtle">
          {helpText}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * The container treatment for every input surface — text boxes, money fields,
 * selects and the search box.
 *
 * A focused input gets a doubled border in the accent colour rather than a
 * platform outline, so focus is equally visible on web, iOS and Android, and
 * an invalid one is outlined in the negative colour *and* paired with the
 * message `Field` renders, never colour alone.
 */
export function inputSurface(
  theme: Theme,
  { focused = false, invalid = false, disabled = false } = {}
): ViewStyle {
  return {
    borderWidth: focused ? 2 : 1,
    borderColor: invalid ? theme.colors.negative : focused ? theme.colors.focus : theme.colors.border,
    borderRadius: radius.md,
    backgroundColor: disabled ? theme.colors.surfaceAlt : theme.colors.surface,
    // Keeps text from shifting by a pixel when the border thickens on focus.
    paddingHorizontal: focused ? spacing.md - 1 : spacing.md,
    opacity: disabled ? 0.6 : 1,
  };
}

/**
 * Text styling for the editable element inside an `inputSurface`. The 16px
 * floor is load-bearing: below it, iOS Safari zooms the whole page in on
 * focus with no way back out except pinching.
 */
export function inputText(theme: Theme): TextStyle {
  return {
    flex: 1,
    color: theme.colors.text,
    fontFamily: fontFamily.sans,
    fontSize: Math.max(fontSize.md, 16),
    minHeight: controlHeight.md,
  };
}
