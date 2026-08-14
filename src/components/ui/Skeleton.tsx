import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: object;
}

/** Loading placeholder. Respects reduced-motion by skipping the pulse animation. */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    let isMounted = true;
    let loopAnimation: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!isMounted || reduceMotion) return;
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 750, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(opacity, {
            toValue: 0.55,
            duration: 750,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      loopAnimation.start();
    });

    return () => {
      isMounted = false;
      loopAnimation?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: theme.colors.surfaceAlt, opacity },
        style,
      ]}
    />
  );
}

/**
 * Placeholder rows shaped like the list they stand in for — a title line over
 * a shorter meta line inside a card — so the layout doesn't visibly reflow the
 * moment real data lands.
 */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <Card padded={false}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row} accessible={false} importantForAccessibility="no">
          <Skeleton width={38} height={38} borderRadius={radius.md} />
          <View style={styles.rowText}>
            <Skeleton width={`${60 + ((index * 13) % 30)}%`} height={13} />
            <Skeleton width={`${30 + ((index * 17) % 25)}%`} height={11} />
          </View>
          <Skeleton width={54} height={13} />
        </View>
      ))}
    </Card>
  );
}

/** Loading stand-in for a grid of summary cards. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.cards}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} style={styles.card}>
          <Skeleton width="45%" height={11} />
          <Skeleton width="70%" height={26} />
          <Skeleton width="35%" height={11} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, gap: spacing.sm },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { flex: 1, minWidth: 180, gap: spacing.sm },
});
