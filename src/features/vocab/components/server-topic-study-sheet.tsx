import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Volume2, X } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { AnswerFeedback } from '@/src/features/session/components/answer-feedback';
import { sound } from '@/src/lib/sound';
import { speakVocabularyPronunciation } from '../pronunciation';
import { studyKeys, vocabularyStudyApi } from '../study-api';
import { useStudyAttempt } from '../use-study-attempt';
import type { StartMode, StudyAnswer } from '../study-types';
import { StudyAccountPanel } from './study-account-panel';
import {
  CompletionSummary,
  FillStepView,
  MatchStepView,
  OptionButton,
  StepsDoneView,
  WordStepCard,
  correctAnswerText,
  type MatchPair,
} from './study-step-views';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type Props = { unitId: string; visible: boolean; initialMode?: StartMode; onClose: () => void };

export function ServerTopicStudySheet({
  unitId,
  visible,
  initialMode = 'RESUME_OR_START',
  onClose,
}: Props) {
  useTheme();
  const study = useStudyAttempt(unitId, initialMode);
  const summary = useQuery({
    queryKey: studyKeys.summary,
    queryFn: ({ signal }) => vocabularyStudyApi.summary(signal),
    enabled: visible,
    staleTime: 20_000,
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [fill, setFill] = useState('');
  const [audioError, setAudioError] = useState('');

  const step = study.attempt?.steps.find((item) => item.stepId === study.attempt?.currentStepId);
  const stepIndex =
    study.attempt?.steps.findIndex((item) => item.stepId === study.attempt?.currentStepId) ?? -1;
  const completion = study.attempt?.completion;
  const blocked =
    study.busy ||
    Boolean(study.pendingAnswer) ||
    Boolean(study.feedback) ||
    Boolean(study.recovery);
  const progressValue = study.canComplete
    ? (study.attempt?.steps.length ?? 0)
    : Math.max(0, stepIndex + 1);
  const totalSteps = study.attempt?.steps.length ?? 1;

  const resetAnswer = useCallback(() => {
    setSelectedOption(null);
    setSelectedLeft(null);
    setPairs([]);
    setFill('');
    setAudioError('');
  }, []);

  useEffect(() => {
    resetAnswer();
    return () => sound.stopSpeaking();
  }, [step?.stepId, resetAnswer]);

  const close = () => {
    if (!study.busy) {
      sound.stopSpeaking();
      Keyboard.dismiss();
      onClose();
    }
  };

  const submit = () => {
    if (!step || blocked) return;
    let answer: StudyAnswer | null = null;
    if (step.type === 'WORD') answer = { type: 'WORD', acknowledged: true };
    if (step.type === 'CHOICE' && selectedOption) answer = { type: 'CHOICE', optionId: selectedOption };
    if (step.type === 'MATCH' && pairs.length === step.left.length) answer = { type: 'MATCH', pairs };
    if (step.type === 'FILL' && fill.trim()) answer = { type: 'FILL_TEXT', text: fill.trim() };
    if (answer) {
      Keyboard.dismiss();
      void study.answer(answer);
    }
  };

  const ready =
    step &&
    (step.type === 'WORD' ||
      (step.type === 'CHOICE' && selectedOption) ||
      (step.type === 'MATCH' && pairs.length === step.left.length) ||
      (step.type === 'FILL' && fill.trim().length > 0));

  const listen = async () => {
    if (!step) return;
    setAudioError('');
    try {
      if (step.type === 'WORD')
        await speakVocabularyPronunciation(
          step.word.lemma,
          step.word.audioUsUrl ?? step.word.audioUkUrl ?? step.audioUrl,
        );
      else if (step.audioUrl && !(await sound.playPronunciation(step.audioUrl)))
        setAudioError('Chưa phát được âm thanh. Bạn vẫn có thể làm bài.');
    } catch {
      setAudioError('Chưa phát được âm thanh. Hãy thử lại.');
    }
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 52 : 16);
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View className="flex-1 bg-canvas" style={{ paddingTop: topInset, paddingBottom: bottomInset }}>
        <KeyboardAvoidingView className="flex-1 px-5" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          <View className="mb-3 flex-row items-center gap-3">
            <Pressable
              disabled={study.busy}
              accessibilityRole="button"
              accessibilityLabel="Đóng bài học"
              className="h-11 w-11 items-center justify-center rounded-full bg-tint active:opacity-75"
              onPress={close}
            >
              <X size={20} color={colors.ink} />
            </Pressable>


            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Tiến độ bài học"
              accessibilityValue={{
                min: 0,
                max: Math.max(totalSteps, 1),
                now: Math.min(progressValue, Math.max(totalSteps, 1)),
                text: `${progressValue} trên ${totalSteps} bước`,
              }}
              className="h-3 flex-1 overflow-hidden rounded-full bg-line"
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${totalSteps > 0 ? (progressValue * 100) / totalSteps : 0}%`,
                  backgroundColor: colors.success,
                }}
              />
            </View>


            {study.attempt?.mode === 'REPLAY' ? (
               <View className="rounded-full bg-accent-soft px-2.5 py-1">
                 <Text weight="bold" className="text-[11px] text-accent-deep">
                  Ôn tập
                </Text>
              </View>
            ) : (
              <View
                accessible
                accessibilityLabel={
                  summary.data
                    ? `Số tim còn lại: ${summary.data.hearts.hearts}`
                    : 'Số tim chưa tải'
                }
                accessibilityValue={
                  summary.data ? { text: `${summary.data.hearts.hearts} tim` } : undefined
                }
                className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1 border"
                style={{
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.danger,
                }}
              >
                <Heart size={15} color={colors.danger} fill={colors.danger} />
                <Text weight="black" className="text-xs text-danger">
                  {summary.data ? `${summary.data.hearts.hearts}` : '—'}
                </Text>
              </View>
            )}
          </View>


          {study.attempt?.status === 'IN_PROGRESS' && step ? (
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text accessibilityRole="header" weight="bold" className="text-xs text-muted">
                {stepIndex >= 0 ? `BƯỚC ${stepIndex + 1} / ${totalSteps}` : 'BÀI TẬP'}
              </Text>
              <Text weight="bold" className="ml-3 flex-1 text-right text-xs text-accent-deep">
                {step.instructionVi ||
                  (step.type === 'FILL'
                    ? 'Điền từ vào chỗ trống'
                    : step.type === 'CHOICE'
                    ? 'Chọn đáp án đúng'
                    : step.type === 'MATCH'
                    ? 'Nối từ tương ứng'
                    : 'Ghi nhớ từ vựng')}
              </Text>
            </View>
          ) : null}


          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerClassName="pb-6"
            showsVerticalScrollIndicator={false}
          >
            {!study.attempt && study.busy ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.accent} />
                <Text className="mt-3 text-muted">Đang mở bài học…</Text>
              </View>
            ) : null}

            {study.error ? (
              <View className="mb-4 gap-3 rounded-2xl bg-danger-soft p-4">
                <Text accessibilityRole="alert" className="text-sm text-danger">
                  {study.error.message}
                </Text>
                {study.noHearts ? (
                  <>
                    <StudyAccountPanel heartOnly />
                    <Button
                      variant="ghost"
                      label="Đã hồi tim · Thử lại"
                      disabled={study.busy}
                      onPress={() => {
                        void summary.refetch();
                        if (!study.attempt) void study.start();
                        else submit();
                      }}
                    />
                  </>
                ) : study.recovery ? (
                  <Button
                    label={
                      study.recovery === 'replay'
                        ? 'Học lại bài này'
                        : study.recovery === 'sync'
                        ? 'Tải lại phiên học'
                        : 'Mở lại bài học'
                    }
                    loading={study.busy}
                    onPress={() => void study.recover()}
                  />
                ) : !study.attempt ? (
                  <Button label="Thử mở lại" loading={study.busy} onPress={() => void study.start()} />
                ) : null}
              </View>
            ) : null}

            {study.attempt?.status === 'EXPIRED' ? (
              <View className="gap-3 py-6">
                <Text weight="bold">Phiên học đã hết hạn.</Text>
                <Button
                  label="Bắt đầu phiên mới"
                  loading={study.busy}
                  onPress={() => void study.start('RESUME_OR_START', true)}
                />
              </View>
            ) : null}

            {step && study.attempt?.status === 'IN_PROGRESS' ? (
              <>
                {step.type !== 'WORD' && step.imageUrl ? (
                  <Image
                    source={{ uri: step.imageUrl }}
                    style={{ width: '100%', height: 160, marginBottom: 16, borderRadius: 16 }}
                    contentFit="contain"
                    accessibilityLabel="Minh họa câu hỏi"
                  />
                ) : null}

                {(step.type === 'WORD' || step.audioUrl) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Nghe phát âm"
                    onPress={() => void listen()}
                     className="mb-4 h-12 w-12 items-center justify-center self-center rounded-full border border-accent-edge bg-accent-soft active:opacity-75"
                  >
                    <Volume2 color={colors.accentDeep} size={22} />
                  </Pressable>
                ) : null}

                {audioError ? <Text className="mb-2 text-center text-xs text-muted">{audioError}</Text> : null}

                {step.type === 'WORD' ? <WordStepCard step={step} /> : null}



                {step.type === 'CHOICE' ? (
                  <View className="gap-2">
                    <Text weight="black" className="mb-4 text-center text-[22px] leading-8 text-ink">
                      {step.prompt}
                    </Text>
                    {step.options.map((option) => (
                      <OptionButton
                        key={option.optionId}
                        option={option}
                        selected={selectedOption === option.optionId}
                        disabled={blocked}
                        onPress={() => setSelectedOption(option.optionId)}
                      />
                    ))}
                  </View>
                ) : null}

                {step.type === 'MATCH' ? (
                  <MatchStepView
                    step={step}
                    pairs={pairs}
                    selectedLeft={selectedLeft}
                    disabled={blocked}
                    onSelectLeft={(optionId) => {
                      setPairs((current) => current.filter((pair) => pair.leftOptionId !== optionId));
                      setSelectedLeft(optionId);
                    }}
                    onSelectRight={(optionId) => {
                      if (!selectedLeft) return;
                      setPairs((current) => [
                        ...current.filter(
                          (pair) => pair.rightOptionId !== optionId && pair.leftOptionId !== selectedLeft,
                        ),
                        { leftOptionId: selectedLeft, rightOptionId: optionId },
                      ]);
                      setSelectedLeft(null);
                    }}
                  />
                ) : null}

                {step.type === 'FILL' ? (
                  <FillStepView
                    step={step}
                    value={fill}
                    disabled={blocked}
                    onChange={setFill}
                    onSubmit={submit}
                  />
                ) : null}


                {study.feedback ? (
                  <View className="mt-4">
                    <AnswerFeedback
                      key={study.feedback.submissionId}
                      correct={study.feedback.outcome !== 'INCORRECT'}
                      detail={study.feedback.explanationVi}
                    />
                    {study.feedback.outcome === 'INCORRECT' ? (
                      <Text className="mt-3 text-sm leading-6 text-danger">
                        Đáp án:{' '}
                        {correctAnswerText(step, study.feedback.correctAnswer) ?? 'Xem giải thích phía trên.'}
                        {study.feedback.heartLost ? '\nBạn vừa mất 1 tim ở câu này.' : ''}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

            {study.canComplete && !completion ? <StepsDoneView /> : null}

            {completion ? (
              <View>
                <CompletionSummary completion={completion} />
                <Button label="Quay lại lộ trình" onPress={close} />
              </View>
            ) : null}
          </ScrollView>


          {study.attempt?.status === 'IN_PROGRESS' && !study.recovery ? (
            <View className="border-t border-line bg-canvas pb-4 pt-3">
              {study.feedback ? (
                <Button
                  label={study.feedback.outcome === 'INCORRECT' ? 'Thử lại câu này' : 'Tiếp tục'}
                  variant={study.feedback.outcome === 'INCORRECT' ? 'danger' : 'primary'}
                  disabled={study.busy}
                  onPress={() => {
                    resetAnswer();
                    study.continueAfterFeedback();
                  }}
                  className="min-h-14 w-full"
                />
              ) : study.pendingAnswer ? (
                <Button
                  label="Gửi lại đáp án"
                  loading={study.busy}
                  onPress={() => void study.answer(study.pendingAnswer!.answer)}
                />
              ) : study.canComplete ? (
                <Button
                  label="Hoàn thành bài học"
                  loadingLabel="Đang lưu kết quả…"
                  loading={study.busy}
                  onPress={() => void study.complete()}
                  className="min-h-14 w-full"
                />
              ) : step ? (
                <Button
                  label={step.type === 'WORD' ? 'Đã hiểu · Tiếp tục' : 'Kiểm tra đáp án'}
                  loadingLabel="Đang gửi đáp án…"
                  loading={study.busy}
                  disabled={!ready}
                  onPress={submit}
                  className="min-h-14 w-full"
                />
              ) : (
                <Button label="Tải lại phiên học" loading={study.busy} onPress={() => void study.sync()} />
              )}

              {!study.feedback && !study.pendingAnswer && step?.type !== 'WORD' && !study.canComplete ? (
                <Text className="mt-2 text-center text-xs text-muted">
                  {step?.type === 'MATCH'
                    ? `${pairs.length}/${step.left.length} cặp đã chọn`
                    : step?.type === 'FILL'
                    ? 'Nhập đáp án rồi chạm Kiểm tra'
                    : selectedOption
                    ? 'Đáp án đã chọn'
                    : 'Chọn một đáp án để tiếp tục'}
                </Text>
              ) : null}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
