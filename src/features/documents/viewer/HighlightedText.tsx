import { Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { splitHighlights } from '@/features/documents/viewer/text-preview';

export interface HighlightedTextProps {
  value: string;
  query: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  numberOfLines?: number;
  /** Dims non-matching text when a search is active, so hits stand out. */
  muted?: boolean;
}

/**
 * One line (or cell) of a document, with the current search term picked out.
 *
 * Nested `Text` is the only way to style a run inside a line on React Native,
 * and it behaves identically on web — so search highlighting works the same
 * in the browser and on a phone with no platform branch.
 */
export function HighlightedText({
  value,
  query,
  fontSize,
  lineHeight,
  fontFamily,
  numberOfLines,
  muted = false,
}: HighlightedTextProps) {
  const theme = useTheme();
  // An empty string lays out with zero height, which would collapse blank
  // lines and pull the line-number gutter out of step with the text.
  const text = value.length > 0 ? value : ' ';
  const segments = splitHighlights(text, query);

  return (
    <Text
      numberOfLines={numberOfLines}
      selectable
      style={{
        fontFamily,
        fontSize,
        lineHeight,
        color: muted ? theme.colors.textMuted : theme.colors.text,
      }}
    >
      {segments.length === 1 && !segments[0]!.match
        ? text
        : segments.map((segment, index) =>
            segment.match ? (
              <Text
                key={index}
                style={{
                  backgroundColor: theme.colors.warningSurface,
                  color: theme.colors.warning,
                }}
              >
                {segment.text}
              </Text>
            ) : (
              <Text key={index}>{segment.text}</Text>
            )
          )}
    </Text>
  );
}
