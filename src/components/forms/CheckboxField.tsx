import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { minTouchTarget, radius, spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Checkbox } from '@/components/ui/Checkbox';
import { clickable, focusRing, pressState, transition } from '@/utils/interaction';

export interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Second line explaining what turning this on actually does. */
  description?: string;
  disabled?: boolean;
  /** `card` gives the row a bordered surface; `plain` sits inline in a form. */
  variant?: 'plain' | 'card';
}

/**
 * A checkbox with its label as one tap target.
 *
 * Forms used to pair a bare `Checkbox` with a `ThemedText`, which meant only
 * the 22px box responded to a tap — on a phone that is a miss more often than
 * a hit, and the label (the part you actually read) did nothing. The checkbox
 * itself is inert here so the row owns the whole interaction.
 */
export function CheckboxField({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  variant = 'plain',
}: CheckboxFieldProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={(state) => {
        const { pressed, hovered, focused } = pressState(state);
        return [
          {
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            gap: spacing.sm,
            minHeight: minTouchTarget,
            opacity: disabled ? 0.5 : 1,
            ...(variant === 'card'
              ? {
                  paddingRight: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: checked ? theme.colors.primary : theme.colors.border,
                  backgroundColor: checked
                    ? theme.colors.accentSurface
                    : pressed || hovered
                      ? theme.colors.surfaceHover
                      : theme.colors.surface,
                }
              : null),
          },
          transition(),
          clickable(!disabled),
          focusRing(theme.colors.focus, focused),
        ];
      }}
    >
      <View pointerEvents="none">
        <Checkbox checked={checked} onChange={onChange} accessibilityLabel={label} disabled={disabled} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs, paddingVertical: spacing.xs }}>
        <ThemedText variant="body">{label}</ThemedText>
        {description ? (
          <ThemedText variant="caption" tone="muted">
            {description}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}
