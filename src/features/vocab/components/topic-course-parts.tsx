import { Image } from 'expo-image';
import { Check, LockKeyhole, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

/** Full-width topic header with optional cover art and a bright fallback panel. */
export function TopicBanner({
  cover,
  title,
  subtitle,
}: {
  cover: string | null | undefined;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: colors.heroStart }}>
      <View className="h-[150px] items-center justify-center overflow-hidden px-4">
        {cover ? (
          <>
            <Image
              source={{ uri: cover }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <>
            <View
              className="absolute -right-10 -top-12 h-44 w-44 rounded-full"
              style={{ backgroundColor: colors.heroEnd, opacity: 0.55 }}
            />
            <View
              className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full"
              style={{ backgroundColor: colors.heroEnd, opacity: 0.35 }}
            />
          </>
        )}
        <Text weight="black" className="text-center text-[11px] uppercase tracking-[2px] text-white/80">
          Chủ đề từ vựng
        </Text>
        <Text weight="black" className="mt-1 text-center text-2xl leading-8 text-white" numberOfLines={2}>
          {title}
        </Text>
      </View>
      <View className="items-center py-2.5" style={{ backgroundColor: colors.accentShade }}>
        <Text weight="bold" className="text-sm text-white">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const NODE = 76;
const RING = 8;
const OUTER = NODE + RING * 2;
const RADIUS = (OUTER - RING) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Round lesson button with a solid face over a darker edge (like the action buttons).
 * `current` adds a progress ring filled by `ratio` (real completed/total steps) and a "HỌC TIẾP" tag.
 */
export function LessonNode({
  title,
  meta,
  icon: Icon,
  done,
  unlocked,
  disabled,
  current = false,
  ratio = 0,
  onPress,
}: {
  title: string;
  meta: string;
  icon: LucideIcon;
  done: boolean;
  unlocked: boolean;
  disabled: boolean;
  /** The lesson the learner should do next. */
  current?: boolean;
  /** Fraction (0-1) of the current lesson already completed, from server progress. */
  ratio?: number;
  onPress: () => void;
}) {
  const face = done ? colors.success : unlocked ? colors.accent : colors.disabledFill;
  const edge = done ? colors.successShade : unlocked ? colors.accentShade : colors.edge;
  const safeRatio = Math.min(1, Math.max(0, ratio));

  return (
    <View className="mb-6 w-1/3 items-center px-1">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${done ? 'Đã hoàn thành' : current ? 'Bài hiện tại' : unlocked ? 'Bắt đầu bài' : 'Bị khóa, hoàn thành bài trước để mở'}: ${title}`}
        disabled={disabled}
        onPress={onPress}
        className="items-center active:opacity-80">
        <View style={{ width: OUTER, height: OUTER, alignItems: 'center', justifyContent: 'center' }}>
          {current ? (
            <Svg width={OUTER} height={OUTER} style={StyleSheet.absoluteFill}>
              <Circle cx={OUTER / 2} cy={OUTER / 2} r={RADIUS} stroke={colors.line} strokeWidth={RING} fill="none" />
              {safeRatio > 0 ? (
                <Circle
                  cx={OUTER / 2}
                  cy={OUTER / 2}
                  r={RADIUS}
                  stroke={colors.accent}
                  strokeWidth={RING}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${CIRCUMFERENCE * safeRatio} ${CIRCUMFERENCE}`}
                  transform={`rotate(-90 ${OUTER / 2} ${OUTER / 2})`}
                />
              ) : null}
            </Svg>
          ) : null}
          <View style={{ width: NODE, height: NODE + 6, borderRadius: NODE / 2, backgroundColor: edge }}>
            <View
              style={{
                width: NODE,
                height: NODE,
                borderRadius: NODE / 2,
                backgroundColor: face,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {done ? (
                <Check size={34} color={colors.surface} strokeWidth={4} />
              ) : unlocked ? (
                <Icon size={30} color={colors.surface} fill={colors.surface} />
              ) : (
                <LockKeyhole size={24} color={colors.muted} />
              )}
            </View>
          </View>
        </View>

        <Text
          numberOfLines={3}
          weight="bold"
          className="mt-1 min-h-[40px] px-1 text-center text-xs leading-[17px]"
          style={{ color: done ? colors.success : unlocked ? colors.ink : colors.muted }}>
          {title}
        </Text>
        {current ? (
          <View className="mt-1 rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.accentSoft }}>
            <Text weight="black" className="text-[10px] uppercase" style={{ color: colors.accentDeep }}>
              Học tiếp
            </Text>
          </View>
        ) : (
          <Text className="mt-1 text-center text-[11px] text-muted">{unlocked || done ? meta : 'Hoàn thành bài trước'}</Text>
        )}
      </Pressable>
    </View>
  );
}
