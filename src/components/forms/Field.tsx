import { useCallback, useState, type ReactNode } from 'react';
import { View, type TextStyle } from 'react-native';

import { controlHeight, fontSize, radius, spacing, type Theme } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { webStyle } from '@/utils/interaction';

export interface FieldProps {
  label?: string;
  /** Marks the field required, both visually and for assistive tech. */
  required?: boolean;
  helpText?: string;
  error?: string | null;
  /** Right-aligned affordance beside the label, e.g. a "Clear" link. */
  labelAction?: ReactNode;
  children: ReactNode;
  nativeID?: string;
}

/**
 * Label / control / message wrapper shared by every field in the app.
 *
 * Before this, each field re-implemented its own label and error line, and
 * they drifted: different gaps, different tones, some showing help text below
 * an error and some replacing it. Centralising it also guarantees the error is
 * announced (`accessibilityLiveRegion`) no matter which field type raised it.
 */
export function Field({
  label,
  required = false,
  helpText,
  error,
  labelAction,
  children,
  nativeID,
}: FieldProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText variant="label" weight="medium" nativeID={nativeID} style={{ flex: 1 }}>
            {label}
            {required ? (
              <ThemedText variant="label" tone="negative">
                {' *'}
              </ThemedText>
            ) : null}
          </ThemedText>
          {labelAction}
        </View>
      ) : null}

      {children}

      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : helpText ? (
        <ThemedText variant="caption" tone="muted">
          {helpText}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Focus tracking for a text control, so its border can respond to focus. */
export function useFieldFocus() {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, onFocus, onBlur };
}

export interface InputChromeOptions {
  focused?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  /** Uses the taller control height — for prominent single-field forms. */
  size?: 'md' | 'lg';
}

/**
 * The visual shell of a text control: height, radius, border, and the focus
 * ring. Returned as a plain style object so it can dress a `TextInput`
 * directly or a `View` wrapping one (the money field's currency prefix, the
 * search field's icon).
 *
 * The 16px minimum font size is not cosmetic: below it, iOS Safari zooms the
 * whole page in the moment the field is focused, with no way back out except
 * pinching — so every text field in the app must stay at 16px or larger.
 */
export function inputChrome(
  theme: Theme,
  {
    focused = false,
    invalid = false,
    disabled = false,
    multiline = false,
    size = 'md',
  }: InputChromeOptions = {}
): TextStyle {
  const borderColor = invalid ? theme.colors.negative : focused ? theme.colors.primary : theme.colors.border;

  return {
    minHeight: multiline ? controlHeight.md * 2.4 : size === 'lg' ? controlHeight.lg : controlHeight.md,
    borderWidth: 1,
    borderColor,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: multiline ? spacing.md : spacing.sm,
    color: disabled ? theme.colors.textMuted : theme.colors.text,
    backgroundColor: disabled ? theme.colors.surfaceAlt : theme.colors.surface,
    textAlignVertical: multiline ? 'top' : 'center',
    fontSize: fontSize.md,
    lineHeight: multiline ? Math.round(fontSize.md * 1.45) : undefined,
    ...webStyle({
      outlineStyle: 'none',
      transitionProperty: 'border-color, box-shadow, background-color',
      transitionDuration: '140ms',
      // A ring rather than a thicker border: a border change would reflow the
      // input by a pixel on focus and shift the whole form.
      boxShadow: focused
        ? `0 0 0 3px ${invalid ? withAlpha(theme.colors.negative) : withAlpha(theme.colors.primary)}`
        : 'none',
    }),
  };
}

/** 22% alpha on a hex colour, for focus rings. */
function withAlpha(hex: string): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  return `${hex}38`;
}
