import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
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
export function TextField({ label, error, helpText, multiline, ...inputProps }: TextFieldProps) {
  const theme = useTheme();

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
        }}
        placeholderTextColor={theme.colors.textMuted}
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
