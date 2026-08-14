import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { controlHeight, spacing, transition } from '@/constants/theme';
import { Field, inputSurface, inputText } from '@/components/forms/Field';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  helpText?: string;
  multiline?: boolean;
  required?: boolean;
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
  autoFocus,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label} error={error} helpText={helpText} required={required}>
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
          aria-invalid={Boolean(error)}
          multiline={multiline}
          style={[
            inputText(theme),
            multiline
              ? {
                  minHeight: controlHeight.md * 2.4,
                  paddingTop: spacing.md,
                  paddingBottom: spacing.sm,
                  textAlignVertical: 'top',
                }
              : null,
          ]}
          placeholderTextColor={theme.colors.textSubtle}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          // Opening the software keyboard during the sheet animation makes the
          // entire form jump on iOS. On a phone, let the user see the field and
          // pinned submit action first, then open the keyboard on an intentional
          // tap. Desktop keeps the faster auto-focus workflow.
          autoFocus={!compact && autoFocus}
          {...inputProps}
        />
      </View>
    </Field>
  );
}
