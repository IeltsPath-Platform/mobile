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
const STRIDE_MS = 170;
/** Track pixels per millisecond when the obstacle rushes in after an answer. */
const RUSH_SPEED = 0.5;
/** Track pixels per millisecond while no round is open, so the owl never stops running. */
const CRUISE_SPEED = 0.06;
const HIT_PASS_MS = 1100;
const DASH_PERIOD = 44;
/** How far before contact the owl takes off, and how far the obstacle travels under it. */
const TAKEOFF_LEAD = 14;
const JUMP_TRAVEL = OWL_SIZE * 0.5 + OBSTACLE_WIDTH + TAKEOFF_LEAD;

type Pose = 'walk' | 'jump';

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
 * Endless-runner track: the owl keeps running in place while the ground scrolls under it.
 * Each round an obstacle slides in from the right and reaches the owl on the deadline.
 * A correct answer makes the owl jump over it; a miss makes the obstacle pass straight
 * through a blinking owl, which loses a life but keeps running.
 *
 * Everything on the track moves with one `travel` distance, so ground and obstacle never drift apart.
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
  const [width, setWidth] = useState(320);
  const [pose, setPose] = useState<Pose>('walk');
  const [variant, setVariant] = useState(0);
  const travel = useSharedValue(0);
  const spawnX = useSharedValue(0);
  const spawnTravel = useSharedValue(0);
  const obstacleVisible = useSharedValue(0);
  const obstacleWobble = useSharedValue(0);
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const dizzy = useSharedValue(0);
  const spin = useSharedValue(0);
  const cloud = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const played = useRef(new Set<string>());
  const busyUntil = useRef(0);
  const roundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const outcomeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const owlX = width * 0.16;
  const contactX = owlX + OWL_SIZE * 0.7;

  // Effects read live geometry and clock offset through this ref so a re-sync never restarts the run.
  const live = useRef({ width, contactX, offset: serverOffsetMs, roundNumber, roundOpen: false });
  live.current = { ...live.current, width, contactX, offset: serverOffsetMs, roundNumber };

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

  /** Keeps the ground moving at a gentle pace while waiting for the next round. */
  const cruise = () => {
    cancelAnimation(travel);
    travel.value = withTiming(travel.value + CRUISE_SPEED * 600_000, { duration: 600_000, easing: Easing.linear });
  };

  useEffect(() => {
    if (reduceMotion) return;
    cloud.value = withRepeat(withTiming(1, { duration: 26_000, easing: Easing.linear }), -1);
  }, [reduceMotion, cloud]);

  // New round: a fresh obstacle enters from the right edge and arrives at the owl on the deadline.
  useEffect(() => {
    roundTimers.current.forEach(clearTimeout);
    roundTimers.current = [];
    const begin = () => {
      const { width, contactX, offset, roundNumber } = live.current;
      lift.value = 0;
      tilt.value = 0;
      blink.value = 1;
      dizzy.value = 0;
      obstacleWobble.value = 0;
      setPose('walk');
      if (!roundId || !deadlineAt || !opensAt) {
        live.current.roundOpen = false;
        obstacleVisible.value = withTiming(0, { duration: 120 });
        cruise();
        return;
      }
      live.current.roundOpen = true;
      const total = Math.max(1, Date.parse(deadlineAt) - Date.parse(opensAt));
      const remaining = Math.max(0, Date.parse(deadlineAt) - (Date.now() + offset));
      const elapsed = Math.min(1, Math.max(0, 1 - remaining / total));
      const entryX = width + 4;
      // Joining mid-round places the obstacle where the clock says it should be.
      const startX = entryX - (entryX - contactX) * elapsed;
      cancelAnimation(travel);
      spawnX.value = startX;
      spawnTravel.value = travel.value;
      setVariant((Math.max(1, roundNumber) - 1) % 3);
      obstacleVisible.value = 1;
      travel.value = withTiming(travel.value + (startX - contactX), { duration: remaining, easing: Easing.linear });
    };
    // The round just resolved is animated by the outcome effect, which owns the track until it ends.
    const resolving = !roundId && outcome !== null && !played.current.has(outcome.roundId);
    if (resolving) return;
    const wait = busyUntil.current - Date.now();
    if (wait > 0) later(roundTimers, wait, begin);
    else begin();
    // Only a new round (or its deadline) restarts the obstacle; offset and size are read from `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, deadlineAt, opensAt]);

  useEffect(() => {
    if (!outcome || played.current.has(outcome.roundId)) return;
    played.current.add(outcome.roundId);

    const flinch = () => {
      blink.value = withSequence(
        ...Array.from({ length: 5 }, () => withSequence(withTiming(0.2, { duration: 90 }), withTiming(1, { duration: 110 }))),
      );
      tilt.value = withSequence(withTiming(-14, { duration: 90 }), withTiming(10, { duration: 120 }), withTiming(0, { duration: 140 }));
    };

    // The result may arrive together with the next round; then the old obstacle is already gone.
    const obstacleGone = roundId !== null && roundId !== outcome.roundId;
    if (obstacleGone) {
      if (outcome.correct) lift.value = withSequence(withTiming(0.35, { duration: 160 }), withTiming(0, { duration: 200 }));
      else flinch();
      return;
    }

    outcomeTimers.current.forEach(clearTimeout);
    outcomeTimers.current = [];
    live.current.roundOpen = false;
    const { contactX } = live.current;
    cancelAnimation(travel);
    const obstacleNow = spawnX.value - (travel.value - spawnTravel.value);
    const start = travel.value;

    if (outcome.correct) {
      // Rush the obstacle to the take-off point, jump while it slides underneath, then let it leave.
      const approach = Math.max(0, obstacleNow - (contactX + TAKEOFF_LEAD));
      const approachMs = approach / RUSH_SPEED;
      const afterJumpX = obstacleNow - approach - JUMP_TRAVEL;
      const exit = afterJumpX + OBSTACLE_WIDTH + 10;
      const exitMs = 480;
      busyUntil.current = Date.now() + approachMs + JUMP_MS + exitMs;
      travel.value = withSequence(
        withTiming(start + approach, { duration: approachMs, easing: Easing.linear }),
        withTiming(start + approach + JUMP_TRAVEL, { duration: JUMP_MS, easing: Easing.linear }),
        withTiming(start + approach + JUMP_TRAVEL + exit, { duration: exitMs, easing: Easing.out(Easing.quad) }),
      );
      later(outcomeTimers, approachMs, () => setPose('jump'));
      lift.value = withDelay(
        approachMs,
        withSequence(
          withTiming(1, { duration: JUMP_MS / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: JUMP_MS / 2, easing: Easing.in(Easing.quad) }),
        ),
      );
      later(outcomeTimers, approachMs + JUMP_MS, () => setPose('walk'));
    } else {
      // Rush to the owl, then the obstacle passes straight through while the owl blinks and keeps running.
      const approach = Math.max(0, obstacleNow - contactX);
      const approachMs = approach / RUSH_SPEED;
      const pass = obstacleNow - approach + OBSTACLE_WIDTH + 10;
      busyUntil.current = Date.now() + approachMs + HIT_PASS_MS;
      travel.value = withSequence(
        withTiming(start + approach, { duration: approachMs, easing: Easing.linear }),
        withTiming(start + approach + pass, { duration: HIT_PASS_MS, easing: Easing.linear }),
      );
      later(outcomeTimers, approachMs, flinch);
      lift.value = withDelay(approachMs, withSequence(withTiming(0.15, { duration: 110 }), withTiming(0, { duration: 130 })));
      obstacleWobble.value = withDelay(
        approachMs,
        withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 110 }), withTiming(0, { duration: 120 })),
      );
      dizzy.value = withDelay(approachMs, withSequence(withTiming(1, { duration: 120 }), withDelay(600, withTiming(0, { duration: 240 }))));
      spin.value = 0;
      spin.value = withDelay(approachMs, withTiming(360, { duration: 900, easing: Easing.linear }));
    }
    // If no new round has opened by the time the obstacle is gone, keep the owl running.
    later(outcomeTimers, Math.max(0, busyUntil.current - Date.now()), () => {
      if (!live.current.roundOpen) cruise();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, roundId]);

  const owlStyle = useAnimatedStyle(() => ({
    opacity: blink.value,
    transform: [{ translateY: -lift.value * JUMP_HEIGHT }, { rotate: `${tilt.value}deg` }, { scaleY: 1 - lift.value * 0.05 }],
  }));
  const obstacleStyle = useAnimatedStyle(() => ({
    opacity: obstacleVisible.value,
    transform: [
      { translateX: spawnX.value - (travel.value - spawnTravel.value) },
      { rotate: `${obstacleWobble.value * 6}deg` },
    ],
  }));
  const groundStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -(travel.value % DASH_PERIOD) }] }));
  const starsStyle = useAnimatedStyle(() => ({ opacity: dizzy.value, transform: [{ rotate: `${spin.value}deg` }] }));
  const cloudStyle = useAnimatedStyle(() => ({ transform: [{ translateX: width - cloud.value * (width + 120) }] }));

  const dashCount = Math.ceil(width / DASH_PERIOD) + 2;

  return (
    <View
      accessible
      accessibilityLabel={`Đường chạy, vòng ${roundNumber}`}
      onLayout={onLayout}
      className="overflow-hidden rounded-3xl border"
      style={{ height: ARENA_HEIGHT, backgroundColor: colors.listeningSoft, borderColor: colors.accentEdge }}
    >
      <Animated.View style={[{ position: 'absolute', top: 16, width: 56, height: 20, borderRadius: 10, backgroundColor: colors.surface, opacity: 0.8 }, cloudStyle]} />
      <Animated.View style={[{ position: 'absolute', top: 48, width: 40, height: 16, borderRadius: 8, backgroundColor: colors.surface, opacity: 0.55, left: 50 }, cloudStyle]} />

      <View
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={{ height: GROUND, backgroundColor: colors.accentSoft, borderTopWidth: 2, borderTopColor: colors.accentEdge }}
      >
        <Animated.View style={[{ flexDirection: 'row', paddingTop: 8 }, groundStyle]}>
          {Array.from({ length: dashCount }, (_, index) => (
            <View key={index} style={{ width: DASH_PERIOD, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: colors.accentEdge }} />
              <View style={{ width: 4, height: 4, marginTop: 6, borderRadius: 2, backgroundColor: colors.accentEdge, opacity: 0.7 }} />
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'flex-end', bottom: GROUND - 2, left: 0 }, obstacleStyle]}>
        <Obstacle variant={variant} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', bottom: GROUND - 3, left: owlX, width: OWL_SIZE, height: OWL_SIZE }, owlStyle]}>
        <OwlSprite walking={pose === 'walk'} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        className="absolute h-6 w-12 items-center justify-between"
        style={[{ bottom: GROUND + OWL_SIZE - 4, left: owlX + OWL_SIZE / 2 - 24 }, starsStyle]}
      >
        <Star size={13} color={colors.xp} fill={colors.xp} style={{ position: 'absolute', left: 0, top: 6 }} />
        <Star size={13} color={colors.xp} fill={colors.xp} style={{ position: 'absolute', left: 17, top: 0 }} />
        <Star size={13} color={colors.xp} fill={colors.xp} style={{ position: 'absolute', right: 0, top: 6 }} />
      </Animated.View>
    </View>
  );
});
