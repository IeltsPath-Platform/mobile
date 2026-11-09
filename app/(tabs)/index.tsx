import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Text } from '@/src/components/ui/text';
import { ContinueCard } from '@/src/features/vocab/components/continue-card';
import { useAuth } from '@/src/features/auth/auth-provider';
import { vocabApi, type VocabularyTopic } from '@/src/features/vocab/api';
import { TodayHeader } from '@/src/features/vocab/components/study-account-panel';
import { TopicCourseSection } from '@/src/features/vocab/components/topic-course-section';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import { useTabBarScrollHandler, useTabReselect } from '@/src/components/navigation/tab-reselect-context';

export default function HomeScreen() {
  useTheme();
  const { status, authEnabled } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<VocabularyTopic>>(null);
  const refreshPrimed = useRef(false);
  const handleTabBarScroll = useTabBarScrollHandler();

  const vocabularyTopicsQuery = useQuery({
    queryKey: ['vocab', 'topics'],
    queryFn: ({ signal }) => vocabApi.listTopics(signal),
    staleTime: 5 * 60_000,
  });

  const topics = useMemo(
    () => [...(vocabularyTopicsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [vocabularyTopicsQuery.data],
  );

  const topicIds = useMemo(() => topics.map((topic) => topic.id), [topics]);
  const progressQuery = useQuery({
    queryKey: [...studyKeys.progress, topicIds],
    queryFn: ({ signal }) => vocabularyStudyApi.progress(topicIds, signal),
    enabled: signedIn && topicIds.length > 0,
    staleTime: 30_000,
  });

  const progressByTopic = useMemo(
    () => new Map((progressQuery.data ?? []).map((item) => [item.topicId, item])),
    [progressQuery.data],
  );

  useFocusEffect(
    useCallback(() => {
      refreshPrimed.current = false;
      // Refetch only stale data when returning to this tab. Cached topic cards
      // remain visible during the request, so the page never flashes empty.
      void queryClient.refetchQueries({ queryKey: ['vocab', 'topics'], type: 'active', stale: true });
      if (signedIn) void queryClient.refetchQueries({ queryKey: studyKeys.summary, type: 'active', stale: true });
      if (signedIn) void queryClient.refetchQueries({ queryKey: studyKeys.progress, type: 'active', stale: true });
    }, [queryClient, signedIn]),
  );

  const refetchTopics = vocabularyTopicsQuery.refetch;
  const refetchProgress = progressQuery.refetch;
  const refreshing = vocabularyTopicsQuery.isRefetching || progressQuery.isRefetching;
  const refreshAll = useCallback(() => {
    void refetchTopics();
    void queryClient.invalidateQueries({ queryKey: studyKeys.unitLists });
    if (signedIn) {
      void queryClient.invalidateQueries({ queryKey: studyKeys.summary });
      void queryClient.invalidateQueries({ queryKey: studyKeys.progress });
    }
  }, [queryClient, refetchTopics, signedIn]);

  const refreshFromTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (!refreshPrimed.current) {
      refreshPrimed.current = true;
      return;
    }
    refreshPrimed.current = false;
    refreshAll();
  }, [refreshAll]);

  useTabReselect('index', refreshFromTop);

  const hasError = vocabularyTopicsQuery.isError;
  const isPending = vocabularyTopicsQuery.isPending;

  return (
    <View className="flex-1 bg-canvas">
      <FlatList<VocabularyTopic>
        ref={listRef}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
        data={topics}
        keyExtractor={(topic) => topic.id}
        renderItem={({ item }) => (
          <TopicCourseSection
            topic={item}
            progressQuery={
              signedIn
                ? {
                    data: progressByTopic.get(item.id) ?? null,
                    isPending: progressQuery.isPending,
                    error: progressQuery.error,
                    refetch: () => void refetchProgress(),
                  }
                : undefined
            }
          />
        )}
        ListHeaderComponent={
          <View className="pb-1 pt-1">

            <TodayHeader signedIn={signedIn} />
            {signedIn && progressQuery.data ? <ContinueCard topics={topics} progress={progressQuery.data} /> : null}

            {topics.length > 0 ? (
              <View className="mb-3 mt-1 flex-row items-center justify-between">
                <Text accessibilityRole="header" weight="black" className="text-lg text-ink">
                  Khóa học từ vựng
                </Text>
                <Text className="text-xs text-muted">
                  {topics.length} chủ đề
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="items-center rounded-3xl border border-line bg-surface py-10">
              <ActivityIndicator color={colors.accent} />
              <Text className="mt-3 text-sm text-muted">Đang tải chủ đề…</Text>
            </View>
          ) : hasError ? (
            <EmptyState
              title="Chưa tải được chủ đề từ vựng"
              message="Kiểm tra kết nối máy chủ rồi thử lại."
              action={<Button variant="secondary" label="Thử lại" onPress={refreshAll} />}
            />
          ) : (
            <EmptyState title="Chưa có chủ đề từ vựng" message="Các chủ đề sẽ xuất hiện sau khi được xuất bản." />
          )
        }
        contentContainerClassName="px-4 pb-28 pt-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.accent} />}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
      />
    </View>
  );
}
