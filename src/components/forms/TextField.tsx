import { TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { Field, inputChrome, useFieldFocus } from '@/components/forms/Field';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  helpText?: string;
  multiline?: boolean;
  required?: boolean;
  size?: 'md' | 'lg';
}

/**
 * Controlled text field for the lightweight `useState` forms in the
 * daily-life features. `FormTextInput` covers the react-hook-form path used by
 * auth; this is the same visual treatment without requiring a form context for
 * what are often one- or two-field sheets.
 */
export function TextField({
  label,
  error,
  helpText,
  multiline,
  required,
  size,
  autoFocus,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const focus = useFieldFocus();

  return (
    <Field label={label} error={error} helpText={helpText} required={required}>
      <TextInput
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        multiline={multiline}
        style={inputChrome(theme, {
          focused: focus.focused,
          invalid: Boolean(error),
          multiline,
          disabled: inputProps.editable === false,
          size,
        })}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={(event) => {
          focus.onFocus();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focus.onBlur();
          onBlur?.(event);
        }}
        // Opening the software keyboard during the sheet animation makes the
        // entire form jump on iOS. On a phone, let the user see the field and
        // pinned submit action first, then open the keyboard on an intentional
        // tap. Desktop keeps the faster auto-focus workflow.
        autoFocus={!compact && autoFocus}
        {...inputProps}
      />
    </Field>
  );
}
