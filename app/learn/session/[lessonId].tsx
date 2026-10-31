import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { ChoiceButtons } from '@/src/features/session/components/choice-buttons';
import { FillInput } from '@/src/features/session/components/fill-input';
import { ProgressHeader } from '@/src/features/session/components/progress-header';
import { TfngButtons } from '@/src/features/session/components/tfng-buttons';
import { WordBank } from '@/src/features/session/components/word-bank';
import { SESSION_DONE_KEY } from '@/src/features/session/completion';
import { questionKind } from '@/src/features/session/question-kind';
import { useSessionRunner } from '@/src/features/session/use-session-runner';
import { colors } from '@/src/theme';

export default function SessionScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const queryClient = useQueryClient();
  const runner = useSessionRunner(lessonId ?? '');
  const [passageOpen, setPassageOpen] = useState(false);

  useEffect(() => {
    if (runner.status === 'summary' && runner.lessonCompleted && lessonId) {
      queryClient.setQueryData(SESSION_DONE_KEY, {
        nodeId: lessonId,
        lessonCompleted: true,
      });
    }
  }, [runner.status, runner.lessonCompleted, lessonId, queryClient]);

  const finish = () => {
    if (runner.lessonCompleted && lessonId) {
      queryClient.setQueryData(SESSION_DONE_KEY, {
        nodeId: lessonId,
        lessonCompleted: true,
      });
    }
    router.back();
  };

  if (!lessonId || runner.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (runner.status === 'error') {
    return (
      <View className="flex-1 bg-canvas px-5 pt-6">
        <FormAlert tone="error" message={runner.message ?? 'Không tải được bài.'} />
        {runner.reviews[0] ? (
          <View className="mt-4">
            <Button
              label="Làm bài ôn"
              onPress={() =>
                router.push({
                  pathname: '/learn/review/[reviewId]',
                  params: { reviewId: runner.reviews[0].reviewId },
                })
              }
            />
          </View>
        ) : null}
        <View className="mt-3">
          <Button variant="secondary" label="Về Hôm nay" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (runner.status === 'empty') {
    return (
      <View className="flex-1 bg-canvas px-5 pt-6">
        <Text weight="black" className="text-2xl">
          {runner.emptyTitle ?? 'Bài học'}
        </Text>
        <Text className="mt-2 text-base leading-6 text-muted">
          Bài này không có câu trắc nghiệm hoặc điền từ. Mở bài đọc trên mobile, hoặc làm đề đầy đủ trên web.
        </Text>
        <View className="mt-5 gap-3">
          <Button
            label="Mở bài đọc"
            onPress={() => router.push({ pathname: '/learn/lesson/[lessonId]', params: { lessonId } })}
          />
          <Button variant="secondary" label="Về Hôm nay" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (runner.status === 'summary') {
    const passed = runner.lessonCompleted;
    return (
      <View className="flex-1 bg-canvas px-5 pt-8">
        <Text weight="black" className="text-3xl">
          {passed ? 'Xong phần này' : runner.blockPassed ? 'Còn phần khác' : 'Chưa đạt'}
        </Text>
        <Text className="mt-2 text-base text-muted">
          {runner.correctCount}/{runner.globalTotal} câu đúng
        </Text>
        <Text className="mt-3 text-sm leading-6 text-muted">
          {passed
            ? 'Bài tiếp theo trên lộ trình sẽ mở.'
            : runner.blockPassed
              ? 'Đã qua phần trắc nghiệm. Bài còn phần khác nên lộ trình chưa mở.'
              : 'Cần khoảng 70% để qua phần này. Sửa lại rồi nộp tiếp.'}
        </Text>
        <View className="mt-6 gap-3">
          {passed ? <Button label="Về Hôm nay" onPress={finish} /> : null}
          {!passed && runner.blockPassed ? (
            <>
              <Button
                label="Mở bài đọc"
                onPress={() => router.push({ pathname: '/learn/lesson/[lessonId]', params: { lessonId } })}
              />
              <Button variant="secondary" label="Về Hôm nay" onPress={() => router.back()} />
            </>
          ) : null}
          {!passed && !runner.blockPassed ? (
            <>
              <Button label="Làm lại" onPress={runner.retry} />
              <Button variant="secondary" label="Về Hôm nay" onPress={() => router.back()} />
            </>
          ) : null}
        </View>
      </View>
    );
  }

  const question = runner.question;
  if (!question) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-5">
        <Text className="text-center text-muted">Không có câu hỏi.</Text>
      </View>
    );
  }

  const kind = questionKind(question);
  const locked = runner.status === 'feedback';
  const isLast = runner.index >= runner.blockTotal - 1;
  const moreBlocks = Boolean(runner.source && runner.blockIndex < runner.source.blocks.length - 1);
  const checkLabel = isLast ? 'Nộp bài' : 'Tiếp';
  const continueLabel = !isLast ? 'Tiếp tục' : runner.blockPassed && moreBlocks ? 'Phần tiếp' : 'Xem kết quả';

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4" showsVerticalScrollIndicator={false}>
        <ProgressHeader index={runner.globalIndex} total={runner.globalTotal} />
        {runner.source?.title ? (
          <Text weight="bold" className="mt-4 text-xs uppercase tracking-wide text-accent-deep">
            {runner.source.title}
          </Text>
        ) : null}

        {question.passageExcerpt ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPassageOpen((open) => !open)}
            className="mt-3 rounded-2xl bg-surface px-4 py-3">
            <Text weight="bold" className="text-xs text-muted">
              {passageOpen ? 'Thu gọn đoạn' : 'Đọc đoạn'}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-ink" numberOfLines={passageOpen ? undefined : 3}>
              {question.passageExcerpt}
            </Text>
          </Pressable>
        ) : null}

        <Text weight="black" className="mt-5 text-xl leading-7">
          {question.stem}
        </Text>

        <View className="mt-4">
          {kind === 'tfng' && question.options ? (
            <TfngButtons options={question.options} value={runner.draft} onChange={runner.setDraft} disabled={locked} />
          ) : null}
          {kind === 'choice' && question.options ? (
            <ChoiceButtons options={question.options} value={runner.draft} onChange={runner.setDraft} disabled={locked} />
          ) : null}
          {kind === 'fill' ? (
            <>
              <FillInput value={runner.draft} onChange={runner.setDraft} disabled={locked} />
              {question.wordBank ? (
                <WordBank words={question.wordBank} value={runner.draft} onChange={runner.setDraft} disabled={locked} />
              ) : null}
            </>
          ) : null}
        </View>

        {runner.feedback ? (
          <View
            className="mt-4 rounded-2xl px-4 py-3"
            style={{ backgroundColor: runner.feedback.correct ? colors.successSoft : colors.dangerSoft }}>
            <Text weight="extrabold" className="text-base" style={{ color: runner.feedback.correct ? colors.success : colors.danger }}>
              {runner.feedback.correct ? 'Đúng' : 'Chưa đúng'}
            </Text>
            {!runner.feedback.correct && runner.feedback.correctAnswer ? (
              <Text className="mt-1 text-sm text-ink">Đáp án: {runner.feedback.correctAnswer}</Text>
            ) : null}
            {runner.feedback.explanation ? (
              <Text className="mt-1 text-sm leading-5 text-ink">{runner.feedback.explanation}</Text>
            ) : null}
          </View>
        ) : null}

        {runner.message ? (
          <View className="mt-4">
            <FormAlert tone="error" message={runner.message} />
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-line bg-surface px-5 pb-6 pt-3">
        {runner.status === 'answering' ? (
          <Button
            label={checkLabel}
            loading={runner.submitting}
            disabled={!runner.draft.trim()}
            onPress={() => void runner.check()}
          />
        ) : (
          <Button label={continueLabel} onPress={runner.continueNext} />
        )}
      </View>
    </View>
  );
}
