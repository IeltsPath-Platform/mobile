import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/src/theme/design-tokens';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type ProgressTone = 'accent' | 'success' | 'xp';

type ProgressBarProps = {
  value: number;
  max: number;
  tone?: ProgressTone;
  height?: number;
  accessibilityLabel: string;
  valueText?: string;
};

/** Fill animates from the previous value to the new one; reduced motion jumps straight to it. */
export function ProgressBar({ value, max, tone = 'accent', height = 12, accessibilityLabel, valueText }: ProgressBarProps) {
  useTheme();
  const reduceMotion = useReducedMotion();
  const safeMax = Math.max(max, 1);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = reduceMotion
      ? ratio
      : withTiming(ratio, { duration: motion.transition, easing: Easing.out(Easing.cubic) });
  }, [ratio, reduceMotion, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const color = tone === 'success' ? colors.success : tone === 'xp' ? colors.xp : colors.accent;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: safeMax, now: Math.min(value, safeMax), text: valueText }}
      className="w-full overflow-hidden rounded-full bg-line"
      style={{ height }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}
