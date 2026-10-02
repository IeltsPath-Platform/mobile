import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { isLearningApiError, learningApi } from '@/src/features/learning';
import { colors } from '@/src/theme';

function newRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ReviewScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const reviewQuery = useQuery({
    queryKey: ['learning', 'review', reviewId],
    queryFn: () => learningApi.getReview(reviewId!),
    enabled: Boolean(reviewId),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const review = reviewQuery.data;
      if (!review?.set) throw new Error('No set');
      return learningApi.submitReview(review.reviewId, {
        reviewSetId: review.set.reviewSetId,
        requestId: newRequestId(),
        answers: review.set.questions.map((q) => ({
          questionVersionId: q.questionVersionId,
          answer: answers[q.questionVersionId] ?? '',
        })),
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['learning'] });
      if (result.reviewStatus === 'DONE') router.back();
    },
  });

  if (reviewQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (reviewQuery.error || !reviewQuery.data) {
    return (
      <View className="flex-1 bg-canvas px-5 py-6">
        <FormAlert
          tone="error"
          message={
            isLearningApiError(reviewQuery.error)
              ? reviewQuery.error.message
              : 'Không tải được bài ôn.'
          }
        />
      </View>
    );
  }

  const review = reviewQuery.data;

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-3 px-5 pb-16 pt-4">
      <Text weight="black" className="text-2xl">
        Bài ôn
      </Text>
      <Text className="text-sm text-muted">Trạng thái: {review.reviewStatus}</Text>

      <Card>
        <Text weight="extrabold" className="mb-2">
          Lý thuyết
        </Text>
        {review.theory.map((line) => (
          <Text key={line} className="mb-2 text-sm leading-5 text-ink">
            {line}
          </Text>
        ))}
      </Card>

      {review.set ? (
        <Card>
          {review.set.passage ? (
            <Text className="mb-3 text-sm italic text-muted">{review.set.passage}</Text>
          ) : null}
          {review.set.questions.map((q) => (
            <View key={q.questionVersionId} className="mt-2">
              <Text weight="bold" className="text-sm">
                {q.stem}
              </Text>
              <View className="mt-2 gap-2">
                {(q.options ?? []).map((opt) => {
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
                        {opt.optionKey}. {opt.content}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {submit.error ? (
            <View className="mt-3">
              <FormAlert
                tone="error"
                message={isLearningApiError(submit.error) ? submit.error.message : 'Nộp ôn lỗi.'}
              />
            </View>
          ) : null}

          {review.reviewStatus === 'PENDING' ? (
            <View className="mt-4">
              <Button
                label="Nộp bài ôn"
                loading={submit.isPending}
                onPress={() => submit.mutate()}
              />
            </View>
          ) : null}
        </Card>
      ) : (
        <Text className="text-sm text-success">Review đã xong — không còn set.</Text>
      )}
    </ScrollView>
  );
}
