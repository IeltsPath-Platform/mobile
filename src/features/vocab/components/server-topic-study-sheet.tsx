import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Heart, Volume2, X } from 'lucide-react-native';
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

type Props = { unitId: string; visible: boolean; initialMode?: StartMode; onClose: () => void };
type MatchPair = { leftOptionId: string; rightOptionId: string };

function OptionButton({ option, selected, disabled, number, onPress }: {
  option: StudyOption; selected: boolean; disabled: boolean; number?: number; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} onPress={onPress} disabled={disabled}
    className="mb-2 min-h-14 flex-row items-center gap-2 rounded-2xl border px-3 py-3"
    style={{ backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.line }}>
    {option.imageUrl ? <Image source={{ uri: option.imageUrl }} accessibilityLabel={option.text} className="h-10 w-10 rounded-lg" /> : null}
    <Text weight={selected ? 'bold' : 'medium'} className="flex-1 text-sm">{option.text}</Text>
    {number && number > 0 ? <View className="h-7 min-w-7 items-center justify-center rounded-full bg-accent-soft px-1"><Text weight="bold" className="text-xs text-accent-deep">{number}</Text></View> : null}
  </Pressable>;
}

function correctAnswerText(step: StudyStep, answer: StudyAnswer | null): string | null {
  if (!answer) return null;
  if (answer.type === 'FILL_TEXT') return answer.text;
  if (answer.type === 'CHOICE' && step.type === 'CHOICE') return step.options.find((option) => option.optionId === answer.optionId)?.text ?? null;
  if (answer.type === 'MATCH' && step.type === 'MATCH') return answer.pairs.map((pair) => {
    const left = step.left.find((option) => option.optionId === pair.leftOptionId)?.text;
    const right = step.right.find((option) => option.optionId === pair.rightOptionId)?.text;
    return left && right ? `${left} → ${right}` : '';
  }).filter(Boolean).join('\n');
  return null;
}

