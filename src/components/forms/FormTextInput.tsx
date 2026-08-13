import { TextInput, type TextInputProps } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import { useTheme } from '@/hooks/useTheme';
import { Field, inputChrome, useFieldFocus } from '@/components/forms/Field';

export interface FormTextInputProps extends Omit<TextInputProps, 'style'> {
  name: string;
  label: string;
  helpText?: string;
  required?: boolean;
  size?: 'md' | 'lg';
}

/**
 * Standard text field wired to react-hook-form context. Renders the label,
 * the input, and — when present — a validation error, with the error
 * announced to screen readers (via `Field`'s live region) and the input
 * marked invalid for assistive tech, satisfying "form-error announcements"
 * in the accessibility requirements.
 */
export function FormTextInput({ name, label, helpText, required, size, ...inputProps }: FormTextInputProps) {
  const theme = useTheme();
  const { control } = useFormContext();
  const focus = useFieldFocus();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Field
          label={label}
          helpText={helpText}
          required={required}
          error={error?.message ?? null}
          nativeID={`${name}-label`}
        >
          <TextInput
            accessibilityLabelledBy={`${name}-label`}
            accessibilityState={{ disabled: inputProps.editable === false }}
            aria-invalid={Boolean(error)}
            style={inputChrome(theme, {
              focused: focus.focused,
              invalid: Boolean(error),
              disabled: inputProps.editable === false,
              size,
            })}
            placeholderTextColor={theme.colors.textMuted}
            onFocus={focus.onFocus}
            onBlur={() => {
              focus.onBlur();
              onBlur();
            }}
            onChangeText={onChange}
            value={typeof value === 'string' ? value : ''}
            {...inputProps}
          />
        </Field>
      )}
    />
  );
}
