import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';

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

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: radius.md,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        style={{ flex: 1, color: theme.colors.text, paddingVertical: spacing.sm }}
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