export function ServerTopicStudySheet({ unitId, visible, initialMode = 'RESUME_OR_START', onClose }: Props) {
  const study = useStudyAttempt(unitId, initialMode);
  const content = useQuery({ queryKey: studyKeys.content(unitId), queryFn: ({ signal }) => vocabularyStudyApi.content(unitId, signal), enabled: visible, staleTime: 300_000 });
  const summary = useQuery({ queryKey: studyKeys.summary, queryFn: ({ signal }) => vocabularyStudyApi.summary(signal), enabled: visible, staleTime: 20_000 });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [fill, setFill] = useState('');
  const [audioError, setAudioError] = useState('');
  const step = study.attempt?.steps.find((item) => item.stepId === study.attempt?.currentStepId);
  const stepIndex = study.attempt?.steps.findIndex((item) => item.stepId === study.attempt?.currentStepId) ?? -1;
  const completion = study.attempt?.completion;
  const blocked = study.busy || Boolean(study.pendingAnswer) || Boolean(study.feedback) || Boolean(study.recovery);
  const progressValue = study.canComplete ? (study.attempt?.steps.length ?? 0) : Math.max(0, stepIndex + 1);

  const resetAnswer = () => { setSelectedOption(null); setSelectedLeft(null); setPairs([]); setFill(''); setAudioError(''); };
  useEffect(() => { resetAnswer(); return () => sound.stopSpeaking(); }, [step?.stepId]);
  useEffect(() => () => sound.stopSpeaking(), []);
  const close = () => { if (!study.busy) { sound.stopSpeaking(); Keyboard.dismiss(); onClose(); } };
  const submit = () => {
    if (!step || blocked) return;
    let answer: StudyAnswer | null = null;
    if (step.type === 'WORD') answer = { type: 'WORD', acknowledged: true };
    if (step.type === 'CHOICE' && selectedOption) answer = { type: 'CHOICE', optionId: selectedOption };
    if (step.type === 'MATCH' && pairs.length === step.left.length) answer = { type: 'MATCH', pairs };
    if (step.type === 'FILL' && fill.trim()) answer = { type: 'FILL_TEXT', text: fill.trim() };
    if (answer) { Keyboard.dismiss(); void study.answer(answer); }
  };
  const ready = step && (step.type === 'WORD' || (step.type === 'CHOICE' && selectedOption)
    || (step.type === 'MATCH' && pairs.length === step.left.length) || (step.type === 'FILL' && fill.trim()));
  const listen = async () => {
    if (!step) return;
    setAudioError('');
    try {
      if (step.type === 'WORD') await speakVocabularyPronunciation(step.word.lemma, step.word.audioUsUrl ?? step.word.audioUkUrl ?? step.audioUrl);
      else if (step.audioUrl && !await sound.playPronunciation(step.audioUrl)) setAudioError('Chưa phát được âm thanh. Bạn vẫn có thể làm bài.');
    } catch { setAudioError('Chưa phát được âm thanh. Hãy thử lại.'); }
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView className="flex-1 px-5" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="mb-2 min-h-12 flex-row items-center justify-between">
          <Pressable disabled={study.busy} accessibilityRole="button" accessibilityLabel="Đóng bài học" className="h-11 w-11 items-center justify-center" onPress={close}><X size={24} color={colors.ink} /></Pressable>
          <Text weight="black" className="flex-1 px-2 text-center" numberOfLines={2}>{content.data?.unit.title ?? 'Bài học từ vựng'}</Text><View className="w-11" />
        </View>
        {study.attempt?.status === 'IN_PROGRESS' ? <View className="mb-4 rounded-2xl border border-line bg-surface px-3 py-2.5">
          <View className="mb-2 flex-row items-center justify-between"><Text weight="bold" className="text-xs text-muted">{study.canComplete ? 'Đã hoàn thành các bước' : stepIndex >= 0 ? `Bước ${stepIndex + 1} / ${study.attempt.steps.length}` : `${study.attempt.completedStepIds.length} bước đã xong`}</Text>
            {study.attempt.mode === 'REPLAY' ? <Text weight="bold" className="text-xs text-accent-deep">Ôn tập · Không mất tim</Text> : <View className="flex-row items-center gap-1"><Heart size={15} color={colors.danger} fill={colors.danger} /><Text weight="bold" className="text-sm">{summary.data ? `${summary.data.hearts.hearts}/${summary.data.hearts.maxHearts}` : '—'}</Text></View>}
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: study.attempt.steps.length, now: progressValue }} className="h-2 overflow-hidden rounded-full bg-line"><View className="h-full rounded-full bg-accent" style={{ width: `${study.attempt.steps.length ? progressValue * 100 / study.attempt.steps.length : 0}%` }} /></View>
        </View> : null}
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="pb-5">
          {!study.attempt && study.busy ? <View className="items-center py-10"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-muted">Đang mở bài học…</Text></View> : null}
          {study.error ? <View className="mb-4 gap-3 rounded-2xl bg-danger-soft p-4"><Text accessibilityRole="alert" className="text-sm text-danger">{study.error.message}</Text>
            {study.noHearts ? <><StudyAccountPanel heartOnly /><Button variant="ghost" label="Đã hồi tim · Thử lại" disabled={study.busy} onPress={() => { void summary.refetch(); if (!study.attempt) void study.start(); else submit(); }} /></> : study.recovery ? <Button label={study.recovery === 'replay' ? 'Học lại bài này' : study.recovery === 'sync' ? 'Tải lại phiên học' : 'Mở lại bài học'} loading={study.busy} onPress={() => void study.recover()} /> : !study.attempt ? <Button label="Thử mở lại" loading={study.busy} onPress={() => void study.start()} /> : null}
          </View> : null}
          {study.attempt?.status === 'EXPIRED' ? <View className="gap-3 py-6"><Text weight="bold">Phiên học đã hết hạn.</Text><Button label="Bắt đầu phiên mới" loading={study.busy} onPress={() => void study.start('RESUME_OR_START', true)} /></View> : null}
          {step && study.attempt?.status === 'IN_PROGRESS' ? <>
            {step.instructionVi ? <Text className="mb-3 text-center text-sm leading-5 text-muted">{step.instructionVi}</Text> : null}
            {step.type !== 'WORD' && step.imageUrl ? <Image source={{ uri: step.imageUrl }} className="mb-4 h-40 w-full rounded-2xl" resizeMode="contain" accessibilityLabel="Minh họa câu hỏi" /> : null}
            {(step.type === 'WORD' || step.audioUrl) ? <Pressable accessibilityRole="button" accessibilityLabel="Nghe phát âm" onPress={() => void listen()} className="mb-3 h-12 w-12 items-center justify-center self-center rounded-full bg-accent-soft"><Volume2 color={colors.accentDeep} size={22} /></Pressable> : null}
            {audioError ? <Text className="mb-2 text-center text-xs text-muted">{audioError}</Text> : null}
            {step.type === 'WORD' ? <View className="overflow-hidden rounded-3xl border border-line bg-surface">
              {step.word.imageUrl || step.imageUrl ? <Image source={{ uri: step.word.imageUrl ?? step.imageUrl! }} className="h-44 w-full bg-surfaceTint" resizeMode="cover" accessibilityLabel={step.word.lemma} /> : null}
              <View className="items-center gap-2 p-5">
                <Text weight="black" className="text-center text-[32px] leading-10">{step.word.lemma}</Text>
                <Text className="text-center text-sm text-muted">{[step.word.ipaUs ?? step.word.ipaUk, step.word.partOfSpeech].filter(Boolean).join('  ·  ')}</Text>
                <View className="my-1 h-px w-full bg-line" />
                <Text weight="bold" className="text-center text-xl leading-7">{step.word.vietnameseMeaning ?? step.word.englishDefinition}</Text>
                {step.word.exampleSentence ? <View className="mt-2 w-full gap-1 rounded-2xl bg-canvas p-3"><Text className="text-sm leading-5 italic">{step.word.exampleSentence}</Text>{step.word.exampleTranslationVi ? <Text className="text-sm leading-5 text-muted">{step.word.exampleTranslationVi}</Text> : null}</View> : null}
              </View>
            </View> : null}
            {step.type === 'CHOICE' ? <><Text weight="black" className="mb-4 text-center text-[22px] leading-8">{step.prompt}</Text>{step.options.map((option) => <OptionButton key={option.optionId} option={option} selected={selectedOption === option.optionId} disabled={blocked} onPress={() => setSelectedOption(option.optionId)} />)}</> : null}
            {step.type === 'MATCH' ? <>
              <View className="mb-3 flex-row items-center justify-center gap-2 rounded-2xl bg-accent-soft px-3 py-2.5"><View className="h-7 w-7 items-center justify-center rounded-full bg-accent"><Text weight="bold" className="text-xs text-white">{pairs.length}/{step.left.length}</Text></View><Text className="flex-1 text-sm leading-5 text-accent-deep">{selectedLeft ? 'Giờ chọn nghĩa tương ứng ở bên phải' : pairs.length === step.left.length ? 'Đã ghép xong · kiểm tra câu trả lời' : 'Chọn từ bên trái, rồi chọn nghĩa bên phải'}</Text></View>
              <View className="flex-row gap-3"><View className="flex-1">{step.left.map((option) => {
                const index = pairs.findIndex((pair) => pair.leftOptionId === option.optionId);
                return <OptionButton key={option.optionId} option={option} selected={selectedLeft === option.optionId || index >= 0} number={index + 1} disabled={blocked} onPress={() => { setPairs((current) => current.filter((pair) => pair.leftOptionId !== option.optionId)); setSelectedLeft(option.optionId); }} />;
              })}</View><View className="flex-1">{step.right.map((option) => {
                const index = pairs.findIndex((pair) => pair.rightOptionId === option.optionId);
                return <OptionButton key={option.optionId} option={option} selected={index >= 0} number={index + 1} disabled={blocked || !selectedLeft} onPress={() => { if (!selectedLeft) return; setPairs((current) => [...current.filter((pair) => pair.rightOptionId !== option.optionId && pair.leftOptionId !== selectedLeft), { leftOptionId: selectedLeft, rightOptionId: option.optionId }]); setSelectedLeft(null); }} />;
              })}</View></View>
            </> : null}
            {step.type === 'FILL' ? <View className="gap-4 rounded-3xl border border-line bg-surface p-5"><Text weight="black" className="text-center text-[22px] leading-8">{step.prompt}</Text>{step.sentenceBefore || step.sentenceAfter ? <View className="rounded-2xl bg-canvas p-4"><Text className="text-center text-lg leading-8">{step.sentenceBefore}<Text weight="bold" className="text-accent-deep">  _____  </Text>{step.sentenceAfter}</Text></View> : null}<TextInput value={fill} onChangeText={setFill} editable={!blocked} autoCapitalize="none" autoCorrect={false} maxLength={100} returnKeyType="done" onSubmitEditing={submit} placeholder="Nhập từ tiếng Anh" placeholderTextColor={colors.muted} accessibilityLabel="Câu trả lời" className="min-h-14 rounded-2xl border border-line bg-canvas px-4 text-center text-lg text-ink" /></View> : null}
            {study.feedback ? <>
              <AnswerFeedback key={study.feedback.submissionId} correct={study.feedback.outcome !== 'INCORRECT'} detail={study.feedback.explanationVi} />
              {study.feedback.outcome === 'INCORRECT' ? <Text className="mt-3 text-sm leading-6">Đáp án: {correctAnswerText(step, study.feedback.correctAnswer) ?? 'Xem giải thích phía trên.'}{study.feedback.heartLost ? '\nBạn vừa mất 1 tim ở câu này.' : ''}</Text> : null}
            </> : null}
          </> : null}
          {study.canComplete && !completion ? <View className="items-center gap-3 py-10"><Image source={require('@/assets/images/owl/hero-cheer.webp')} className="h-36 w-36" resizeMode="contain" /><Text weight="black" className="text-center text-2xl">Đã làm xong các bước!</Text><Text className="text-center text-muted">Hoàn thành để lưu kết quả và mở bài tiếp theo.</Text></View> : null}
          {completion ? <View className="gap-4 py-8"><Text weight="black" className="text-center text-3xl">Hoàn thành bài học!</Text><Text className="text-center text-base text-muted">{completion.studiedWordCount} từ · {completion.accuracyPercent}% chính xác lần đầu</Text>
            {completion.reward ? <View className="gap-2 rounded-3xl bg-accent-soft p-5"><Text weight="black" className="text-center text-2xl text-accent-deep">+{completion.reward.xpEarned} XP</Text><Text className="text-center">Cấp {completion.reward.summary.xp.level} · Chuỗi {completion.reward.summary.streak.currentDays} ngày</Text>{completion.reward.leveledUp ? <Text className="text-center text-success">Bạn đã lên cấp mới!</Text> : null}</View> : null}
            {completion.unlockedUnitIds.length > 0 ? <Text className="text-center text-success">Bài tiếp theo đã mở khóa.</Text> : null}
            <Button label="Quay lại lộ trình" onPress={close} />
          </View> : null}
        </ScrollView>
        {study.attempt?.status === 'IN_PROGRESS' && !study.recovery ? <View className="border-t border-line bg-canvas pb-2 pt-3">
          {study.feedback ? <Button label={study.feedback.outcome === 'INCORRECT' ? 'Thử lại câu này' : 'Tiếp tục'} onPress={() => { resetAnswer(); study.continueAfterFeedback(); }} />
            : study.pendingAnswer ? <Button label="Gửi lại đáp án" loading={study.busy} onPress={() => void study.answer(study.pendingAnswer!.answer)} />
            : study.canComplete ? <Button label="Hoàn thành bài" loading={study.busy} onPress={() => void study.complete()} />
            : step ? <Button label={step.type === 'WORD' ? 'Đã hiểu · Tiếp tục' : 'Kiểm tra đáp án'} loading={study.busy} disabled={!ready} onPress={submit} /> : <Button label="Tải lại phiên học" onPress={() => void study.sync()} />}
          {!study.feedback && !study.pendingAnswer && step?.type !== 'WORD' && !study.canComplete ? <Text className="mt-2 text-center text-xs text-muted">{step?.type === 'MATCH' ? `${pairs.length}/${step.left.length} cặp đã chọn` : step?.type === 'FILL' ? 'Nhập đáp án rồi chạm Kiểm tra' : selectedOption ? 'Đáp án đã chọn' : 'Chọn một đáp án để tiếp tục'}</Text> : null}
        </View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
