import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { createRequestId } from '@/src/lib/request-id';
import { isLearningApiError, learningApi } from '@/src/features/learning';
import type { LessonBlockDto } from '@/src/features/learning/types';
import { ChoiceButtons } from '@/src/features/session/components/choice-buttons';
import { FillInput } from '@/src/features/session/components/fill-input';
import { colors } from '@/src/theme';


export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const lessonQuery = useQuery({
    queryKey: ['learning', 'lesson', lessonId],
    queryFn: () => learningApi.getLesson(lessonId!),
    enabled: Boolean(lessonId),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const lesson = lessonQuery.data;
      const block = lesson?.blocks.find((b) => b.blockType === 'EXERCISE');
      if (!lesson || !block?.questions) throw new Error('No exercise');
      return learningApi.submitExercise(lesson.lessonId, block.blockId, {
        requestId: createRequestId(),
        answers: block.questions.map((q) => ({
          questionVersionId: q.questionVersionId,
          answer: answers[q.questionVersionId] ?? '',
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['learning'] });
      await lessonQuery.refetch();
    },
  });

  const complete = useMutation({
    mutationFn: () => learningApi.completeLesson(lessonId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['learning'] });
      router.back();
    },
  });

  const exerciseBlock: LessonBlockDto | undefined = useMemo(
    () => lessonQuery.data?.blocks.find((b) => b.blockType === 'EXERCISE'),
    [lessonQuery.data],
  );

  if (lessonQuery.isPending) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài học" fallbackHref="/(tabs)/practice" />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /></View>
      </View>
    );
  }

  if (lessonQuery.error) {
    const err = lessonQuery.error;
    return (
      <View className="flex-1 bg-canvas">
      <BackHeader title="Bài học" fallbackHref="/(tabs)/practice" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-6">
        <FormAlert tone="error" message={isLearningApiError(err) ? err.message : 'Không tải được bài học.'} />
        {!isLearningApiError(err) || !err.reviews[0] ? <View className="mt-4"><Button label="Thử lại" variant="secondary" onPress={() => void lessonQuery.refetch()} /></View> : null}
        {isLearningApiError(err) && err.reviews[0] ? (
          <View className="mt-4">
            <Button
              label="Làm bài ôn"
              onPress={() =>
                router.push({ pathname: '/learn/review/[reviewId]', params: { reviewId: err.reviews[0].reviewId } })
              }
            />
          </View>
        ) : null}
      </ScrollView>
      </View>
    );
  }

  const lesson = lessonQuery.data!;
  const hasExercise = Boolean(exerciseBlock);

  return (
    <View className="flex-1 bg-canvas">
    <BackHeader title={lesson.code} subtitle={lesson.title} fallbackHref="/(tabs)/practice" />
    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 px-5 pb-16 pt-4">
      <Text accessibilityRole="header" weight="black" className="text-2xl">
        {lesson.code}. {lesson.title}
      </Text>

      {lesson.blocks.map((block) => {
        if (block.blockType === 'TEXT') {
          return (
            <Card key={block.blockId}>
              <Text className="text-sm leading-6 text-ink">{block.text}</Text>
            </Card>
          );
        }
        if (block.blockType === 'ASSET') {
          return (
            <Card key={block.blockId}>
              {block.passageTitle ? (
                <Text weight="extrabold" className="mb-2 text-base">
                  {block.passageTitle}
                </Text>
              ) : null}
              <Text className="text-sm leading-6 text-muted">{block.passage}</Text>
            </Card>
          );
        }
        if (block.blockType === 'EXERCISE') {
          return (
            <Card key={block.blockId}>
              <Text weight="extrabold" className="text-base text-accent">
                Bài tập
              </Text>
              {(block.questions ?? []).map((q) => (
                <View key={q.questionVersionId} className="mt-4">
                  <Text weight="bold" className="text-sm text-ink">
                    {q.sortOrder}. {q.stem}
                  </Text>
                  {q.options ? (
                    <View className="mt-2">
                      <ChoiceButtons
                        options={q.options}
                        value={answers[q.questionVersionId] ?? ''}
                        onChange={(optionKey) =>
                          setAnswers((prev) => ({ ...prev, [q.questionVersionId]: optionKey }))
                        }
                      />
                    </View>
                  ) : (
                    <View className="mt-2">
                      <FillInput
                        value={answers[q.questionVersionId] ?? ''}
                        onChange={(text) => setAnswers((prev) => ({ ...prev, [q.questionVersionId]: text }))}
                      />
                    </View>
                  )}
                </View>
              ))}

              {submit.data ? (
                <Text className="mt-3 text-sm text-muted">
                  {submit.data.blockPassed
                    ? 'Chúc mừng! Bạn đã đạt yêu cầu và hoàn thành bài học.'
                    : 'Chưa đạt 70%. Xem lại đáp án rồi nộp lại nhé.'}
                </Text>
              ) : null}
              {submit.error ? (
                <View className="mt-2">
                  <FormAlert
                    tone="error"
                    message={isLearningApiError(submit.error) ? submit.error.message : 'Không nộp được bài. Hãy thử lại.'}
                  />
                </View>
              ) : null}

              {!block.passed ? (
                <View className="mt-4">
                  <Button
                    label="Nộp bài tập"
                    loading={submit.isPending}
                    disabled={!exerciseBlock?.questions?.every((q) => answers[q.questionVersionId]?.trim())}
                    onPress={() => submit.mutate()}
                  />
                </View>
              ) : (
                <Text weight="bold" className="mt-3 text-sm text-success">
                  Bạn đã hoàn thành phần bài tập này
                </Text>
              )}
            </Card>
          );
        }
        return null;
      })}

      {!hasExercise && lesson.status !== 'COMPLETED' ? (
        <Button
          label="Hoàn thành bài học"
          loading={complete.isPending}
          onPress={() => complete.mutate()}
        />
      ) : null}
      {complete.error ? (
        <FormAlert
          tone="error"
          message={isLearningApiError(complete.error) ? complete.error.message : 'Không hoàn thành được.'}
        />
      ) : null}
    </ScrollView>
    </View>
  );
}
