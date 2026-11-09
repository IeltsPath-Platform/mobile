import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { vocabApi } from '@/src/features/vocab/api';
import { TopicCourseSection } from '@/src/features/vocab/components/topic-course-section';
import { colors } from '@/src/theme';

export default function VocabularyTopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const topics = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 300_000 });
  const topic = topics.data?.find((item) => item.id === topicId);
  return <View className="flex-1 bg-canvas">
    <BackHeader title="Từ vựng" fallbackHref="/(tabs)/practice" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-10 pt-3">
      {topic ? <TopicCourseSection topic={topic} />
        : topics.isPending ? <ActivityIndicator color={colors.accent} />
          : <View className="gap-4 rounded-3xl border border-line bg-surface p-5">
            <Text weight="bold">{topics.isError ? 'Chưa tải được chủ đề' : 'Không tìm thấy chủ đề này'}</Text>
            {topics.isError ? <Button label="Thử lại" onPress={() => void topics.refetch()} /> : null}
          </View>}
    </ScrollView>
  </View>;
}
