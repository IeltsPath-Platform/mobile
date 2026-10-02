import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { isLearningApiError, learningApi, learningClientMode, resetMockLearning } from '@/src/features/learning';
import type { TopicStatus } from '@/src/features/learning/types';
import { colors } from '@/src/theme';

function statusLabel(status: TopicStatus) {
  if (status === 'PASSED') return 'Đã xong';
  if (status === 'IN_PROGRESS') return 'Đang học';
  return 'Khóa';
}

function statusColor(status: TopicStatus) {
  if (status === 'PASSED') return colors.success;
  if (status === 'IN_PROGRESS') return colors.accent;
  return colors.muted;
}

export function TopicList() {
  const query = useQuery({
    queryKey: ['learning', 'topics'],
    queryFn: () => learningApi.listTopics(),
  });

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text weight="bold" className="text-xs uppercase tracking-wide text-muted">
          Lộ trình Reading · {learningClientMode}
        </Text>
        {learningClientMode === 'mock' ? (
          <Pressable
            onPress={() => {
              resetMockLearning();
              void query.refetch();
            }}>
            <Text weight="bold" className="text-xs text-accent">
              Reset demo
            </Text>
          </Pressable>
        ) : null}
      </View>

      {query.isPending ? (
        <Text className="text-sm text-muted">Đang tải chủ đề…</Text>
      ) : query.error ? (
        <Text className="text-sm text-danger">
          {isLearningApiError(query.error) ? query.error.message : 'Không tải được lộ trình.'}
        </Text>
      ) : (
        query.data?.map((topic) => {
          const locked = topic.status === 'LOCKED';
          return (
            <Pressable
              key={topic.topicId}
              disabled={locked}
              onPress={() => router.push({ pathname: '/learn/topic/[topicId]', params: { topicId: topic.topicId } })}
              className="mb-3">
              <Card className={locked ? 'opacity-55' : ''}>
                <View className="flex-row items-center justify-between">
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${statusColor(topic.status)}22` }}>
                    <Text weight="bold" className="text-[11px]" style={{ color: statusColor(topic.status) }}>
                      {statusLabel(topic.status)}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-muted">#{topic.sequenceOrder}</Text>
                </View>
                <Text weight="extrabold" className="mt-2 text-base text-ink">
                  {topic.name}
                </Text>
                <Text className="mt-1 text-xs text-muted">
                  {topic.code} · {topic.completedLessonCount} bài đã hoàn thành
                </Text>
              </Card>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
