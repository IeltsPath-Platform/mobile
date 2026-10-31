import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { isLearningApiError, learningApi } from '@/src/features/learning';
import type { LessonStatus, TestStatus } from '@/src/features/learning/types';
import { colors } from '@/src/theme';

function lessonLabel(status: LessonStatus) {
  if (status === 'COMPLETED') return 'Xong';
  if (status === 'AVAILABLE') return 'Học ngay';
  return 'Khóa';
}

function testLabel(status: TestStatus) {
  if (status === 'PASSED') return 'Đã đạt';
  if (status === 'AVAILABLE') return 'Làm đề cuối';
  return 'Đề cuối · khóa';
}

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const queryClient = useQueryClient();

  const lessonsQuery = useQuery({
    queryKey: ['learning', 'topic-lessons', topicId],
    queryFn: () => learningApi.getTopicLessons(topicId!),
    enabled: Boolean(topicId),
  });

  const pendingQuery = useQuery({
    queryKey: ['learning', 'pending-reviews'],
    queryFn: () => learningApi.getPendingReviews(),
  });

  const assignTest = useMutation({
    mutationFn: () => learningApi.createTestAssignment(topicId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['learning'] });
    },
  });

  if (lessonsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (lessonsQuery.error) {
    const err = lessonsQuery.error;
    const reviews = isLearningApiError(err) ? err.reviews : [];
    return (
      <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 py-6">
        <FormAlert tone="error" message={isLearningApiError(err) ? err.message : 'Không tải được chủ đề.'} />
        {reviews[0] ? (
          <View className="mt-4">
            <Button
              label="Làm bài ôn bắt buộc"
              onPress={() =>
                router.push({ pathname: '/learn/review/[reviewId]', params: { reviewId: reviews[0].reviewId } })
              }
            />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  const data = lessonsQuery.data!;
  const pending = pendingQuery.data;

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-3 px-5 pb-12 pt-4">
      {pendingQuery.isError ? (
        <Card>
          <FormAlert tone="error" message="Không tải được danh sách bài ôn." />
          <View className="mt-3">
            <Button label="Thử lại" variant="secondary" onPress={() => void pendingQuery.refetch()} />
          </View>
        </Card>
      ) : pending?.length ? (
        <Card>
          <Text weight="extrabold" className="text-accent-deep">
            Có bài ôn đang chờ
          </Text>
          <Text className="mt-1 text-sm text-muted">Hoàn thành review trước khi sang bài mới.</Text>
          <View className="mt-3">
            <Button label="Mở bài ôn" onPress={() => router.push({ pathname: '/learn/review/[reviewId]', params: { reviewId: pending[0].reviewId } })} />
          </View>
        </Card>
      ) : null}

      {data.lessons.map((lesson) => {
        const locked = lesson.status === 'LOCKED';
        return (
          <Pressable
            key={lesson.lessonId}
            disabled={locked}
            onPress={() => router.push({ pathname: '/learn/lesson/[lessonId]', params: { lessonId: lesson.lessonId } })}
            className={locked ? 'opacity-50' : ''}>
            <Card>
              <View className="flex-row items-center justify-between">
                <Text weight="bold" className="text-xs text-muted">
                  {lesson.code}
                </Text>
                <Text weight="bold" className="text-xs text-accent">
                  {lessonLabel(lesson.status)}
                </Text>
              </View>
              <Text weight="extrabold" className="mt-1.5 text-base">
                {lesson.title}
              </Text>
            </Card>
          </Pressable>
        );
      })}

      <Card>
        <Text weight="extrabold">Đề cuối chủ đề</Text>
        <Text className="mt-1 text-sm text-muted">{testLabel(data.testStatus)}</Text>
        {assignTest.error ? (
          <View className="mt-2">
            <FormAlert
              tone="error"
              message={isLearningApiError(assignTest.error) ? assignTest.error.message : 'Không mở được đề.'}
            />
          </View>
        ) : null}
        {assignTest.isSuccess ? (
          <Text className="mt-2 text-sm text-success">
            Đề cuối đã được cấp. Chức năng làm đề chưa được hỗ trợ trên ứng dụng.
          </Text>
        ) : null}
        <View className="mt-3">
          <Button
            label="Nhận đề cuối"
            loading={assignTest.isPending}
            disabled={data.testStatus !== 'AVAILABLE'}
            onPress={() => assignTest.mutate()}
          />
        </View>
      </Card>
    </ScrollView>
  );
}
