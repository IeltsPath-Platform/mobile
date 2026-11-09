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
import { Heart, X } from 'lucide-react-native';

import { AnswerOption } from '@/src/components/ui/answer-option';
import { Button } from '@/src/components/ui/button';
import { ProgressBar } from '@/src/components/ui/progress-bar';
import { Text } from '@/src/components/ui/text';
import { sound } from '@/src/lib/sound';
import { speakVocabularyPronunciation } from '../pronunciation';
import { studyKeys, vocabularyStudyApi } from '../study-api';
import { useStudyAttempt } from '../use-study-attempt';
import type { StartMode, StudyAnswer } from '../study-types';
import { StudyAccountPanel } from './study-account-panel';
import { StudyFeedbackFooter } from './study-feedback-footer';
import {
  CompletionSummary,
  FillStepView,
  ListenButton,
  MascotPrompt,
  MatchStepView,
  StepsDoneView,
  StreakCelebration,
  WordStepCard,
  correctAnswerText,
  type MatchPair,
} from './study-step-views';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type Props = { unitId: string; visible: boolean; initialMode?: StartMode; onClose: () => void };

function defaultInstruction(type: 'WORD' | 'CHOICE' | 'MATCH' | 'FILL') {
  if (type === 'FILL') return 'Điền từ vào chỗ trống';
  if (type === 'CHOICE') return 'Chọn đáp án đúng';
  if (type === 'MATCH') return 'Nhấn vào các cặp tương ứng';
  return 'Ghi nhớ từ vựng';
}

