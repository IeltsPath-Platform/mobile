import { memo, useEffect, useRef, useState } from 'react';
import { Platform, Text as NativeText } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme';

import type { LetterStatus } from './types';

export type TileMode = 'empty' | 'typed' | 'hint' | LetterStatus;

export function tileColors(mode: TileMode) {
  switch (mode) {
    case 'CORRECT':
      return { bg: colors.success, border: colors.success, fg: colors.onAccent };
    case 'PRESENT':
      return { bg: colors.warning, border: colors.warning, fg: colors.onAccent };
    case 'ABSENT':
      return { bg: colors.absent, border: colors.absent, fg: colors.onAccent };
    case 'typed':
      return { bg: colors.surface, border: colors.ink, fg: colors.ink };
    case 'hint':
      return { bg: colors.accentSoft, border: colors.accent, fg: colors.accentDeep };
    default:
      return { bg: colors.surface, border: colors.line, fg: colors.ink };
  }
}

const FLIP_MS = 140;

/**
 * One board cell. Pops when a letter is typed and flips (staggered by `revealDelay`)
 * when a guess is graded. Tiles that mount already graded render without animating.
 */
export const LetterTile = memo(function LetterTile({
  letter,
  size,
  mode,
  cursor,
  revealDelay = 0,
}: {
  letter: string;
  size: number;
  mode: TileMode;
  cursor: boolean;
  revealDelay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const graded = mode === 'CORRECT' || mode === 'PRESENT' || mode === 'ABSENT';
  const [shown, setShown] = useState<TileMode>(mode);
  const scale = useSharedValue(1);
  const flip = useSharedValue(1);
  const mounted = useRef(false);
  const previousGraded = useRef(graded);

  useEffect(() => {
    if (!graded) {
      setShown(mode);
      previousGraded.current = false;
      return;
    }
    if (previousGraded.current || !mounted.current || reduceMotion) {
      setShown(mode);
      previousGraded.current = true;
      return;
    }
    previousGraded.current = true;
    flip.value = withDelay(revealDelay, withSequence(withTiming(0, { duration: FLIP_MS }), withTiming(1, { duration: FLIP_MS })));
    const timer = setTimeout(() => setShown(mode), revealDelay + FLIP_MS);
    return () => clearTimeout(timer);
  }, [graded, mode, reduceMotion, revealDelay, flip]);

  useEffect(() => {
    if (mounted.current && letter && !graded && !reduceMotion) {
      scale.value = withSequence(withTiming(1.14, { duration: 70 }), withSpring(1, { damping: 12, stiffness: 300 }));
    }
  }, [letter, graded, reduceMotion, scale]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { scaleY: flip.value }] }));
  const palette = tileColors(shown);
  return (
    <Animated.View
      accessible
      accessibilityLabel={letter ? `Chữ ${letter}` : 'Ô trống'}
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          borderWidth: cursor ? 3 : 2,
          borderBottomWidth: shown === 'empty' ? 2 : 4,
          borderColor: cursor ? colors.accent : palette.border,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <NativeText
        allowFontScaling={false}
        numberOfLines={1}
        style={{
          width: '100%',
          padding: 0,
          textAlign: 'center',
          includeFontPadding: false,
          fontFamily: Platform.OS === 'ios' ? 'Menlo-Bold' : 'monospace',
          fontWeight: '700',
          fontSize: Math.min(26, Math.floor(size * 0.56)),
          lineHeight: Math.floor(size * 0.8),
          color: palette.fg,
        }}
      >
        {letter}
      </NativeText>
    </Animated.View>
  );
});
