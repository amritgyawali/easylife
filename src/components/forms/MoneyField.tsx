import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { fontSize, fontWeight, spacing, tabularNumbers, transition } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Field, inputSurface, inputText } from '@/components/forms/Field';
import { minorUnitsFor } from '@/utils/money';

export interface MoneyFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  currency: string;
  error?: string | null;
  autoFocus?: boolean;
  helpText?: string;
}

/**
 * Amount entry as a decimal string, never a number.
 *
 * The string is handed straight to `toMinorUnits`, which converts it with
 * BigInt arithmetic — parsing to a float first would reintroduce exactly the
 * rounding error the integer-minor-unit rule exists to prevent. Input is
 * filtered to digits and a single decimal point, capped at the currency's
 * decimal places, so an unconvertible value can't be typed in the first place.
 */
export function MoneyField({
  label,
  value,
  onChangeText,
  currency,
  error,
  autoFocus,
  helpText,
}: MoneyFieldProps) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const [focused, setFocused] = useState(false);
  const decimals = minorUnitsFor(currency);

  function handleChange(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const [whole = '', ...rest] = cleaned.split('.');
    const fraction = rest.join('').slice(0, decimals);
    onChangeText(cleaned.includes('.') ? `${whole}.${fraction}` : whole);
  }

  return (
    <Field label={label} error={error} helpText={helpText}>
      <View
        style={[
          inputSurface(theme, { focused, invalid: Boolean(error) }),
          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
          transition(),
        ]}
      >
        <ThemedText variant="label" tone="muted" weight="semibold">
          {currency}
        </ThemedText>
        <TextInput
          accessibilityLabel={`${label} in ${currency}`}
          aria-invalid={Boolean(error)}
          value={value}
          onChangeText={handleChange}
          placeholder={decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0'}
          placeholderTextColor={theme.colors.textSubtle}
          keyboardType="decimal-pad"
          inputMode="decimal"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={!compact && autoFocus}
          style={[
            inputText(theme),
            tabularNumbers,
            {
              // The amount is the point of this field — it gets display
              // weight rather than the body size every other input uses.
              fontSize: fontSize.xl,
              fontWeight: fontWeight.semibold,
              textAlign: 'right',
              paddingVertical: spacing.sm,
            },
          ]}
        />
      </View>
    </Field>
  );
}
