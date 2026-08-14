import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { controlHeight, elevation, radius, spacing, transition } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  /** Stretches to fill the row. Off by default so it hugs its content. */
  fullWidth?: boolean;
}

/**
 * Two-to-four mutually exclusive views of the same data — "List / Calendar",
 * "Week / Month / Year". Distinct from `OptionGroup` on purpose: a segmented
 * control switches *how* you are looking at something and always shows the
 * full set of choices, while chips filter *what* you are looking at and may
 * wrap to several rows.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <ThemedText variant="label" tone="muted" weight="medium">
          {label}
        </ThemedText>
      ) : null}
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          padding: 3,
          borderRadius: radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[
                {
                  flex: fullWidth ? 1 : undefined,
                  minHeight: controlHeight.sm,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? theme.colors.surface : 'transparent',
                },
                selected ? elevation('sm', theme.mode) : null,
                transition(),
              ]}
            >
              <ThemedText
                variant="label"
                tone={selected ? 'default' : 'muted'}
                weight={selected ? 'semibold' : 'medium'}
                numberOfLines={1}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
