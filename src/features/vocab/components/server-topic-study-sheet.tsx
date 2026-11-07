import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
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
import type { StartMode, StudyAnswer, StudyOption, StudyStep } from '../study-types';
import { StudyAccountPanel } from './study-account-panel';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type Props = { unitId: string; visible: boolean; initialMode?: StartMode; onClose: () => void };
type MatchPair = { leftOptionId: string; rightOptionId: string };

function OptionButton({
  option,
  selected,
  disabled,
  number,
  onPress,
}: {
  option: StudyOption;
  selected: boolean;
  disabled: boolean;
  number?: number;
  onPress: () => void;
}) {
  useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      className="mb-3 min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3 active:translate-y-0.5"
      style={{
        backgroundColor: selected ? colors.accentSoft : colors.surface,
        borderColor: selected ? colors.accent : colors.line,
        borderBottomWidth: selected ? 4 : 2,
      }}
    >
      {option.imageUrl ? (
        <Image
          source={{ uri: option.imageUrl }}
          accessibilityLabel={option.text}
          className="h-11 w-11 rounded-xl"
        />
      ) : null}
      <Text weight={selected ? 'black' : 'bold'} className="flex-1 text-base text-ink">
        {option.text}
      </Text>
      {number && number > 0 ? (
        <View className="h-7 min-w-7 items-center justify-center rounded-full bg-accent px-1.5">
          <Text weight="black" className="text-xs" style={{ color: colors.canvas }}>
            {number}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function correctAnswerText(step: StudyStep, answer: StudyAnswer | null): string | null {
  if (!answer) return null;
  if (answer.type === 'FILL_TEXT') return answer.text;
  if (answer.type === 'CHOICE' && step.type === 'CHOICE')
    return step.options.find((option) => option.optionId === answer.optionId)?.text ?? null;
  if (answer.type === 'MATCH' && step.type === 'MATCH')
    return answer.pairs
      .map((pair) => {
        const left = step.left.find((option) => option.optionId === pair.leftOptionId)?.text;
        const right = step.right.find((option) => option.optionId === pair.rightOptionId)?.text;
        return left && right ? `${left} → ${right}` : '';
      })
      .filter(Boolean)
      .join('\n');
  return null;
}

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

  const resetAnswer = () => {
    setSelectedOption(null);
    setSelectedLeft(null);
    setPairs([]);
    setFill('');
    setAudioError('');
  };

  useEffect(() => {
    resetAnswer();
    return () => sound.stopSpeaking();
  }, [step?.stepId]);

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
          {/* 1. TOP BAR: Close button, Sleek Progress Bar, Hearts Badge (Airlearn / Duolingo style) */}
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

            {/* Seamless Progress Bar */}
            <View className="h-3 flex-1 overflow-hidden rounded-full bg-line">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${totalSteps > 0 ? (progressValue * 100) / totalSteps : 0}%`,
                  backgroundColor: colors.success,
                }}
              />
            </View>

            {/* Hearts Counter */}
            {study.attempt?.mode === 'REPLAY' ? (
               <View className="rounded-full bg-accent-soft px-2.5 py-1">
                 <Text weight="bold" className="text-[11px] text-accent-deep">
                  Ôn tập
                </Text>
              </View>
            ) : (
              <View
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

          {/* 2. LESSON STEP HEADER */}
          {study.attempt?.status === 'IN_PROGRESS' && step ? (
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text weight="bold" className="text-xs text-muted">
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

          {/* 3. CONTENT AREA */}
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
                    className="mb-4 h-40 w-full rounded-2xl"
                    resizeMode="contain"
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

                {/* MODE: WORD FLASHCARD */}
                {step.type === 'WORD' ? (
                  <View className="overflow-hidden rounded-3xl border-2 border-line bg-surface shadow-md">
                    {step.word.imageUrl || step.imageUrl ? (
                      <Image
                        source={{ uri: step.word.imageUrl ?? step.imageUrl! }}
                        className="h-44 w-full bg-tint"
                        resizeMode="cover"
                        accessibilityLabel={step.word.lemma}
                      />
                    ) : null}
                    <View className="items-center gap-2 p-5">
                      <Text weight="black" className="text-center text-[32px] leading-10 text-ink">
                        {step.word.lemma}
                      </Text>
                      <Text className="text-center text-sm text-muted">
                        {[step.word.ipaUs ?? step.word.ipaUk, step.word.partOfSpeech].filter(Boolean).join('  ·  ')}
                      </Text>
                      <View className="my-1 h-px w-full bg-line" />
                       <Text weight="bold" className="text-center text-xl leading-7 text-accent-deep">
                        {step.word.vietnameseMeaning ?? step.word.englishDefinition}
                      </Text>
                      {step.word.exampleSentence ? (
                        <View className="mt-2 w-full gap-1 rounded-2xl border border-line bg-canvas p-3">
                          <Text className="text-sm italic leading-5 text-ink">{step.word.exampleSentence}</Text>
                          {step.word.exampleTranslationVi ? (
                            <Text className="text-sm leading-5 text-muted">{step.word.exampleTranslationVi}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* MODE: CHOICE */}
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

                {/* MODE: MATCH */}
                {step.type === 'MATCH' ? (
                  <>
                     <View className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl bg-accent-soft px-3.5 py-2.5">
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
                        <Text weight="black" className="text-xs" style={{ color: colors.canvas }}>
                          {pairs.length}/{step.left.length}
                        </Text>
                      </View>
                       <Text className="flex-1 text-xs leading-5 text-accent-deep">
                        {selectedLeft
                          ? 'Giờ chọn nghĩa tương ứng ở bên phải'
                          : pairs.length === step.left.length
                          ? 'Đã ghép xong · kiểm tra câu trả lời'
                          : 'Chọn từ bên trái, rồi chọn nghĩa bên phải'}
                      </Text>
                    </View>
                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        {step.left.map((option) => {
                          const index = pairs.findIndex((pair) => pair.leftOptionId === option.optionId);
                          return (
                            <OptionButton
                              key={option.optionId}
                              option={option}
                              selected={selectedLeft === option.optionId || index >= 0}
                              number={index + 1}
                              disabled={blocked}
                              onPress={() => {
                                setPairs((current) =>
                                  current.filter((pair) => pair.leftOptionId !== option.optionId),
                                );
                                setSelectedLeft(option.optionId);
                              }}
                            />
                          );
                        })}
                      </View>
                      <View className="flex-1">
                        {step.right.map((option) => {
                          const index = pairs.findIndex((pair) => pair.rightOptionId === option.optionId);
                          return (
                            <OptionButton
                              key={option.optionId}
                              option={option}
                              selected={index >= 0}
                              number={index + 1}
                              disabled={blocked || !selectedLeft}
                              onPress={() => {
                                if (!selectedLeft) return;
                                setPairs((current) => [
                                  ...current.filter(
                                    (pair) =>
                                      pair.rightOptionId !== option.optionId &&
                                      pair.leftOptionId !== selectedLeft,
                                  ),
                                  { leftOptionId: selectedLeft, rightOptionId: option.optionId },
                                ]);
                                setSelectedLeft(null);
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  </>
                ) : null}

                {/* MODE: FILL IN THE BLANK (Enhanced Challenge Card) */}
                {step.type === 'FILL' ? (
                  <View className="gap-4 rounded-3xl border-2 border-line bg-surface p-5 shadow-sm">
                    <View className="items-center">
                       <View className="rounded-full bg-accent-soft px-3 py-1">
                         <Text weight="black" className="text-[11px] uppercase tracking-wider text-accent-deep">
                          Điền từ vào chỗ trống
                        </Text>
                      </View>
                      <Text weight="black" className="mt-2 text-center text-[24px] leading-8 text-ink">
                        {step.prompt}
                      </Text>
                    </View>

                    {step.sentenceBefore || step.sentenceAfter ? (
                      <View className="rounded-2xl border border-line bg-canvas p-4">
                        <Text className="text-center text-lg leading-8 text-ink">
                          {step.sentenceBefore}
                          <Text weight="black" className="text-accent-deep">
                            {'  ______  '}
                          </Text>
                          {step.sentenceAfter}
                        </Text>
                      </View>
                    ) : null}

                    <TextInput
                      value={fill}
                      onChangeText={setFill}
                      editable={!blocked}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={100}
                      returnKeyType="done"
                      onSubmitEditing={submit}
                      placeholder="Nhập từ tiếng Anh..."
                      placeholderTextColor={colors.muted}
                      accessibilityLabel="Câu trả lời"
                      className="min-h-14 rounded-2xl border-2 border-accent bg-canvas px-4 text-center text-xl font-bold text-ink"
                    />
                  </View>
                ) : null}

                {/* FEEDBACK RESULT TRAY */}
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

            {/* COMPLETION SCREENS */}
            {study.canComplete && !completion ? (
              <View className="items-center gap-3 py-10">
                <Image
                  source={require('@/assets/images/owl/hero-cheer.webp')}
                  className="h-36 w-36"
                  resizeMode="contain"
                />
                <Text weight="black" className="text-center text-2xl text-ink">
                  Đã làm xong các bước!
                </Text>
                <Text className="text-center text-muted">Hoàn thành để lưu kết quả và mở bài tiếp theo.</Text>
              </View>
            ) : null}

            {completion ? (
              <View className="gap-4 py-8">
                <Text weight="black" className="text-center text-3xl text-ink">
                  Hoàn thành bài học!
                </Text>
                <Text className="text-center text-base text-muted">
                  {completion.studiedWordCount} từ · {completion.accuracyPercent}% chính xác lần đầu
                </Text>
                {completion.reward ? (
                   <View className="gap-2 rounded-3xl bg-accent-soft p-5">
                     <Text weight="black" className="text-center text-2xl text-accent-deep">
                      +{completion.reward.xpEarned} XP
                    </Text>
                    <Text className="text-center text-ink">
                      Cấp {completion.reward.summary.xp.level} · Chuỗi {completion.reward.summary.streak.currentDays} ngày
                    </Text>
                    {completion.reward.leveledUp ? (
                      <Text weight="bold" className="text-center text-success">
                        Bạn đã lên cấp mới!
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {completion.unlockedUnitIds.length > 0 ? (
                  <Text weight="bold" className="text-center text-success">
                    Bài tiếp theo đã mở khóa!
                  </Text>
                ) : null}
                <Button label="Quay lại lộ trình" onPress={close} />
              </View>
            ) : null}
          </ScrollView>

          {/* 4. BOTTOM ACTION TRAY: 3D Airlearn / Duolingo Tactile Button */}
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
