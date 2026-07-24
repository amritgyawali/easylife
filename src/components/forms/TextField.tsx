import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { fontSize, minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  helpText?: string;
  multiline?: boolean;
}

/**
 * Controlled text field for the lightweight `useState` forms in the
 * daily-life features. `FormTextInput` covers the react-hook-form path used by
 * auth; this is the same visual treatment without requiring a form context for
 * what are often one- or two-field sheets.
 */
export function TextField({ label, error, helpText, multiline, autoFocus, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const compact = useCompactLayout();

  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="label" tone="muted">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        multiline={multiline}
        style={{
          minHeight: multiline ? minTouchTarget * 2.5 : minTouchTarget,
          borderWidth: 1,
          borderColor: error ? theme.colors.negative : theme.colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingTop: multiline ? spacing.sm : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          color: theme.colors.text,
          backgroundColor: theme.colors.surface,
          // Below 16px, iOS Safari zooms the whole page in on focus — with no
          // way back out except scrolling/pinching manually. Every text field
          // in the app must stay at 16px+ or that happens on every form sheet.
          fontSize: fontSize.md,
        }}
        placeholderTextColor={theme.colors.textMuted}
        // Opening the software keyboard during the sheet animation makes the
        // entire form jump on iOS. On a phone, let the user see the field and
        // pinned submit action first, then open the keyboard on an intentional
        // tap. Desktop keeps the faster auto-focus workflow.
        autoFocus={!compact && autoFocus}
        {...inputProps}
      />
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
