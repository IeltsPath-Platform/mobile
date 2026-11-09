import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type ProgressHeaderProps = {
  index: number;
  total: number;
};

export function ProgressHeader({ index, total }: ProgressHeaderProps) {
  const ratio = total > 0 ? Math.min(1, (index + 1) / total) : 0;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(Math.max(ratio * 100, 8));

  useEffect(() => {
    progress.value = reduceMotion ? Math.max(ratio * 100, 8) : withTiming(Math.max(ratio * 100, 8), { duration: 240 });
  }, [progress, ratio, reduceMotion]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View>
      <Text weight="bold" className="text-xs uppercase tracking-wide text-muted">
        Câu {Math.min(index + 1, total)}/{total}
      </Text>
      <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-line">
        <Animated.View style={[{ height: 10, borderRadius: 5, backgroundColor: colors.accent }, progressStyle]} />
      </View>
    </View>
  );
}
