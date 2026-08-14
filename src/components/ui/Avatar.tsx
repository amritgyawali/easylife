import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface AvatarProps {
  /** Full name or label. Initials are derived from it. */
  name: string;
  size?: number;
  /** Overrides the derived initials, e.g. a category glyph. */
  initials?: string;
}

/** Deterministic tint per name, so the same person keeps the same colour. */
const TINTS = ['#4F5AE8', '#7A46D1', '#0B7D5C', '#A8630A', '#CE2C41', '#1F7A8C'] as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first || !last) return '?';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase();
}

function tintFor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  }
  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

/**
 * Initials avatar for people, counterparties and accounts. No image loading
 * on purpose — none of these entities carry a photo, and a coloured monogram
 * scans faster in a list than another grey glyph.
 */
export function Avatar({ name, size = 38, initials }: AvatarProps) {
  const theme = useTheme();
  const tint = tintFor(name);

  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${tint}${theme.mode === 'dark' ? '33' : '1F'}`,
      }}
    >
      <ThemedText
        variant="caption"
        weight="bold"
        style={{ color: theme.mode === 'dark' ? theme.colors.text : tint, fontSize: size * 0.36 }}
      >
        {initials ?? initialsFor(name)}
      </ThemedText>
    </View>
  );
}
