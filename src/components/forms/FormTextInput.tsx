import { TextInput, View, type TextInputProps } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface FormTextInputProps extends Omit<TextInputProps, 'style'> {
  name: string;
  label: string;
  helpText?: string;
}

/**
 * Standard text field wired to react-hook-form context. Renders the label,
 * the input, and — when present — a validation error, with the error
 * announced to screen readers (accessibilityLiveRegion) and the input
 * marked invalid for assistive tech, satisfying "form-error announcements"
 * in the accessibility requirements.
 */
export function FormTextInput({ name, label, helpText, ...inputProps }: FormTextInputProps) {
  const theme = useTheme();
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted" nativeID={`${name}-label`}>
            {label}
          </ThemedText>
          <TextInput
            accessibilityLabelledBy={`${name}-label`}
            accessibilityState={{ disabled: inputProps.editable === false }}
            aria-invalid={Boolean(error)}
            style={{
              minHeight: minTouchTarget,
              borderWidth: 1,
              borderColor: error ? theme.colors.negative : theme.colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            }}
            placeholderTextColor={theme.colors.textMuted}
            onBlur={onBlur}
            onChangeText={onChange}
            value={typeof value === 'string' ? value : ''}
            {...inputProps}
          />
          {error ? (
            <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
              {error.message}
            </ThemedText>
          ) : helpText ? (
            <ThemedText variant="caption" tone="muted">
              {helpText}
            </ThemedText>
          ) : null}
        </View>
      )}
    />
  );
}
