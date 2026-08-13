import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { fontSize, spacing } from '@/constants/theme';
import { inputChrome, useFieldFocus } from '@/components/forms/Field';
import { clickable, webStyle } from '@/utils/interaction';

export interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/** Search field with a leading icon and a clear button that appears once there is something to clear. */
export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel = 'Search',
  autoFocus = false,
  onSubmit,
}: SearchInputProps) {
  const theme = useTheme();
  const focus = useFieldFocus();

  return (
    <View
      style={[
        inputChrome(theme, { focused: focus.focused }),
        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 0 },
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={focus.focused ? theme.colors.primary : theme.colors.textMuted}
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        // `search` gets the browser's clear affordance and the right keyboard.
        inputMode="search"
        style={[
          { flex: 1, color: theme.colors.text, paddingVertical: spacing.sm, fontSize: fontSize.md },
          webStyle({ outlineStyle: 'none' }),
        ]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={12}
          onPress={() => onChangeText('')}
          style={clickable()}
        >
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
