import { Image } from 'expo-image';
import { Check, LockKeyhole, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

/** Full-width topic header with optional cover art. */
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
    <View
      className="h-[155px] items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: colors.heroStart }}
    >
      {cover ? (
        <>
          <Image
            source={{ uri: cover }}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            style={StyleSheet.absoluteFill}
          />
          <View className="absolute inset-0 bg-black/45" />
        </>
      ) : null}
      <View className="rounded-full border border-white/20 bg-white/15 px-3 py-0.5">
        <Text weight="black" className="text-[10px] uppercase tracking-[1.5px] text-white">
          CHỦ ĐỀ TỪ VỰNG
        </Text>
      </View>
      <Text weight="black" className="mt-1 text-center text-[22px] leading-7 text-white" numberOfLines={2}>
        {title}
      </Text>
      <View className="mt-2 rounded-full bg-black/35 px-3 py-1">
        <Text weight="bold" className="text-xs text-white/95">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/** Round lesson button used for both guest lessons and server units. */
export function LessonNode({
  title,
  meta,
  icon: Icon,
  done,
  unlocked,
  disabled,
  onPress,
}: {
  title: string;
  meta: string;
  icon: LucideIcon;
  done: boolean;
  unlocked: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="mb-6 w-1/3 items-center px-1">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${done ? 'Đã hoàn thành' : unlocked ? 'Bắt đầu bài' : 'Bị khóa'}: ${title}`}
        disabled={disabled}
        onPress={onPress}
        className="items-center active:opacity-75"
      >
        <View
          className="mb-2.5 h-[74px] w-[74px] items-center justify-center rounded-full"
          style={{
            backgroundColor: done ? colors.success : unlocked ? colors.accent : colors.surfaceTint,
            borderWidth: unlocked && !done ? 3 : 0,
            borderColor: colors.accentEdge,
            shadowColor: unlocked ? colors.accent : 'transparent',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: unlocked ? 0.35 : 0,
            shadowRadius: 5,
            elevation: unlocked ? 4 : 0,
          }}
        >
          {done ? (
            <Check size={32} color={colors.canvas} strokeWidth={3.5} />
          ) : unlocked ? (
            <Icon size={28} color={colors.canvas} fill={colors.canvas} />
          ) : (
            <LockKeyhole size={22} color={colors.muted} />
          )}
        </View>
        <Text
          numberOfLines={3}
          weight="bold"
          className="min-h-[48px] px-1 text-center text-xs leading-[17px]"
          style={{ color: done ? colors.success : unlocked ? colors.ink : colors.muted }}
        >
          {title}
        </Text>
        <Text className="mt-1 text-[11px] text-muted">{meta}</Text>
      </Pressable>
    </View>
  );
}
