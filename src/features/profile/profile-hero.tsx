import { Animated, Image, Pressable, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type Props = {
  xpToday: number;
  dailyGoal: number;
  pulse: Animated.Value;
  onStart: () => void;
};

export function ProfileHero({ pulse, xpToday, dailyGoal, onStart }: Props) {
  const goal = Math.max(dailyGoal, 1);
  const progress = Math.min(100, Math.round((xpToday / goal) * 100));

  return (
    <View className="mb-4 min-h-[190px] overflow-hidden rounded-[20px] p-5" style={{ backgroundColor: colors.heroStart }}>
      <View className="max-w-[56%]">
        <Text weight="bold" className="text-sm text-white/80">Hôm nay</Text>
        <View className="mt-2 flex-row items-baseline gap-2">
          <Text weight="black" className="text-[40px] leading-[46px] text-white">{xpToday}</Text>
          <Text weight="bold" className="text-sm text-white/75">XP</Text>
        </View>
        <Text className="mt-0.5 text-xs text-white/75">Mục tiêu {goal} XP · {progress}% hoàn thành</Text>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: colors.coin }} />
        </View>
        <Pressable accessibilityRole="button" onPress={onStart} className="mt-3 min-h-10 flex-row items-center gap-2 self-start rounded-full px-4" style={{ backgroundColor: colors.surface }}>
          <Text weight="bold" className="text-xs text-accent-deep">Học tiếp</Text>
          <ArrowRight size={15} color={colors.accentDeep} />
        </Pressable>
      </View>
      <Animated.View
        className="absolute -bottom-3 -right-4 h-[148px] w-[148px]"
        style={{ transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.015] }) }] }}>
        <Image source={require('@/assets/images/owl/hero-cheer.webp')} resizeMode="contain" accessibilityLabel="Cú IELTSPath cổ vũ bạn học" className="h-full w-full" />
      </Animated.View>
    </View>
  );
}
