import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius } from '@/constants/theme';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Describes the thing being checked, e.g. the task title. */
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
}

/**
 * Completion toggle for tasks, subtasks and habit check-ins.
 *
 * The pressable area is a full 44px square with the box centred inside it, so
 * a dense list stays comfortably tappable on a phone while the visible control
 * stays small. Using padding rather than `hitSlop` also means the hover and
 * focus affordances on desktop cover the area you can actually click.
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
      onPress={() => onChange(!checked)}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            width: minTouchTarget,
            height: minTouchTarget,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            borderRadius: radius.full,
            backgroundColor: hovered && !disabled ? theme.colors.surfaceHover : 'transparent',
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          },
          transition(),
          clickable(!disabled),
          focusRing(theme.colors.focus, focused, 0),
        ];
      }}
    >
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius.sm,
            borderWidth: 2,
            borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
            backgroundColor: checked ? theme.colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          },
          transition(),
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={size - 8} color={theme.colors.primaryText} /> : null}
      </View>
    </Pressable>
  );
}
