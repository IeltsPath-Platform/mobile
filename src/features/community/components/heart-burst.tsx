import { Heart } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { colors } from '@/src/theme';

/** Heart that pops over media after a double-tap. `burst` changes each time it should play. */
export function HeartBurst({ burst }: { burst: number }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (burst === 0) return;
    if (reduceMotion) {
      opacity.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 500 }));
      scale.value = 1;
      return;
    }
    scale.value = 0.4;
    opacity.value = 1;
    scale.value = withSpring(1.15, { damping: 9, stiffness: 220 });
    opacity.value = withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 260 }));
  }, [burst, opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View pointerEvents="none" className="absolute inset-0 items-center justify-center" style={style}>
      <Heart size={84} color={colors.reaction.love} fill={colors.reaction.love} />
    </Animated.View>
  );
}
