import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, transition } from '@/constants/theme';
import { inputSurface, inputText } from '@/components/forms/Field';

export interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
}

/** Search field with a leading icon and a clear button that appears once there is something to clear. */
export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel = 'Search',
  autoFocus = false,
}: SearchInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        inputSurface(theme, { focused }),
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderRadius: radius.full,
        },
        transition(),
      ]}
    >
      <Ionicons name="search" size={18} color={focused ? theme.colors.primary : theme.colors.textMuted} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputText(theme)}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={12}
          onPress={() => onChangeText('')}
        >
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
