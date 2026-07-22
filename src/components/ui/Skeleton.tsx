import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';
import { AccessibilityInfo } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/constants/theme';

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

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={56} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  list: { gap: 12 },
});
