import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const OWL = require('@/assets/images/owl/nav-owl-stand.webp');
/** Height over width of the owl artwork (184 × 200). */
const RATIO = 200 / 184;
/** Outer lower corner of each eye, as a share of the artwork's width and height. */
const EYES = [
  { x: 0.47, y: 0.44 },
  { x: 0.76, y: 0.43 },
] as const;
const TEAR = '#7cc8ff';
const FALL_MS = 1100;

/** The app owl, crying: a tear runs down from each eye in turn and the owl gives a small sob. */
export function CryingOwl({ width = 170 }: { width?: number }) {
  const reduceMotion = useReducedMotion();
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const sob = useSharedValue(0);
  const height = width * RATIO;
  const tearSize = Math.max(10, Math.round(width * 0.09));

  useEffect(() => {
    if (reduceMotion) return;
    // A Reanimated animation object can drive only one value, so each tear gets its own.
    const fall = () => withRepeat(withSequence(withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 500 })), -1);
    left.value = fall();
    right.value = withDelay(800, fall());
    sob.value = withRepeat(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 160 }), withTiming(1, { duration: 160 }), withTiming(0, { duration: 900 })), -1);
  }, [left, right, sob, reduceMotion]);

  const owlStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sob.value * 2 }, { scaleY: 1 - sob.value * 0.015 }] }));

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width, height: height + 12 }}>
      <Animated.View style={[{ width, height }, owlStyle]}>
        <Image source={OWL} contentFit="contain" accessibilityIgnoresInvertColors style={{ width, height }} />
        {EYES.map((eye, index) => (
          <Tear key={index} progress={index === 0 ? left : right} size={tearSize} still={reduceMotion} left={eye.x * width - tearSize / 2} top={eye.y * height} fall={height * 0.2} />
        ))}
      </Animated.View>
      {/* Soft shadow the owl stands on, so it does not float. */}
      <View style={{ position: 'absolute', bottom: 4, alignSelf: 'center', width: width * 0.5, height: 10, borderRadius: 999, backgroundColor: 'rgba(22,35,58,0.10)' }} />
    </View>
  );
}

function Tear({ progress, size, still, left, top, fall }: { progress: SharedValue<number>; size: number; still: boolean; left: number; top: number; fall: number }) {
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [{ translateY: fall * 0.3 }, { rotate: '45deg' }] };
    const p = progress.value;
    return {
      // Swells at the eye, then runs down and fades.
      opacity: p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.7) / 0.3),
      transform: [{ translateY: p * fall }, { scale: 0.6 + Math.min(p, 0.3) * 1.4 }, { rotate: '45deg' }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          backgroundColor: TEAR,
          // A square with one sharp corner, turned 45°, reads as a drop pointing up.
          borderTopLeftRadius: 0,
          borderTopRightRadius: size,
          borderBottomLeftRadius: size,
          borderBottomRightRadius: size,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.7)',
        },
        style,
      ]}
    />
  );
}
