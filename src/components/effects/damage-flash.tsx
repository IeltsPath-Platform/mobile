import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { colors } from '@/src/theme';

/** Brief red wash over the screen; increment `trigger` to play it. */
export function DamageFlash({ trigger }: { trigger: number }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!trigger || reduceMotion) return;
    opacity.value = withSequence(withTiming(0.22, { duration: 90 }), withTiming(0, { duration: 420 }));
  }, [trigger, reduceMotion, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.danger, zIndex: 10 }, style]} />;
}
