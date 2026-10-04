import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type MascotPoint = { x: number; y: number };

type PathMascotProps = {
  /** Center of the node the mascot stands on (map-local coords). */
  at: MascotPoint | null;
  /** When set, run from `at` toward this point, then call onArrived. */
  travelTo?: MascotPoint | null;
  onArrived?: () => void;
  size?: number;
};

/** Path-only runner (quadruped). Classroom biped mascot stays elsewhere. */
const RUN_FRAMES: ImageSourcePropType[] = [
  require('@/assets/images/mascot-path-runner.png'),
  require('@/assets/images/mascot-path-runner-f2.png'),
  require('@/assets/images/mascot-path-runner-f3.png'),
];

/** Stand slightly below-right of the node ring so the button stays tappable. */
const OFFSET_X = 40;
const OFFSET_Y = 48;

export function PathMascot({ at, travelTo = null, onArrived, size = 80 }: PathMascotProps) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const bob = useSharedValue(0);
  const facing = useSharedValue(1);
  const hop = useSharedValue(0);
  const ready = useSharedValue(0);
  const traveling = useRef(false);
  const onArrivedRef = useRef(onArrived);
  onArrivedRef.current = onArrived;
  const [frame, setFrame] = useState(0);
  const frameTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRunCycle = () => {
    if (frameTimer.current) {
      clearInterval(frameTimer.current);
      frameTimer.current = null;
    }
    setFrame(0);
  };

  const startRunCycle = () => {
    stopRunCycle();
    let i = 0;
    frameTimer.current = setInterval(() => {
      i = (i + 1) % RUN_FRAMES.length;
      setFrame(i);
    }, 110);
  };

  useEffect(() => () => stopRunCycle(), []);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 420, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [bob]);

  useEffect(() => {
    if (!at || traveling.current) return;
    const targetX = at.x + OFFSET_X - size / 2;
    const targetY = at.y + OFFSET_Y;
    if (ready.value === 0) {
      x.value = targetX;
      y.value = targetY;
      ready.value = 1;
      return;
    }
    if (!travelTo) {
      x.value = withTiming(targetX, { duration: 280 });
      y.value = withTiming(targetY, { duration: 280 });
    }
  }, [at?.x, at?.y, size, travelTo, x, y, ready]);

  useEffect(() => {
    if (!at || !travelTo) return;
    if (traveling.current) return;
    traveling.current = true;
    startRunCycle();

    const fromX = at.x + OFFSET_X - size / 2;
    const fromY = at.y + OFFSET_Y;
    const toX = travelTo.x + OFFSET_X - size / 2;
    const toY = travelTo.y + OFFSET_Y;
    facing.value = toX >= fromX ? 1 : -1;

    x.value = fromX;
    y.value = fromY;

    hop.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
      ),
      10,
      false,
    );

    const duration = Math.min(1500, Math.max(750, Math.hypot(toX - fromX, toY - fromY) * 2.4));

    const finishTravel = (finished: boolean) => {
      traveling.current = false;
      stopRunCycle();
      if (finished) onArrivedRef.current?.();
    };

    x.value = withTiming(toX, { duration, easing: Easing.inOut(Easing.cubic) });
    y.value = withTiming(toY, { duration, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      hop.value = 0;
      runOnJS(finishTravel)(!!finished);
    });
  }, [travelTo?.x, travelTo?.y, at?.x, at?.y, size, x, y, hop, facing]);

  const style = useAnimatedStyle(() => ({
    opacity: ready.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value + bob.value + hop.value },
      { scaleX: facing.value },
    ],
  }));

  if (!at) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Image
        source={RUN_FRAMES[frame]}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 20,
  },
});
