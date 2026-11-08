import { memo, useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';

import { colors } from '@/src/theme';

const OWL_FRAMES = [
  require('@/assets/images/owl/nav-owl-step-left.png'),
  require('@/assets/images/owl/nav-owl-step-right.png'),
];
const OWL_STAND = require('@/assets/images/owl/nav-owl-stand.png');

const ARENA_HEIGHT = 176;
const OWL_SIZE = 64;
const OBSTACLE_WIDTH = 52;
const GROUND = 26;
const JUMP_HEIGHT = 74;
const JUMP_MS = 620;
const WALK_IN_MS = 380;
const STRIDE_MS = 170;

type Pose = 'stand' | 'walk' | 'jump' | 'fall';

const Obstacle = memo(function Obstacle({ variant }: { variant: number }) {
  const tone = colors.accentWarm;
  if (variant === 0) {
    return (
      <View accessibilityLabel="Rào chắn" style={{ width: OBSTACLE_WIDTH }} className="items-center">
        <View className="h-2.5 w-full rounded-full" style={{ backgroundColor: tone }} />
        <View className="h-9 w-full flex-row justify-between px-1.5">
          <View className="h-full w-1.5 rounded-b" style={{ backgroundColor: tone }} />
          <View className="h-full w-1.5 rounded-b" style={{ backgroundColor: tone }} />
        </View>
      </View>
    );
  }
  if (variant === 1) {
    return (
      <View
        accessibilityLabel="Thùng gỗ"
        className="h-12 rounded-lg border-4"
        style={{ width: OBSTACLE_WIDTH - 4, backgroundColor: colors.warmSoft, borderColor: tone }}
      >
        <View className="absolute bottom-0 left-1/2 top-0 w-[3px]" style={{ backgroundColor: tone }} />
        <View className="absolute left-0 right-0 top-1/2 h-[3px]" style={{ backgroundColor: tone }} />
      </View>
    );
  }
  return (
    <View accessibilityLabel="Cụm đá" style={{ width: OBSTACLE_WIDTH }} className="h-10 flex-row items-end justify-center gap-0.5">
      <View className="h-6 w-6 rounded-t-2xl rounded-bl-xl" style={{ backgroundColor: tone, transform: [{ rotate: '-12deg' }] }} />
      <View className="h-9 w-9 rounded-t-3xl rounded-bl-2xl" style={{ backgroundColor: tone, opacity: 0.9, transform: [{ rotate: '6deg' }] }} />
    </View>
  );
});

/** Owns the footfall frame so the 6 Hz stride swap re-renders only the sprite, not the arena. */
const OwlSprite = memo(function OwlSprite({ walking }: { walking: boolean }) {
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!walking || reduceMotion) {
      setFrame(0);
      return;
    }
    const timer = setInterval(() => setFrame((value) => (value + 1) % OWL_FRAMES.length), STRIDE_MS);
    return () => clearInterval(timer);
  }, [walking, reduceMotion]);
  return (
    <Image
      source={walking && !reduceMotion ? OWL_FRAMES[frame] : OWL_STAND}
      contentFit="contain"
      accessibilityLabel="Cú IELTSPath"
      style={{ width: '100%', height: '100%' }}
    />
  );
});

/**
 * The obstacle stands still on the track. The owl walks toward it as the round clock runs
 * down and reaches it on the deadline. A correct answer makes it hop over and walk on;
 * a miss makes it trip over the obstacle and sit there dizzy.
 */
