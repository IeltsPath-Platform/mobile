import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Coins, Flame } from 'lucide-react-native';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { useProgress } from '@/src/features/progress/progress-summary';
import { useStreak } from '@/src/features/progress/use-streak';
import { vocabApi, type VocabularyTopic } from '@/src/features/vocab/api';
import { TopicCourseSection } from '@/src/features/vocab/components/topic-course-section';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const listRef = useRef<FlatList<VocabularyTopic>>(null);
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  const progress = useProgress();
  const streak = useStreak();

  const vocabularyTopicsQuery = useQuery({
    queryKey: ['vocab', 'topics'],
    queryFn: ({ signal }) => vocabApi.listTopics(signal),
    staleTime: 5 * 60_000,
  });

  const topics = useMemo(
    () => [...(vocabularyTopicsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [vocabularyTopicsQuery.data],
  );

  useFocusEffect(useCallback(() => () => listRef.current?.scrollToOffset({ offset: 0, animated: false }), []));

  const refreshing = vocabularyTopicsQuery.isRefetching;
  const refetch = () => {
    void vocabularyTopicsQuery.refetch();
    if (signedIn) {
      void Promise.all([progress.refetch(), streak.refetch()]);
    }
  };
  const hasError = vocabularyTopicsQuery.isError;
  const isPending = vocabularyTopicsQuery.isPending;

  return (
    <View className="flex-1 bg-canvas">
      <FlatList<VocabularyTopic>
        ref={listRef}
        data={topics}
        keyExtractor={(topic) => topic.id}
        renderItem={({ item }) => <TopicCourseSection topic={item} />}
        ListHeaderComponent={(
          <View className="mb-1">
            <View className="flex-row items-center px-5 pb-3 pt-2">
              <Image source={require('@/assets/images/owl/nav-owl-stand.webp')} accessibilityLabel="Cú IELTSPath" className="mr-2 h-9 w-9" resizeMode="contain" />
              <Text accessibilityRole="header" weight="black" className="flex-1 text-[23px]">Hôm nay</Text>
              {signedIn ? (
                <>
                  <View className="flex-row items-center gap-1 px-2" accessibilityLabel={`Chuỗi học ${streak.currentDays ?? 0} ngày`}>
                    <Flame size={16} color={colors.flame} fill={colors.flame} />
                    <Text weight="bold" className="text-sm">{streak.currentDays ?? '—'}</Text>
                  </View>
                  <View className="ml-2 flex-row items-center gap-1 px-2" accessibilityLabel={`Tổng XP ${progress.data?.totalXp ?? 'chưa có dữ liệu'}`}>
                    <Coins size={16} color={colors.coin} />
                    <Text weight="bold" className="text-sm">{progress.data?.totalXp ?? '—'}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View className="mx-5 rounded-3xl border border-line bg-surface p-5">
            {isPending ? (
              <View className="items-center py-7"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải chủ đề…</Text></View>
            ) : hasError ? (
              <>
                <Text weight="bold">Chưa tải được chủ đề từ vựng</Text>
                <Text className="mt-2 text-sm leading-5 text-muted">Kiểm tra kết nối máy chủ rồi thử lại.</Text>
                <Button className="mt-4" variant="secondary" label="Thử lại" onPress={refetch} />
              </>
            ) : (
              <>
                <Text weight="bold">Chưa có chủ đề từ vựng</Text>
                <Text className="mt-2 text-sm text-muted">Các chủ đề sẽ xuất hiện sau khi được xuất bản.</Text>
              </>
            )}
          </View>
        )}
        contentContainerClassName="px-5 pb-10 pt-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.accent} />}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
      />
    </View>
  );
}
