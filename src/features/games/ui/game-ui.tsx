import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Award, Flame, Heart, Timer, X, type LucideIcon } from 'lucide-react-native';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { GAME_META, gameTone, type GameKind } from '../game-meta';
import type { RankingPlayer } from '../types';

/** Top row of every in-game screen: exit, game mark, score. */
export function GameHud({
  kind,
  score,
  leaving,
  onExit,
  right,
}: {
  kind: GameKind;
  score: number;
  leaving: boolean;
  onExit: () => void;
  right?: ReactNode;
}) {
  const { Icon, name } = GAME_META[kind];
  const tone = gameTone(kind);
  return (
    <View className="flex-row items-center gap-3 px-4 pb-2 pt-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rời ván chơi"
        disabled={leaving}
        onPress={onExit}
        className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface active:opacity-70"
      >
        {leaving ? <ActivityIndicator size="small" color={colors.ink} /> : <X size={19} color={colors.ink} strokeWidth={2.5} />}
      </Pressable>
      <View className="flex-1 flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: tone.soft }}>
          <Icon size={17} color={tone.solid} />
        </View>
        <Text weight="black" className="text-base tracking-wide">
          {name}
        </Text>
      </View>
      {right}
      <View
        accessibilityLabel={`${score} điểm`}
        className="h-10 flex-row items-center gap-1.5 rounded-full px-3.5"
        style={{ backgroundColor: colors.warmSoft }}
      >
        <Award size={15} color={colors.xpDeep} />
        <Text weight="black" className="text-sm" style={{ color: colors.xpDeep }}>
          {score}
        </Text>
      </View>
    </View>
  );
}

export function Hearts({ remaining, total }: { remaining: number; total: number }) {
  const slots = Math.min(Math.max(total, remaining, 1), 6);
  return (
    <View accessible accessibilityLabel={`Còn ${remaining} mạng`} className="flex-row items-center gap-0.5">
      {Array.from({ length: slots }, (_, index) => {
        const alive = index < remaining;
        return (
          <Heart
            key={index}
            size={19}
            color={alive ? colors.danger : colors.line}
            fill={alive ? colors.danger : 'transparent'}
          />
        );
      })}
    </View>
  );
}

export function StreakChip({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <View className="h-8 flex-row items-center gap-1 rounded-full px-2.5" style={{ backgroundColor: colors.warmSoft }}>
      <Flame size={14} color={colors.accentWarm} fill={colors.accentWarm} />
      <Text weight="black" className="text-xs" style={{ color: colors.xpDeep }}>
        {streak}
      </Text>
    </View>
  );
}

/** Seconds pill that pulses once time is nearly gone. */
export function TimerPill({ seconds, urgentAt = 5 }: { seconds: number; urgentAt?: number }) {
  const urgent = seconds <= urgentAt;
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (urgent && !reduceMotion) {
      pulse.value = withRepeat(withSequence(withTiming(1.1, { duration: 300 }), withTiming(1, { duration: 300 })), -1);
    } else {
      pulse.value = withTiming(1, { duration: 120 });
    }
  }, [urgent, reduceMotion, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const tint = urgent ? colors.danger : colors.accent;
  return (
    <Animated.View
      accessibilityLabel={`Còn ${seconds} giây`}
      className="h-8 flex-row items-center gap-1 rounded-full px-2.5"
      style={[{ backgroundColor: urgent ? colors.dangerSoft : colors.accentSoft }, style]}
    >
      <Timer size={14} color={tint} />
      <Text weight="black" className="text-xs" style={{ color: tint }}>
        {seconds}s
      </Text>
    </Animated.View>
  );
}

/** Thin progress bar; `ratio` is 0..1 and eases between updates. */
export function ProgressBar({ ratio, color = colors.accent, height = 6 }: { ratio: number; color?: string; height?: number }) {
  const value = useSharedValue(ratio);
  useEffect(() => {
    value.value = withTiming(Math.min(1, Math.max(0, ratio)), { duration: 900, easing: Easing.linear });
  }, [ratio, value]);
  // scaleX from the left edge animates on the UI thread without a layout pass per frame.
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: value.value }] }));
  return (
    <View className="overflow-hidden rounded-full" style={{ height, backgroundColor: colors.line }}>
      <Animated.View className="h-full w-full rounded-full" style={[{ backgroundColor: color, transformOrigin: 'left' }, style]} />
    </View>
  );
}

