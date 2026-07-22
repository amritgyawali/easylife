import { TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { minorUnitsFor } from '@/utils/money';

export interface MoneyFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  currency: string;
  error?: string | null;
  autoFocus?: boolean;
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
export function MoneyField({ label, value, onChangeText, currency, error, autoFocus }: MoneyFieldProps) {
  const theme = useTheme();
  const decimals = minorUnitsFor(currency);

  function handleChange(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const [whole = '', ...rest] = cleaned.split('.');
    const fraction = rest.join('').slice(0, decimals);
    onChangeText(cleaned.includes('.') ? `${whole}.${fraction}` : whole);
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="label" tone="muted">
        {label}
      </ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: minTouchTarget,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: error ? theme.colors.negative : theme.colors.border,
          borderRadius: radius.md,
          backgroundColor: theme.colors.surface,
        }}
      >
        <ThemedText variant="body" tone="muted">
          {currency}
        </ThemedText>
        <TextInput
          accessibilityLabel={`${label} in ${currency}`}
          aria-invalid={Boolean(error)}
          value={value}
          onChangeText={handleChange}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          style={{ flex: 1, color: theme.colors.text, fontSize: fontSize.xl, paddingVertical: spacing.sm }}
        />
      </View>
      {error ? (
        <ThemedText variant="caption" tone="negative" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}
