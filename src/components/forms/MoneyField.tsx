import { TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { fontSize, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Field, inputChrome, useFieldFocus } from '@/components/forms/Field';
import { webStyle } from '@/utils/interaction';
import { minorUnitsFor } from '@/utils/money';

export interface MoneyFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  currency: string;
  error?: string | null;
  helpText?: string;
  autoFocus?: boolean;
  required?: boolean;
}

/**
 * Amount entry as a decimal string, never a number.
 *
 * The string is handed straight to `toMinorUnits`, which converts it with
 * BigInt arithmetic — parsing to a float first would reintroduce exactly the
 * rounding error the integer-minor-unit rule exists to prevent. Input is
 * filtered to digits and a single decimal point, capped at the currency's
 * decimal places, so an unconvertible value can't be typed in the first place.
 *
 * Visually it is the one oversized field in any form: the amount is the thing
 * being entered, and a 22px tabular figure is far easier to check for a typo'd
 * extra zero than body text is.
 */
export function MoneyField({
  label,
  value,
  onChangeText,
  currency,
  error,
  helpText,
  autoFocus,
  required,
}: MoneyFieldProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const focus = useFieldFocus();
  const decimals = minorUnitsFor(currency);

  function handleChange(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const [whole = '', ...rest] = cleaned.split('.');
    const fraction = rest.join('').slice(0, decimals);
    onChangeText(cleaned.includes('.') ? `${whole}.${fraction}` : whole);
  }

  return (
    <Field label={label} error={error} helpText={helpText} required={required}>
      <View
        style={[
          inputChrome(theme, { focused: focus.focused, invalid: Boolean(error), size: 'lg' }),
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: 0,
          },
        ]}
      >
        <ThemedText variant="body" tone="muted" weight="semibold">
          {currency}
        </ThemedText>
        <TextInput
          accessibilityLabel={`${label} in ${currency}`}
          aria-invalid={Boolean(error)}
          value={value}
          onChangeText={handleChange}
          onFocus={focus.onFocus}
          onBlur={focus.onBlur}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textSubtle}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={!compact && autoFocus}
          style={[
            {
              flex: 1,
              color: theme.colors.text,
              fontSize: fontSize.xl,
              fontWeight: '600',
              paddingVertical: spacing.sm,
            },
            webStyle({ outlineStyle: 'none', fontVariantNumeric: 'tabular-nums' }),
          ]}
        />
      </View>
    </Field>
  );
}
