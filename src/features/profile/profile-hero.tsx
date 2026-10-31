import { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, Pressable, View } from 'react-native';
import { Play, Sparkles, Zap } from 'lucide-react-native';

import { Text } from '@/src/components/ui/text';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import type { VocabularyTopic } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

type Props = {
  topics: VocabularyTopic[];
  pulse: Animated.Value;
  xpToday: number;
  dailyGoal: number;
  onStart: () => void;
};

export function ProfileHero({ topics, pulse, xpToday, dailyGoal, onStart }: Props) {
  const blink = useRef(new Animated.Value(0)).current;
  const goal = Math.max(dailyGoal, 1);
  const progress = Math.min(100, Math.round((xpToday / goal) * 100));

  useEffect(() => {
    const blinkLoop = Animated.loop(Animated.sequence([
      Animated.delay(2800),
      Animated.timing(blink, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.delay(90),
      Animated.timing(blink, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]));
    blinkLoop.start();
    return () => blinkLoop.stop();
  }, [blink]);

  const covers = topics.slice(1, 4).map(topicCover).filter((cover): cover is string => Boolean(cover));

  return (
    <View className="-mx-5 mb-5 h-[440px] overflow-hidden" style={{ backgroundColor: colors.heroStart }}>
      <View className="absolute inset-x-0 bottom-0 h-[48%]" style={{ backgroundColor: '#03070b' }} />
      <View className="absolute inset-0 flex-row justify-between px-[8%]">
        {Array.from({ length: 7 }, (_, index) => <View key={index} className="h-full w-px" style={{ backgroundColor: '#bceaff12' }} />)}
      </View>
      <View className="absolute inset-0 justify-between py-[4%]">
        {Array.from({ length: 8 }, (_, index) => <View key={index} className="h-px w-full" style={{ backgroundColor: '#bceaff12' }} />)}
      </View>

      {covers[0] ? <ImageBackground source={{ uri: covers[0] }} resizeMode="cover" className="absolute -left-5 top-2 h-[94px] w-[124px] overflow-hidden rounded-2xl border-[5px] border-white" style={{ transform: [{ rotate: '-16deg' }] }}><View className="absolute inset-0 bg-black/10" /></ImageBackground> : null}
      {covers[1] ? <ImageBackground source={{ uri: covers[1] }} resizeMode="cover" className="absolute -right-7 top-[150px] h-[115px] w-[92px] overflow-hidden rounded-2xl border-[5px] border-white" style={{ transform: [{ rotate: '14deg' }] }}><View className="absolute inset-0 bg-black/10" /></ImageBackground> : null}
      {covers[2] ? <ImageBackground source={{ uri: covers[2] }} resizeMode="cover" className="absolute -left-8 top-[215px] h-[92px] w-[76px] overflow-hidden rounded-2xl border-[5px] border-white" style={{ transform: [{ rotate: '11deg' }] }}><View className="absolute inset-0 bg-black/10" /></ImageBackground> : null}

      <View className="absolute left-8 top-[115px] h-9 w-9 rotate-[-12deg] items-center justify-center rounded-xl bg-[#16bf89]"><Zap size={20} color="#fff" fill="#fff" /></View>
      <View className="absolute right-10 top-[77px] h-8 w-8 items-center justify-center rounded-full bg-[#f3b92f]"><Sparkles size={17} color="#fff" /></View>
      <View className="absolute right-[27%] top-[180px]"><Sparkles size={13} color="#b6e8ff" /></View>

      <View className="absolute left-8 right-8 top-6 items-center">
        <View className="mb-3 w-full flex-row gap-1.5">
          {Array.from({ length: 7 }, (_, index) => <View key={index} className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"><View className="h-full rounded-full bg-white" style={{ width: `${Math.max(0, Math.min(100, progress * 7 - index * 100))}%` }} /></View>)}
        </View>
        <Text weight="bold" className="text-center text-sm text-white/70">Mục tiêu học hôm nay</Text>
        <Text weight="black" className="mt-1 text-[52px] leading-[60px] text-white">{xpToday}</Text>
        <Text weight="bold" className="text-center text-lg text-white/75">XP đã học hôm nay</Text>
        <Pressable accessibilityRole="button" onPress={onStart} className="mt-4 min-h-11 flex-row items-center gap-2 rounded-full px-5" style={{ backgroundColor: colors.accent }}>
          <Play size={16} color="#06131c" fill="#06131c" /><Text weight="black" className="text-sm" style={{ color: '#06131c' }}>Bắt đầu một bài học</Text>
        </Pressable>
      </View>

      <Animated.View className="absolute bottom-0 self-center" style={{ transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] }) }] }}>
        <View className="relative h-[236px] w-[236px]">
          <Image source={require('@/assets/images/owl/hero-cheer.webp')} resizeMode="contain" accessibilityLabel="Cú IELTSPath đang chớp mắt cổ vũ bạn" className="h-full w-full" />
          {[0, 1].map((eye) => <Animated.View key={eye} pointerEvents="none" className="absolute h-[13px] w-[25px] rounded-full border-b-2 border-[#2860ad] bg-[#f8fbff]" style={{ left: eye === 0 ? 82 : 124, top: 75, opacity: blink, transform: [{ scaleY: blink.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }] }} />)}
        </View>
      </Animated.View>
      <View className="absolute bottom-2 self-center h-3 w-40 rounded-full" style={{ backgroundColor: '#ffffff20' }} />
    </View>
  );
}