/** Horizontal single-select chip row. */
export function ChipRow<T extends string | number | null>({
  options,
  value,
  onChange,
  accent = colors.accent,
  soft = colors.accentSoft,
  scroll = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  accent?: string;
  soft?: string;
  scroll?: boolean;
}) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={String(option.value)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        className="min-h-11 items-center justify-center rounded-full border px-4 active:opacity-70"
        style={{ borderColor: selected ? accent : colors.line, backgroundColor: selected ? soft : colors.surface }}
      >
        <Text weight={selected ? 'bold' : 'semibold'} className="text-sm" style={{ color: selected ? accent : colors.muted }}>
          {option.label}
        </Text>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {chips}
      </ScrollView>
    );
  }
  return <View className="flex-row flex-wrap gap-2">{chips}</View>;
}

/** Live standings for multiplayer matches: one compact chip per player. */
export function StandingsStrip({ players, meId }: { players: RankingPlayer[]; meId?: string }) {
  if (players.length < 2) return null;
  const sorted = [...players].sort((a, b) => a.rank - b.rank);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      className="mb-2 grow-0"
    >
      {sorted.map((player) => {
        const me = player.userId === meId;
        const out = player.status !== 'ACTIVE';
        return (
          <View
            key={player.userId}
            className="h-10 flex-row items-center gap-2 rounded-full border px-3"
            style={{
              borderColor: me ? colors.accent : colors.line,
              backgroundColor: me ? colors.accentSoft : colors.surface,
              opacity: out ? 0.55 : 1,
            }}
          >
            <Text weight="black" className="text-xs text-muted">
              #{player.rank}
            </Text>
            <Text weight="bold" numberOfLines={1} className="max-w-[88px] text-xs">
              {me ? 'Bạn' : (player.displayName ?? 'Người chơi')}
            </Text>
            <Text weight="black" className="text-xs" style={{ color: colors.accent }}>
              {player.totalScore}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

type StateAction = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' };

/** Full-screen loading / error state shared by every game screen. */
export function GameStateScreen({
  icon: Icon,
  title,
  message,
  loading = false,
  actions = [],
  backHref,
  onBack,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  loading?: boolean;
  actions?: StateAction[];
  backHref?: string;
  onBack?: () => void;
}) {
  return (
    <View className="flex-1 bg-canvas">
      <View className="px-4 pt-1">
        <BackButton fallbackHref={backHref ?? '/(tabs)/practice'} onBack={onBack} />
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-20 w-20 items-center justify-center rounded-[28px]" style={{ backgroundColor: colors.accentSoft }}>
          {loading ? <ActivityIndicator size="large" color={colors.accent} /> : Icon ? <Icon size={32} color={colors.accent} /> : null}
        </View>
        <Text accessibilityRole="header" weight="black" className="mt-5 text-center text-xl">
          {title}
        </Text>
        {message ? <Text className="mt-2 text-center text-sm leading-6 text-muted">{message}</Text> : null}
        <View className="mt-6 w-full gap-3">
          {actions.map((action) => (
            <Button key={action.label} label={action.label} variant={action.variant} onPress={action.onPress} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Compact lives indicator: one heart and a count, for crowded top bars. */
export function LivesBadge({ remaining }: { remaining: number }) {
  const low = remaining <= 1;
  return (
    <View
      accessible
      accessibilityLabel={`Còn ${remaining} mạng`}
      className="h-9 flex-row items-center gap-1 rounded-full px-2.5"
      style={{ backgroundColor: colors.dangerSoft }}
    >
      <Heart size={15} color={colors.danger} fill={colors.danger} />
      <Text weight="black" className="text-sm" style={{ color: low ? colors.danger : colors.ink }}>
        {remaining}
      </Text>
    </View>
  );
}
