import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { vocabApi, type VocabularyTopic } from '@/src/features/vocab/api';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import { StudyAccountPanel } from '@/src/features/vocab/components/study-account-panel';
import { TopicCourseSection } from '@/src/features/vocab/components/topic-course-section';
import { colors } from '@/src/theme';

export default function HomeScreen() {
  const { status, authEnabled } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const queryClient = useQueryClient();


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
  const progressByTopic = useMemo(() => new Map((progressQuery.data ?? []).map((item) => [item.topicId, item])), [progressQuery.data]);
  useFocusEffect(useCallback(() => {
    if (signedIn) {
      void queryClient.invalidateQueries({ queryKey: studyKeys.summary });
      void queryClient.invalidateQueries({ queryKey: studyKeys.progress });
    }
  }, [queryClient, signedIn]));
  const refreshing = vocabularyTopicsQuery.isRefetching || progressQuery.isRefetching;
  const refetch = () => {
    void vocabularyTopicsQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: studyKeys.unitLists });
    if (signedIn) {
      void queryClient.invalidateQueries({ queryKey: studyKeys.summary });
      void queryClient.invalidateQueries({ queryKey: studyKeys.progress });
    }
  };
  const hasError = vocabularyTopicsQuery.isError;
  const isPending = vocabularyTopicsQuery.isPending;

  return (
    <View className="flex-1 bg-canvas">
      <FlatList<VocabularyTopic>
        data={topics}
        keyExtractor={(topic) => topic.id}
        renderItem={({ item }) => <TopicCourseSection topic={item} progressQuery={signedIn ? { data: progressByTopic.get(item.id) ?? null, isPending: progressQuery.isPending, error: progressQuery.error, refetch: () => { void progressQuery.refetch(); } } : undefined} />}
        ListHeaderComponent={(
          <View className="mb-1">
            <View className="flex-row items-center px-5 pb-3 pt-2">
              <Image source={require('@/assets/images/owl/nav-owl-stand.webp')} accessibilityLabel="Cú IELTSPath" className="mr-2 h-9 w-9" resizeMode="contain" />
              <Text accessibilityRole="header" weight="black" className="flex-1 text-[23px]">Hôm nay</Text>
            </View>
            {signedIn ? <StudyAccountPanel /> : null}
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
