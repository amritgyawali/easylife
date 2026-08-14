import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import { useTheme } from '@/hooks/useTheme';
import { transition } from '@/constants/theme';
import { Field, inputSurface, inputText } from '@/components/forms/Field';

export interface FormTextInputProps extends Omit<TextInputProps, 'style'> {
  name: string;
  label: string;
  helpText?: string;
  required?: boolean;
}

/**
 * Standard text field wired to react-hook-form context. Renders the label,
 * the input, and — when present — a validation error, with the error
 * announced to screen readers (accessibilityLiveRegion) and the input
 * marked invalid for assistive tech, satisfying "form-error announcements"
 * in the accessibility requirements.
 *
 * Shares `Field` and `inputSurface` with the controlled `TextField`, so the
 * auth forms and the feature sheets are pixel-identical.
 */
export function FormTextInput({ name, label, helpText, required, ...inputProps }: FormTextInputProps) {
  const theme = useTheme();
  const { control } = useFormContext();
  const [focused, setFocused] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Field label={label} error={error?.message} helpText={helpText} required={required}>
          <View
            style={[
              inputSurface(theme, {
                focused,
                invalid: Boolean(error),
                disabled: inputProps.editable === false,
              }),
              { justifyContent: 'center' },
              transition(),
            ]}
          >
            <TextInput
              accessibilityLabel={label}
              accessibilityState={{ disabled: inputProps.editable === false }}
              aria-invalid={Boolean(error)}
              style={inputText(theme)}
              placeholderTextColor={theme.colors.textSubtle}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onChangeText={onChange}
              value={typeof value === 'string' ? value : ''}
              {...inputProps}
            />
          </View>
        </Field>
      )}
    />
  );
}
