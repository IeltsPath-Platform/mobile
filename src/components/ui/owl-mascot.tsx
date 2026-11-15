import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

/**
 * - `wave`: nothing here yet, an invitation to start.
 * - `cheer`: all done (e.g. every notification read).
 * - `oops`: something failed; the owl tilts its head over a soft red backdrop.
 */
export type OwlMood = 'wave' | 'cheer' | 'oops';

const POSES = {
  wave: require('@/assets/images/owl/hero-wave.webp'),
  cheer: require('@/assets/images/owl/hero-cheer.webp'),
  oops: require('@/assets/images/owl/nav-owl-stand.webp'),
} as const;

/** The IELTSPath owl on a round tinted backdrop, gently bobbing (still when reduced motion is on). */
export function OwlMascot({ mood = 'wave', size = 120 }: { mood?: OwlMood; size?: number }) {
  useTheme();
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [bob, reduceMotion]);

  const owlStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * 5 }, { rotate: mood === 'oops' ? '-10deg' : '0deg' }],
  }));

  const backdrop = mood === 'oops' ? colors.dangerSoft : mood === 'cheer' ? colors.successSoft : colors.accentSoft;
  const owlSize = size * 0.86;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: backdrop, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <Animated.View style={[{ width: owlSize, height: owlSize, marginBottom: mood === 'oops' ? size * 0.04 : -size * 0.02 }, owlStyle]}>
        <Image source={POSES[mood]} contentFit="contain" accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} />
      </Animated.View>
    </View>
  );
}