export function ServerTopicStudySheet({
  unitId,
  visible,
  initialMode = 'RESUME_OR_START',
  onClose,
}: Props) {
  const { vars } = useTheme();
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
  const [playing, setPlaying] = useState(false);
  const [streakSeen, setStreakSeen] = useState(false);

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
  const inProgress = study.attempt?.status === 'IN_PROGRESS';
  // The streak screen only appears when the server reports the streak went up on this lesson.
  const streakDays = completion?.reward?.streakIncreased ? completion.reward.summary.streak.currentDays : null;
  const showStreak = Boolean(completion) && streakDays !== null && !streakSeen;

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
    if (!step || playing) return;
    setAudioError('');
    setPlaying(true);
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
    } finally {
      setPlaying(false);
    }
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 52 : 16);
  const bottomInset = Math.max(insets.bottom, 16);
  const listenButton = <ListenButton playing={playing} onPress={() => void listen()} />;
  const feedback = study.feedback;

  const goNext = () => {
    resetAnswer();
    study.continueAfterFeedback();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View className="flex-1 bg-canvas" style={[vars, { paddingTop: topInset }]}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header: close, progress, hearts. Hidden on the summary so it stays calm. */}
          {!completion ? (
            <View className="flex-row items-center gap-3 px-5 pb-3">
              <Pressable
                disabled={study.busy}
                accessibilityRole="button"
                accessibilityLabel="Đóng bài học"
                hitSlop={8}
                className="h-12 w-12 items-center justify-center active:opacity-60"
                onPress={close}>
                <X size={28} color={colors.muted} strokeWidth={3} />
              </Pressable>
              <View className="flex-1">
                <ProgressBar
                  value={progressValue}
                  max={totalSteps}
                  tone="xp"
                  height={16}
                  accessibilityLabel="Tiến độ bài học"
                  valueText={`${progressValue} trên ${totalSteps} bước`}
                />
              </View>
              {study.attempt?.mode === 'REPLAY' ? (
                <Text weight="black" className="text-sm text-accent-deep">
                  ÔN TẬP
                </Text>
              ) : (
                <View
                  accessible
                  accessibilityLabel={
                    summary.data ? `Số tim còn lại: ${summary.data.hearts.hearts}` : 'Số tim chưa tải'
                  }
                  className="min-w-12 flex-row items-center justify-end gap-1.5">
                  <Heart size={22} color={colors.danger} fill={colors.danger} />
                  <Text weight="black" className="text-lg" style={{ color: colors.danger }}>
                    {summary.data ? summary.data.hearts.hearts : '—'}
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          <ScrollView
            className="flex-1 px-5"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerClassName="pb-8"
            showsVerticalScrollIndicator={false}>
            {inProgress && step && step.type !== 'FILL' ? (
              <Text accessibilityRole="header" weight="black" className="mb-5 text-2xl leading-8 text-ink">
                {step.instructionVi || defaultInstruction(step.type)}
              </Text>
            ) : null}

            {!study.attempt && study.busy ? (
              <View className="items-center py-16">
                <ActivityIndicator color={colors.accent} size="large" />
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
                      variant="secondary"
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

            {step && inProgress ? (
              <>
                {step.type !== 'WORD' && step.imageUrl ? (
                  <Image
                    source={{ uri: step.imageUrl }}
                    style={{ width: '100%', height: 160, marginBottom: 16, borderRadius: 16 }}
                    contentFit="contain"
                    accessibilityLabel="Minh họa câu hỏi"
                  />
                ) : null}

                {audioError ? <Text className="mb-3 text-sm text-muted">{audioError}</Text> : null}

                {step.type === 'WORD' ? <WordStepCard step={step} listen={listenButton} /> : null}

                {step.type === 'CHOICE' ? (
                  <View>
                    <MascotPrompt trailing={step.audioUrl ? listenButton : undefined}>
                      <Text weight="black" className="text-xl leading-7 text-ink">
                        {step.prompt}
                      </Text>
                    </MascotPrompt>
                    {step.options.map((option) => {
                      const correctId =
                        feedback?.correctAnswer?.type === 'CHOICE' ? feedback.correctAnswer.optionId : null;
                      const state =
                        feedback && correctId === option.optionId
                          ? 'correct'
                          : feedback && feedback.outcome !== 'INCORRECT' && selectedOption === option.optionId
                            ? 'correct'
                            : feedback?.outcome === 'INCORRECT' && selectedOption === option.optionId
                              ? 'wrong'
                              : selectedOption === option.optionId
                                ? 'selected'
                                : 'default';
                      return (
                        <AnswerOption
                          key={option.optionId}
                          text={option.text}
                          imageUrl={option.imageUrl}
                          state={state}
                          disabled={blocked}
                          onPress={() => setSelectedOption(option.optionId)}
                        />
                      );
                    })}
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
                    listen={step.audioUrl ? listenButton : undefined}
                    onChange={setFill}
                    onSubmit={submit}
                  />
                ) : null}
              </>
            ) : null}

            {study.canComplete && !completion ? <StepsDoneView /> : null}

            {completion && !showStreak ? <CompletionSummary completion={completion} /> : null}
            {completion && showStreak && streakDays !== null ? <StreakCelebration days={streakDays} /> : null}
          </ScrollView>

          {/* Bottom action area, pinned inside the safe area. */}
          {feedback && step && inProgress && !study.recovery ? (
            <StudyFeedbackFooter
              key={feedback.submissionId}
              correct={feedback.outcome !== 'INCORRECT'}
              correctText={correctAnswerText(step, feedback.correctAnswer)}
              explanation={feedback.explanationVi}
              heartLost={feedback.heartLost}
              buttonLabel={feedback.outcome === 'INCORRECT' ? 'Thử lại câu này' : 'Tiếp tục'}
              busy={study.busy}
              bottomInset={bottomInset}
              onContinue={goNext}
            />
          ) : (
            <View className="border-t-2 border-line px-5 pt-3" style={{ paddingBottom: bottomInset }}>
              {completion ? (
                <Button
                  label={showStreak ? 'Tiếp tục' : 'Về lộ trình'}
                  onPress={() => (showStreak ? setStreakSeen(true) : close())}
                />
              ) : inProgress && !study.recovery ? (
                study.pendingAnswer ? (
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
                  />
                ) : step ? (
                  <Button
                    label={step.type === 'WORD' ? 'Đã hiểu' : 'Kiểm tra'}
                    loadingLabel="Đang gửi đáp án…"
                    loading={study.busy}
                    disabled={!ready}
                    onPress={submit}
                  />
                ) : (
                  <Button label="Tải lại phiên học" loading={study.busy} onPress={() => void study.sync()} />
                )
              ) : (
                <View style={{ height: 50 }} />
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
