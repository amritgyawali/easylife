import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius } from '@/constants/theme';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Describes the thing being checked, e.g. the task title. */
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
}

/**
 * Completion toggle for tasks, subtasks and habit check-ins. The pressable
 * area is padded out to the minimum touch target even though the box itself
 * is small, so it stays comfortably tappable in a dense list.
 */
export function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
  disabled = false,
  size = 22,
}: CheckboxProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={(minTouchTarget - size) / 2}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.sm,
        borderWidth: 2,
        borderColor: checked ? theme.colors.primary : theme.colors.border,
        backgroundColor: checked ? theme.colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      {checked ? <Ionicons name="checkmark" size={size - 8} color={theme.colors.primaryText} /> : null}
    </Pressable>
  );
}
