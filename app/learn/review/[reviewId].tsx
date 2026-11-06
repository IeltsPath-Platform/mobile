import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { isLearningApiError, learningApi } from '@/src/features/learning';
import type { QuestionDto } from '@/src/features/learning/types';
import { FillInput } from '@/src/features/session/components/fill-input';
import { colors } from '@/src/theme';

function ReviewQuestion({ question, value, onChange }: { question: QuestionDto; value: string; onChange: (answer: string) => void }) {
  if (!question.options?.length) {
    return <FillInput value={value} onChange={onChange} />;
  }
  return (
    <View className="mt-2 gap-2">
      {question.options.map((option) => {
        const selected = value === option.optionKey;
        return (
          <Pressable
            key={option.optionKey}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.optionKey)}
            className="min-h-12 justify-center rounded-xl border px-3 py-2.5 active:opacity-80"
            style={{ borderColor: selected ? colors.accent : colors.line, backgroundColor: selected ? colors.accentSoft : colors.surface }}
          >
            <Text className="text-sm">{option.optionKey}. {option.content}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
  const [theoryAnswers, setTheoryAnswers] = useState<Record<string, string>>({});
  const [theoryResult, setTheoryResult] = useState<{ correct: number; total: number } | null>(null);

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

  const theoryCheck = useMutation({
    mutationFn: async () => {
      const review = reviewQuery.data;
      if (!review) throw new Error('Review is not loaded');
      return learningApi.submitReviewTheoryCheck(review.reviewId, {
        requestId: newRequestId(),
        answers: (review.quickCheck ?? []).flatMap((question) => {
          const answer = theoryAnswers[question.questionVersionId]?.trim();
          return answer ? [{ questionVersionId: question.questionVersionId, answer }] : [];
        }),
      });
    },
    onSuccess: async (result) => {
      setTheoryResult({ correct: result.correct, total: result.total });
      await queryClient.invalidateQueries({ queryKey: ['learning'] });
    },
  });

  if (reviewQuery.isPending) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài ôn" fallbackHref="/(tabs)/practice" />
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /></View>
      </View>
    );
  }

  if (reviewQuery.error || !reviewQuery.data) {
    return (
      <View className="flex-1 bg-canvas">
      <BackHeader title="Bài ôn" fallbackHref="/(tabs)/practice" />
      <View className="px-5 py-6">
        <FormAlert
          tone="error"
          message={
            isLearningApiError(reviewQuery.error)
              ? reviewQuery.error.message
              : 'Không tải được bài ôn.'
          }
        />
        <View className="mt-4"><Button label="Thử lại" variant="secondary" onPress={() => void reviewQuery.refetch()} /></View>
      </View>
      </View>
    );
  }

  const review = reviewQuery.data;

  return (
    <View className="flex-1 bg-canvas">
    <BackHeader title="Bài ôn" fallbackHref="/(tabs)/practice" />
    <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pb-16 pt-4">
      <Text className="text-sm text-muted">
        {review.reviewStatus !== 'PENDING' ? 'Bạn đã hoàn thành bài ôn này.' : review.state === 'DIAGNOSING'
          ? 'Đang chuẩn bị bài ôn phù hợp với phần kiến thức cần củng cố.'
          : review.state === 'WAITING_ON_PREREQUISITES'
            ? 'Hoàn thành các bài ôn liên quan trước để mở phần này.'
            : review.stage === 'THEORY'
              ? 'Xem lại phần giải thích, sau đó làm kiểm tra nhanh hoặc bỏ qua để tiếp tục.'
              : 'Làm bài ôn để củng cố kiến thức.'}
      </Text>

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

      {review.reviewStatus === 'PENDING' && review.stage === 'THEORY' ? (
        <Card>
          <Text weight="extrabold" className="mb-2 text-accent">Kiểm tra nhanh</Text>
          {(review.quickCheck ?? []).map((question) => (
            <View key={question.questionVersionId} className="mt-3">
              <Text weight="bold" className="text-sm">{question.stem}</Text>
              <ReviewQuestion
                question={question}
                value={theoryAnswers[question.questionVersionId] ?? ''}
                onChange={(answer) => setTheoryAnswers((previous) => ({ ...previous, [question.questionVersionId]: answer }))}
              />
            </View>
          ))}
          {theoryResult ? <Text className="mt-3 text-sm text-success">Kiểm tra nhanh: đúng {theoryResult.correct}/{theoryResult.total} câu. Bạn có thể tiếp tục ôn tập.</Text> : null}
          {theoryCheck.error ? <View className="mt-3"><FormAlert tone="error" message={isLearningApiError(theoryCheck.error) ? theoryCheck.error.message : 'Không lưu được phần kiểm tra nhanh.'} /></View> : null}
          <View className="mt-4">
            <Button label={theoryCheck.isPending ? 'Đang lưu…' : 'Đã đọc, tiếp tục'} loading={theoryCheck.isPending} onPress={() => theoryCheck.mutate()} />
          </View>
        </Card>
      ) : review.set ? (
        <Card>
          {review.set.passage ? (
            <Text className="mb-3 text-sm italic text-muted">{review.set.passage}</Text>
          ) : null}
          {review.set.questions.map((q) => (
            <View key={q.questionVersionId} className="mt-2">
              <Text weight="bold" className="text-sm">
                {q.stem}
              </Text>
              <ReviewQuestion question={q} value={answers[q.questionVersionId] ?? ''} onChange={(answer) => setAnswers((previous) => ({ ...previous, [q.questionVersionId]: answer }))} />
            </View>
          ))}

          {submit.error ? (
            <View className="mt-3">
              <FormAlert
                tone="error"
                message={isLearningApiError(submit.error) ? submit.error.message : 'Không nộp được bài ôn. Hãy thử lại.'}
              />
            </View>
          ) : null}

          {review.reviewStatus === 'PENDING' ? (
            <View className="mt-4">
              <Button label="Nộp bài ôn" loading={submit.isPending} disabled={!review.set.questions.every((question) => answers[question.questionVersionId]?.trim())} onPress={() => submit.mutate()} />
            </View>
          ) : null}
        </Card>
      ) : review.reviewStatus !== 'PENDING' ? (
        <Text className="text-sm text-success">Bạn đã hoàn thành bài ôn này.</Text>
      ) : (
        <Card><Text className="text-sm leading-6 text-muted">Bài ôn chưa sẵn sàng. Hãy thử tải lại sau khi các nội dung liên quan được cập nhật.</Text><View className="mt-3"><Button variant="secondary" label="Tải lại" onPress={() => void reviewQuery.refetch()} /></View></Card>
      )}
    </ScrollView>
    </View>
  );
}
