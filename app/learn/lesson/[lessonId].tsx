import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { isLearningApiError, learningApi } from '@/src/features/learning';
import type { LessonBlockDto } from '@/src/features/learning/types';
import { colors } from '@/src/theme';

function newRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
        requestId: newRequestId(),
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
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (lessonQuery.error) {
    const err = lessonQuery.error;
    return (
      <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 py-6">
        <FormAlert tone="error" message={isLearningApiError(err) ? err.message : 'Không tải bài học.'} />
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
    );
  }

  const lesson = lessonQuery.data!;
  const hasExercise = Boolean(exerciseBlock);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-3 px-5 pb-16 pt-4">
      <Text weight="black" className="text-2xl">
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
                    <View className="mt-2 gap-2">
                      {q.options.map((opt) => {
                        const selected = answers[q.questionVersionId] === opt.optionKey;
                        return (
                          <Pressable
                            key={opt.optionKey}
                            onPress={() =>
                              setAnswers((prev) => ({ ...prev, [q.questionVersionId]: opt.optionKey }))
                            }
                            className="rounded-xl border px-3 py-2.5"
                            style={{
                              borderColor: selected ? colors.accent : colors.line,
                              backgroundColor: selected ? colors.accentSoft : colors.surface,
                            }}>
                            <Text className="text-sm">
                              <Text weight="bold">{opt.optionKey}. </Text>
                              {opt.content}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      value={answers[q.questionVersionId] ?? ''}
                      onChangeText={(text) =>
                        setAnswers((prev) => ({ ...prev, [q.questionVersionId]: text }))
                      }
                      placeholder="Nhập đáp án"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                      className="mt-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-ink"
                    />
                  )}
                </View>
              ))}

              {submit.data ? (
                <Text className="mt-3 text-sm text-muted">
                  {submit.data.blockPassed
                    ? 'Đạt block · lesson hoàn thành.'
                    : 'Chưa đạt 70% — sửa đáp án và nộp lại.'}
                </Text>
              ) : null}
              {submit.error ? (
                <View className="mt-2">
                  <FormAlert
                    tone="error"
                    message={isLearningApiError(submit.error) ? submit.error.message : 'Nộp bài lỗi.'}
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
                  Block đã pass
                </Text>
              )}
            </Card>
          );
        }
        return null;
      })}

      {!hasExercise && lesson.status !== 'COMPLETED' ? (
        <Button
          label="Hoàn thành bài (không có exercise)"
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
  );
}
