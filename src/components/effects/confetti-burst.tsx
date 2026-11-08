import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme';

type Particle = { dx: number; rise: number; fall: number; spin: number; size: number; color: string; delay: number; round: boolean };

function makeParticles(count: number, spread: number): Particle[] {
  const palette = [colors.accent, colors.accentWarm, colors.success, colors.xp, colors.social, colors.coin];
  return Array.from({ length: count }, (_, index) => ({
    dx: (Math.random() - 0.5) * 2 * spread,
    rise: 90 + Math.random() * 150,
    fall: 120 + Math.random() * 160,
    spin: (Math.random() - 0.5) * 900,
    size: 6 + Math.random() * 7,
    color: palette[index % palette.length],
    delay: Math.random() * 90,
    round: Math.random() > 0.55,
  }));
}

const Piece = memo(function Piece({ particle, trigger }: { particle: Particle; trigger: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(particle.delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
  }, [trigger, particle, progress]);
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Launch up, then gravity pulls the piece back down while it fades.
    const y = -particle.rise * Math.sin(Math.min(p * 1.6, 1) * (Math.PI / 2)) + particle.fall * p * p;
    return {
      opacity: p === 0 ? 0 : 1 - Math.max(0, (p - 0.65) / 0.35),
      transform: [{ translateX: particle.dx * p }, { translateY: y }, { rotate: `${particle.spin * p}deg` }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: particle.size,
          height: particle.round ? particle.size : particle.size * 0.55,
          borderRadius: particle.round ? particle.size / 2 : 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
});

/**
 * Celebration burst. Increment `trigger` to fire; 0 renders nothing.
 * `originY` is the launch height as a fraction of the container.
 */
export function ConfettiBurst({
  trigger,
  size = 'small',
  originY = 0.4,
}: {
  trigger: number;
  size?: 'small' | 'large';
  originY?: number;
}) {
  const reduceMotion = useReducedMotion();
  const count = size === 'large' ? 38 : 20;
  const spread = size === 'large' ? 170 : 110;
  const particles = useMemo(() => makeParticles(count, spread), [count, spread, trigger]);
  if (!trigger || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: '50%', top: `${originY * 100}%` }}>
        {particles.map((particle, index) => (
          <Piece key={index} particle={particle} trigger={trigger} />
        ))}
      </View>
    </View>
  );
}
