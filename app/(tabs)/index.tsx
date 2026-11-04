import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Coins, Flame } from 'lucide-react-native';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useProgress } from '@/src/features/progress/progress-summary';
import { useStreak } from '@/src/features/progress/use-streak';
import { vocabApi } from '@/src/features/vocab/api';
import { TopicCourseSection } from '@/src/features/vocab/components/topic-course-section';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  useFocusEffect(useCallback(() => () => scrollRef.current?.scrollTo({ y: 0, animated: false }), []));
  const queryClient = useQueryClient();
  const progress = useProgress();
  const streak = useStreak();
  const topicsQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const topics = useMemo(() => [...(topicsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [topicsQuery.data]);

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center px-5 pb-3 pt-2">
        <Image source={require('@/assets/images/owl/nav-owl-stand.webp')} accessibilityLabel="Cú IELTSPath" className="mr-2 h-9 w-9" resizeMode="contain" />
        <Text accessibilityRole="header" weight="black" className="flex-1 text-[23px]">Hôm nay</Text>
        <View className="flex-row items-center gap-1 px-2" accessibilityLabel={`Chuỗi học ${streak.currentDays ?? 0} ngày`}>
          <Flame size={16} color={colors.flame} fill={colors.flame} />
          <Text weight="bold" className="text-sm">{streak.currentDays ?? '—'}</Text>
        </View>
        <View className="ml-2 flex-row items-center gap-1 px-2" accessibilityLabel={`Tổng XP ${progress.data?.totalXp ?? 'chưa có dữ liệu'}`}>
          <Coins size={16} color={colors.coin} />
          <Text weight="bold" className="text-sm">{progress.data?.totalXp ?? '—'}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="px-5 pb-10 pt-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={topicsQuery.isRefetching} onRefresh={() => { void topicsQuery.refetch(); void streak.refetch?.(); }} tintColor={colors.accent} />}>
          {topicsQuery.isPending ? <View className="items-center py-12"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải chủ đề…</Text></View> : null}
          {topicsQuery.isError ? <View className="mb-5 rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa tải được chủ đề</Text><Text className="mt-2 text-sm leading-5 text-muted">Kiểm tra kết nối máy chủ rồi thử lại.</Text><Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void queryClient.invalidateQueries({ queryKey: ['vocab', 'topics'] })} /></View> : null}
          {topicsQuery.isSuccess && !topics.length ? <View className="rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa có chủ đề từ vựng</Text><Text className="mt-2 text-sm text-muted">Các chủ đề sẽ hiện ở đây sau khi được xuất bản.</Text></View> : null}
          {topics.map((topic) => <TopicCourseSection key={topic.id} topic={topic} />)}
      </ScrollView>
    </View>
  );
}
