import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Coins, Flame } from 'lucide-react-native';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useProgress } from '@/src/features/progress/progress-summary';
import { useStreak } from '@/src/features/progress/use-streak';
import { vocabApi } from '@/src/features/vocab/api';
import { TopicCourseSection } from '@/src/features/vocab/components/topic-course-section';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

export default function HomeScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  useFocusEffect(useCallback(() => () => scrollRef.current?.scrollTo({ y: 0, animated: false }), []));
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const progress = useProgress();
  const streak = useStreak();
  const topicsQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const topics = useMemo(() => [...(topicsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [topicsQuery.data]);

  return (
    <View className="flex-1 bg-canvas">
      <View className="overflow-hidden px-5 pb-4 pt-2" style={{ backgroundColor: isDark ? '#111418' : colors.surface }}>
          <FeatherOrnament color={isDark ? '#9eb1ff' : colors.accent} style={{ right: -34, top: -28, transform: [{ rotate: '-24deg' }] }} opacity={isDark ? 0.28 : 0.16} size={152} />
          <FeatherOrnament color={isDark ? '#9eb1ff' : colors.accent} style={{ left: -42, top: 42, transform: [{ rotate: '154deg' }] }} opacity={isDark ? 0.22 : 0.12} size={106} />
          <Text pointerEvents="none" className="absolute right-24 top-2 text-lg" style={{ color: isDark ? '#ffffff40' : '#163c7625' }}>✦</Text>
          <Text pointerEvents="none" className="absolute bottom-9 left-[42%] text-xs" style={{ color: isDark ? '#ffffff40' : '#163c7625' }}>✧</Text>

          <View className="h-8 flex-row items-center justify-center">
            <Image source={require('@/assets/images/owl/nav-owl-stand.webp')} accessibilityLabel="Cú IELTSPath" className="mr-1.5 h-6 w-6" resizeMode="contain" />
            <Text weight="black" className={`text-base tracking-wide ${isDark ? 'text-white' : 'text-ink'}`}>IELTSPath</Text>
          </View>

          <View className="mt-3 flex-row items-center gap-2">
            <View accessibilityLabel="Tiếng Anh" className="h-10 w-12 items-center justify-center rounded-xl border" style={{ borderColor: isDark ? '#ffffff33' : colors.line, backgroundColor: isDark ? '#00000030' : colors.canvas }}>
              <Text className="text-[25px] leading-[30px]">🇺🇸</Text>
            </View>
            <View accessibilityLabel={`Chuỗi học: ${streak.currentDays ?? 'chưa có dữ liệu'} ngày`} className="min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border px-2.5" style={{ borderColor: isDark ? '#ffffff26' : colors.line, backgroundColor: isDark ? '#00000055' : colors.canvas }}>
              <Flame size={17} color="#ff864b" fill="#ff864b" />
              <Text weight="black" className={`text-sm ${isDark ? 'text-white' : 'text-ink'}`}>{streak.currentDays ?? '—'}</Text>
            </View>
            <View accessibilityLabel={`Tổng XP: ${progress.data?.totalXp ?? 'chưa có dữ liệu'}`} className="min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border px-2.5" style={{ borderColor: isDark ? '#ffffff26' : colors.line, backgroundColor: isDark ? '#00000055' : colors.canvas }}>
              <Coins size={16} color="#f4c44e" />
              <Text weight="black" className={`text-sm ${isDark ? 'text-white' : 'text-ink'}`}>{progress.data?.totalXp ?? '—'}</Text>
            </View>
          </View>
      </View>

      <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
          {topicsQuery.isPending ? <View className="items-center py-12"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải chủ đề…</Text></View> : null}
          {topicsQuery.isError ? <View className="mb-5 rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa tải được chủ đề</Text><Text className="mt-2 text-sm leading-5 text-muted">Kiểm tra kết nối máy chủ rồi thử lại.</Text><Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void queryClient.invalidateQueries({ queryKey: ['vocab', 'topics'] })} /></View> : null}
          {topicsQuery.isSuccess && !topics.length ? <View className="rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa có chủ đề từ vựng</Text><Text className="mt-2 text-sm text-muted">Các chủ đề sẽ hiện ở đây sau khi được xuất bản.</Text></View> : null}
          {topics.map((topic) => <TopicCourseSection key={topic.id} topic={topic} />)}
      </ScrollView>
    </View>
  );
}

function FeatherOrnament({ color, opacity, size, style }: { color: string; opacity: number; size: number; style: StyleProp<ViewStyle> }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" pointerEvents="none" style={[{ position: 'absolute' }, style]}>
      <Path d="M17 143C28 105 43 68 69 39 92 14 120 7 148 10c2 30-7 62-27 87-23 29-59 44-104 46Z" fill={color} opacity={opacity} />
      <Path d="M20 141C58 105 99 57 147 11" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={Math.min(opacity + 0.22, 0.55)} />
      <Path d="M43 116c-9-2-17-8-23-16m36-5c-11-3-19-9-25-17m38 3c-10-3-18-9-24-17m39 1c-10-4-17-10-23-18m40 1c-8-4-15-10-20-17m36-2c-7-4-12-9-17-15M62 126c-2-10-1-18 3-27m18 14c-1-10 1-19 6-27m17 12c0-9 3-18 8-25m14 7c1-8 4-16 9-23" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={Math.min(opacity + 0.12, 0.42)} />
    </Svg>
  );
}
