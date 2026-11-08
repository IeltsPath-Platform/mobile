import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Text } from '@/src/components/ui/text';
import { ChoiceButtons } from '@/src/features/session/components/choice-buttons';
import { FillInput } from '@/src/features/session/components/fill-input';
import { BlockReview } from '@/src/features/session/components/block-review';
import { SoundToggle, useStudyMusic } from '@/src/features/session/components/sound-toggle';
import { ProgressHeader } from '@/src/features/session/components/progress-header';
import { TfngButtons } from '@/src/features/session/components/tfng-buttons';
import { WordBank } from '@/src/features/session/components/word-bank';
import { SESSION_DONE_KEY } from '@/src/features/session/completion';
import { questionKind } from '@/src/features/session/question-kind';
import { useSessionRunner } from '@/src/features/session/use-session-runner';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';

export default function SessionScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const queryClient = useQueryClient();
  const runner = useSessionRunner(lessonId ?? '');
  const [passageOpen, setPassageOpen] = useState(false);
  const insets = useSafeAreaInsets();
  useStudyMusic(runner.status === 'answering' || runner.status === 'feedback');
  const inProgress = runner.status === 'answering' || runner.status === 'feedback';

  // Leaving mid-lesson loses unsent answers, so confirm once there is something to lose.
  const requestExit = () => {
    const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/practice' as never); };
    if (!inProgress || (runner.globalIndex === 0 && runner.status === 'answering' && !runner.draft)) { leave(); return; }
    Alert.alert('Thoát bài học?', 'Các câu bạn chưa nộp sẽ không được lưu.', [
      { text: 'Tiếp tục học', style: 'cancel' },
      { text: 'Thoát', style: 'destructive', onPress: leave },
    ]);
  };

  useEffect(() => {
    if (runner.status === 'feedback') {
      if (runner.blockPassed) { haptics.success(); void sound.play('correct'); }
      else { haptics.warning(); void sound.play('wrong'); }
    }
  }, [runner.status, runner.blockPassed]);

  useEffect(() => {
    if (runner.status !== 'summary') return;
    if (runner.lessonCompleted) { haptics.success(); void sound.play('complete'); }
    else haptics.warning();
  }, [runner.status, runner.lessonCompleted]);

  useEffect(() => {
    if (runner.status !== 'summary' || !runner.lessonCompleted) return;
    void queryClient.invalidateQueries({ queryKey: ['learning'] });
    void queryClient.invalidateQueries({ queryKey: ['progress', 'summary'] });
    void queryClient.invalidateQueries({ queryKey: ['streak'] });
  }, [runner.status, runner.lessonCompleted, queryClient]);

  useEffect(() => {
    if (runner.status === 'summary' && runner.lessonCompleted && lessonId) {
      queryClient.setQueryData(SESSION_DONE_KEY, {
        nodeId: lessonId,
        lessonCompleted: true,
      });
    }
  }, [runner.status, runner.lessonCompleted, lessonId, queryClient]);

  const finish = () => {
    router.back();
  };

  if (!lessonId || runner.status === 'loading') {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài học" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  if (runner.status === 'error') {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài học" />
        <View className="px-5 pt-6">
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
        </View>
      </View>
    );
  }

  if (runner.status === 'empty') {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title={runner.emptyTitle ?? 'Bài học'} />
        <View className="px-5 pt-6">
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
        </View>
        </View>
      </View>
    );
  }

  if (runner.status === 'summary') {
    const passed = runner.lessonCompleted;
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kết quả học tập" />
        <View className="px-5 pt-8">
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
      </View>
    );
  }

  const question = runner.question;
  const reviewBlock = runner.source?.blocks[runner.blockIndex];
  if (runner.status === 'feedback' && reviewBlock) {
    const total = reviewBlock.questions.length;
    const right = reviewBlock.questions.filter((item) => runner.graded[item.id]?.correct).length;
    const more = runner.blockIndex < (runner.source?.blocks.length ?? 0) - 1;
    const reviewLabel = runner.blockPassed && more ? 'Sang phần tiếp theo' : runner.blockPassed ? 'Hoàn thành bài' : 'Xem kết quả';
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title={runner.source?.title ?? 'Bài học'} onBack={requestExit} backLabel="Thoát bài học" fallbackHref="/(tabs)/practice" rightAction={<SoundToggle />} />
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-4" showsVerticalScrollIndicator={false}>
          <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: runner.blockPassed ? colors.successSoft : colors.warmSoft }}>
            <Text weight="black" className="text-xl" style={{ color: runner.blockPassed ? colors.success : colors.accentWarm }}>
              {runner.blockPassed ? 'Làm tốt lắm!' : 'Chưa đạt, xem lại nhé'}
            </Text>
            <Text className="mt-1 text-sm text-muted">Đúng {right}/{total} câu{runner.blockPassed ? '' : ' · cần khoảng 70% để qua phần này'}</Text>
          </View>
          <BlockReview questions={reviewBlock.questions} answers={runner.answers} graded={runner.graded} />
        </ScrollView>
        <View className="border-t border-line bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button label={reviewLabel} onPress={runner.continueNext} />
        </View>
      </View>
    );
  }
  if (!question) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Bài học" />
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-center text-muted">Không có câu hỏi.</Text>
        </View>
      </View>
    );
  }

  const kind = questionKind(question);
  const isLast = runner.index >= runner.blockTotal - 1;
  const checkLabel = isLast ? 'Nộp bài' : 'Câu tiếp theo';

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BackHeader title={runner.source?.title ?? 'Bài học'} onBack={requestExit} backLabel="Thoát bài học" fallbackHref="/(tabs)/practice" rightAction={<SoundToggle />} />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-8 pt-4" showsVerticalScrollIndicator={false}>
        <ProgressHeader index={runner.globalIndex} total={runner.globalTotal} />
        {question.passageExcerpt ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: passageOpen }}
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
            <TfngButtons options={question.options} value={runner.draft} onChange={runner.setDraft} />
          ) : null}
          {kind === 'choice' && question.options ? (
            <ChoiceButtons options={question.options} value={runner.draft} onChange={runner.setDraft} />
          ) : null}
          {kind === 'fill' ? (
            <>
              <FillInput value={runner.draft} onChange={runner.setDraft} />
              {question.wordBank ? (
                <WordBank words={question.wordBank} value={runner.draft} onChange={runner.setDraft} />
              ) : null}
            </>
          ) : null}
        </View>

        {runner.message ? (
          <View className="mt-4">
            <FormAlert tone="error" message={runner.message} />
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-line bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="flex-row gap-3">
          {runner.index > 0 ? (
            <Button className="flex-1" variant="secondary" label="Câu trước" disabled={runner.submitting} onPress={runner.back} />
          ) : null}
          <Button
            className="flex-[2]"
            label={checkLabel}
            loading={runner.submitting}
            loadingLabel="Đang chấm bài…"
            disabled={!runner.draft.trim()}
            onPress={() => { haptics.tap(); void runner.check(); }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
