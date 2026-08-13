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
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    let isMounted = true;
    let loopAnimation: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!isMounted || reduceMotion) return;
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 700,
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
 * Loading placeholder shaped like the list it replaces — a leading square, two
 * lines of text, a trailing value. Matching the real layout keeps the page
 * from jumping when the data lands, which a row of plain grey bars does not.
 */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <Card padded={false} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width={36} height={36} borderRadius={radius.sm} />
          <View style={styles.rowText}>
            <Skeleton width={`${55 + ((index * 13) % 30)}%`} height={13} />
            <Skeleton width={`${30 + ((index * 17) % 25)}%`} height={11} />
          </View>
          <Skeleton width={56} height={13} />
        </View>
      ))}
    </Card>
  );
}

/** Placeholder for a summary card: a heading, a big number, a supporting line. */
export function SkeletonCard() {
  return (
    <Card style={{ gap: spacing.md }} accessibilityLabel="Loading">
      <Skeleton width="35%" height={11} />
      <Skeleton width="60%" height={26} />
      <Skeleton width="45%" height={12} />
    </Card>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1, gap: spacing.sm },
});