export const RocketArena = memo(function RocketArena({
  roundId,
  roundNumber,
  opensAt,
  deadlineAt,
  serverOffsetMs,
  outcome,
}: {
  roundId: string | null;
  roundNumber: number;
  opensAt: string | null;
  deadlineAt: string | null;
  serverOffsetMs: number;
  /** Result of the most recently resolved round; animates once per `roundId`. */
  outcome: { roundId: string; correct: boolean } | null;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(320);
  const [pose, setPose] = useState<Pose>('stand');
  const x = useSharedValue(-OWL_SIZE);
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const dizzy = useSharedValue(0);
  const spin = useSharedValue(0);
  const obstacleScale = useSharedValue(0);
  const obstacleWobble = useSharedValue(0);
  const cloud = useSharedValue(0);
  const played = useRef(new Set<string>());
  const busyUntil = useRef(0);
  const roundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const outcomeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const obstacleX = width * 0.64;
  const startX = width * 0.06;
  const stopX = obstacleX - OWL_SIZE * 0.62;
  const takeoffX = stopX - OWL_SIZE * 0.5;
  const landX = obstacleX + OBSTACLE_WIDTH - OWL_SIZE * 0.2;

  // Effects read live geometry and clock offset through this ref so a re-sync never restarts the walk.
  const live = useRef({ width, startX, stopX, takeoffX, landX, offset: serverOffsetMs });
  live.current = { width, startX, stopX, takeoffX, landX, offset: serverOffsetMs };

  const later = (list: { current: ReturnType<typeof setTimeout>[] }, ms: number, run: () => void) => {
    list.current.push(setTimeout(run, ms));
  };
  useEffect(
    () => () => {
      roundTimers.current.forEach(clearTimeout);
      outcomeTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  useEffect(() => {
    if (reduceMotion) return;
    cloud.value = withRepeat(withTiming(1, { duration: 26_000, easing: Easing.linear }), -1);
  }, [reduceMotion, cloud]);

  // New round: the obstacle pops up and the owl walks in from the left, then toward it.
  useEffect(() => {
    roundTimers.current.forEach(clearTimeout);
    roundTimers.current = [];
    const begin = () => {
      const { startX, stopX, offset } = live.current;
      cancelAnimation(x);
      lift.value = 0;
      tilt.value = 0;
      dizzy.value = 0;
      obstacleWobble.value = 0;
      if (!roundId || !deadlineAt || !opensAt) {
        // Round not open yet: owl waits at the start, obstacle hidden.
        obstacleScale.value = withTiming(0, { duration: 120 });
        x.value = withTiming(startX, { duration: 200 });
        setPose('stand');
        return;
      }
      const total = Math.max(1, Date.parse(deadlineAt) - Date.parse(opensAt));
      const remaining = Math.max(0, Date.parse(deadlineAt) - (Date.now() + offset));
      const elapsed = 1 - remaining / total;
      obstacleScale.value = withSpring(1, { damping: 11, stiffness: 220 });
      setPose('walk');
      if (elapsed > 0.08) {
        // Joined mid-round: place the owl where the clock says it should be.
        x.value = startX + (stopX - startX) * Math.min(1, elapsed);
        x.value = withTiming(stopX, { duration: remaining, easing: Easing.linear });
      } else {
        x.value = -OWL_SIZE;
        x.value = withSequence(
          withTiming(startX, { duration: WALK_IN_MS, easing: Easing.out(Easing.quad) }),
          withTiming(stopX, { duration: Math.max(0, remaining - WALK_IN_MS), easing: Easing.linear }),
        );
      }
    };
    // The round just resolved is animated by the outcome effect, which owns the stage until it ends.
    const resolving = !roundId && outcome !== null && !played.current.has(outcome.roundId);
    if (resolving) return;
    const wait = busyUntil.current - Date.now();
    if (wait > 0) later(roundTimers, wait, begin);
    else begin();
    // Only a new round (or its deadline) restarts the walk; offset and size are read from `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, deadlineAt, opensAt]);

  useEffect(() => {
    if (!outcome || played.current.has(outcome.roundId)) return;
    played.current.add(outcome.roundId);
    // The result may arrive together with the next round; then the old obstacle is already gone.
    const obstacleGone = roundId !== null && roundId !== outcome.roundId;
    if (obstacleGone) {
      // Only a small cheer/flinch; the new round owns the stage.
      if (outcome.correct) lift.value = withSequence(withTiming(0.35, { duration: 160 }), withTiming(0, { duration: 200 }));
      else tilt.value = withSequence(withTiming(-8, { duration: 90 }), withTiming(8, { duration: 110 }), withTiming(0, { duration: 90 }));
      return;
    }

    outcomeTimers.current.forEach(clearTimeout);
    outcomeTimers.current = [];
    const { width, stopX, takeoffX, landX } = live.current;
    cancelAnimation(x);
    const reach = Math.max(0, takeoffX - x.value);
    const walkMs = Math.min(520, Math.max(120, reach * 2.4));

    if (outcome.correct) {
      const exitMs = 520;
      busyUntil.current = Date.now() + walkMs + JUMP_MS + exitMs;
      setPose('walk');
      x.value = withSequence(
        withTiming(takeoffX, { duration: walkMs, easing: Easing.linear }),
        withTiming(landX, { duration: JUMP_MS, easing: Easing.linear }),
        withTiming(width + OWL_SIZE, { duration: exitMs, easing: Easing.in(Easing.quad) }),
      );
      later(outcomeTimers, walkMs, () => setPose('jump'));
      lift.value = withDelay(walkMs, withSequence(withTiming(1, { duration: JUMP_MS / 2, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: JUMP_MS / 2, easing: Easing.in(Easing.quad) })));
      later(outcomeTimers, walkMs + JUMP_MS, () => setPose('walk'));
    } else {
      const toStop = Math.max(0, stopX - x.value);
      const closeMs = Math.min(480, Math.max(0, toStop * 2.4));
      busyUntil.current = Date.now() + closeMs + 1500;
      setPose('walk');
      x.value = withSequence(withTiming(stopX, { duration: closeMs, easing: Easing.linear }), withDelay(120, withTiming(stopX + 16, { duration: 260, easing: Easing.out(Easing.quad) })));
      later(outcomeTimers, closeMs + 40, () => setPose('fall'));
      // Trip: pitch forward over the obstacle, bounce, then lie dizzy before getting up.
      tilt.value = withDelay(closeMs, withSequence(withTiming(78, { duration: 220, easing: Easing.in(Easing.quad) }), withTiming(70, { duration: 120 }), withDelay(900, withTiming(0, { duration: 320 }))));
      lift.value = withDelay(closeMs, withSequence(withTiming(0.18, { duration: 130 }), withTiming(0, { duration: 130 })));
      obstacleWobble.value = withDelay(closeMs, withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 110 }), withTiming(0.5, { duration: 90 }), withTiming(0, { duration: 120 })));
      dizzy.value = withDelay(closeMs + 200, withSequence(withTiming(1, { duration: 120 }), withDelay(900, withTiming(0, { duration: 260 }))));
      spin.value = 0;
      spin.value = withDelay(closeMs + 200, withRepeat(withTiming(360, { duration: 700, easing: Easing.linear }), 2));
      later(outcomeTimers, closeMs + 1300, () => setPose('stand'));
    }
  }, [outcome, roundId, x, lift, tilt, dizzy, spin, obstacleWobble]);

  const owlStyle = useAnimatedStyle(() => ({
    left: x.value,
    transform: [{ translateY: -lift.value * JUMP_HEIGHT }, { rotate: `${tilt.value}deg` }, { scaleY: 1 - lift.value * 0.05 }],
  }));
  const obstacleStyle = useAnimatedStyle(() => ({
    opacity: obstacleScale.value,
    transform: [{ scale: obstacleScale.value }, { rotate: `${obstacleWobble.value * 6}deg` }],
  }));
  const starsStyle = useAnimatedStyle(() => ({
    left: x.value + OWL_SIZE / 2 - 24,
    opacity: dizzy.value,
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  const cloudStyle = useAnimatedStyle(() => ({ transform: [{ translateX: width - cloud.value * (width + 120) }] }));

  return (
    <View
      accessible
      accessibilityLabel={`Đường chạy, vòng ${roundNumber}`}
      onLayout={onLayout}
      className="overflow-hidden rounded-3xl border"
      style={{ height: ARENA_HEIGHT, backgroundColor: colors.listeningSoft, borderColor: colors.accentEdge }}
    >
      <Animated.View className="absolute top-4 h-5 w-14 rounded-full" style={[{ backgroundColor: colors.surface, opacity: 0.8 }, cloudStyle]} />
      <Animated.View className="absolute top-12 h-4 w-10 rounded-full" style={[{ backgroundColor: colors.surface, opacity: 0.55, left: 50 }, cloudStyle]} />

      <View className="absolute bottom-0 left-0 right-0" style={{ height: GROUND, backgroundColor: colors.accentSoft, borderTopWidth: 2, borderTopColor: colors.accentEdge }} />

      <Animated.View className="absolute items-center justify-end" style={[{ bottom: GROUND - 2, left: obstacleX }, obstacleStyle]}>
        <Obstacle variant={(Math.max(1, roundNumber) - 1) % 3} />
      </Animated.View>

      <Animated.View className="absolute" style={[{ bottom: GROUND - 3, width: OWL_SIZE, height: OWL_SIZE }, owlStyle]}>
        <OwlSprite walking={pose === 'walk'} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        className="absolute h-6 w-12 items-center justify-between"
        style={[{ bottom: GROUND + OWL_SIZE - 4 }, starsStyle]}
      >
        <Star size={13} color={colors.xp} fill={colors.xp} style={{ position: 'absolute', left: 0, top: 6 }} />
        <Star size={13} color={colors.xp} fill={colors.xp} style={{ position: 'absolute', left: 17, top: 0 }} />
        <Star size={13} color={colors.xp} fill={colors.xp} style={{ position: 'absolute', right: 0, top: 6 }} />
      </Animated.View>
    </View>
  );
});
