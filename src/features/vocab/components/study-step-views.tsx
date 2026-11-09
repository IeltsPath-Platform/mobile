import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Clock3, Flame, Target, Volume2, Zap } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { AnswerOption } from '@/src/components/ui/answer-option';
import { StatCard } from '@/src/components/ui/stat-card';
import { Text } from '@/src/components/ui/text';
import { ConfettiBurst } from '@/src/components/effects/confetti-burst';
import { CountUp } from '@/src/components/effects/count-up';
import { motion } from '@/src/theme/design-tokens';
import { colors } from '@/src/theme';
import type { StudyAnswer, StudyCompletion, StudyStep } from '../study-types';

export type MatchPair = { leftOptionId: string; rightOptionId: string };
type WordStep = Extract<StudyStep, { type: 'WORD' }>;
type MatchStep = Extract<StudyStep, { type: 'MATCH' }>;
type FillStep = Extract<StudyStep, { type: 'FILL' }>;

const OWL_CHEER = require('@/assets/images/owl/hero-cheer.webp');
const OWL_STAND = require('@/assets/images/owl/nav-owl-stand.webp');

export function correctAnswerText(step: StudyStep, answer: StudyAnswer | null): string | null {
  if (!answer) return null;
  if (answer.type === 'FILL_TEXT') return answer.text;
  if (answer.type === 'CHOICE' && step.type === 'CHOICE')
    return step.options.find((option) => option.optionId === answer.optionId)?.text ?? null;
  // Matching is shown pair by pair on the tiles themselves, never as one block of text.
  return null;
}

/** Chunky speaker button. Shows a "playing" state only while audio is actually being started. */
export function ListenButton({ playing, onPress, size = 'md' }: { playing: boolean; onPress: () => void; size?: 'md' | 'lg' }) {
  const dimension = size === 'lg' ? 64 : 52;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Đang phát âm' : 'Nghe phát âm'}
      accessibilityState={{ busy: playing }}
      onPress={onPress}
      disabled={playing}
      className="items-center justify-center rounded-2xl active:translate-y-1"
      style={{
        width: dimension,
        height: dimension,
        backgroundColor: colors.accent,
        borderBottomWidth: 4,
        borderBottomColor: colors.accentShade,
        opacity: playing ? 0.75 : 1,
      }}>
      <Volume2 size={size === 'lg' ? 30 : 24} color={colors.surface} strokeWidth={2.6} />
    </Pressable>
  );
}

/** Mascot with a speech bubble holding the question, as in a conversation. */
export function MascotPrompt({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <View className="mb-6 flex-row items-end gap-3">
      <Image source={OWL_STAND} contentFit="contain" style={{ width: 76, height: 92 }} accessibilityIgnoresInvertColors />
      <View
        className="mb-4 flex-1 flex-row items-center gap-3 rounded-2xl px-4 py-3"
        style={{ borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface }}>
        <View className="flex-1">{children}</View>
        {trailing}
      </View>
    </View>
  );
}

export function WordStepCard({ step, listen }: { step: WordStep; listen?: ReactNode }) {
  const imageUrl = step.word.imageUrl ?? step.imageUrl;
  return (
    <View
      className="overflow-hidden rounded-3xl bg-surface"
      style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={step.word.lemma}
          contentFit="cover"
          style={{ width: '100%', height: 176, backgroundColor: colors.surfaceTint }}
        />
      ) : null}
      <View className="items-center gap-2 p-5">
        <View className="flex-row items-center gap-3">
          {listen}
          <View className="shrink">
            <Text weight="black" className="text-[32px] leading-10 text-ink">
              {step.word.lemma}
            </Text>
            <Text className="text-sm text-muted">
              {[step.word.ipaUs ?? step.word.ipaUk, step.word.partOfSpeech].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
        </View>
        <View className="my-2 h-0.5 w-full rounded-full bg-line" />
        <Text weight="extrabold" className="text-center text-xl leading-7 text-accent-deep">
          {step.word.vietnameseMeaning ?? step.word.englishDefinition}
        </Text>
        {step.word.exampleSentence ? (
          <View className="mt-2 w-full gap-1 rounded-2xl bg-tint p-3">
            <Text className="text-sm italic leading-5 text-ink">{step.word.exampleSentence}</Text>
            {step.word.exampleTranslationVi ? (
              <Text className="text-sm leading-5 text-muted">{step.word.exampleTranslationVi}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Result of a graded matching step: `correctPairs` is null when the server did not send the key. */
export type MatchGrade = { outcome: 'CORRECT' | 'INCORRECT' | 'ACKNOWLEDGED'; correctPairs: MatchPair[] | null };

/** Number of the learner's pairs that were wrong, or 0 when everything was right. */
export function wrongPairCount(pairs: MatchPair[], grade: MatchGrade) {
  if (grade.outcome !== 'INCORRECT') return 0;
  if (!grade.correctPairs) return pairs.length;
  const key = grade.correctPairs;
  return pairs.filter((pair) => !key.some((ok) => ok.leftOptionId === pair.leftOptionId && ok.rightOptionId === pair.rightOptionId)).length;
}

export function MatchStepView({
  step,
  pairs,
  grade,
  selectedLeft,
  disabled,
  onSelectLeft,
  onSelectRight,
}: {
  step: MatchStep;
  pairs: MatchPair[];
  grade?: MatchGrade | null;
  selectedLeft: string | null;
  disabled: boolean;
  onSelectLeft: (optionId: string) => void;
  onSelectRight: (optionId: string) => void;
}) {
  const pairState = (pair: MatchPair | undefined) => {
    if (!pair) return 'default' as const;
    if (!grade) return 'selected' as const;
    if (grade.outcome !== 'INCORRECT') return 'correct' as const;
    if (!grade.correctPairs) return 'wrong' as const;
    const ok = grade.correctPairs.some((c) => c.leftOptionId === pair.leftOptionId && c.rightOptionId === pair.rightOptionId);
    return ok ? ('correct' as const) : ('wrong' as const);
  };
  return (
    <>
      <Text className="mb-4 text-sm text-muted">
        {grade ? (grade.outcome === 'INCORRECT' ? 'Cặp màu đỏ chưa đúng.' : 'Ghép đúng hết rồi!') : selectedLeft ? 'Giờ chọn nghĩa tương ứng ở cột phải.' : 'Chọn một từ ở cột trái, rồi chọn nghĩa ở cột phải.'}
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          {step.left.map((option) => {
            const index = pairs.findIndex((pair) => pair.leftOptionId === option.optionId);
            const graded = pairState(pairs[index]);
            return (
              <AnswerOption
                key={option.optionId}
                text={option.text}
                imageUrl={option.imageUrl}
                align="center"
                compact
                state={graded !== 'default' ? graded : selectedLeft === option.optionId ? 'selected' : 'default'}
                badge={index + 1}
                disabled={disabled}
                onPress={() => onSelectLeft(option.optionId)}
              />
            );
          })}
        </View>
        <View className="flex-1">
          {step.right.map((option) => {
            const index = pairs.findIndex((pair) => pair.rightOptionId === option.optionId);
            const graded = pairState(pairs[index]);
            return (
              <AnswerOption
                key={option.optionId}
                text={option.text}
                imageUrl={option.imageUrl}
                align="center"
                compact
                state={graded}
                badge={index + 1}
                disabled={disabled || !selectedLeft}
                onPress={() => onSelectRight(option.optionId)}
              />
            );
          })}
        </View>
      </View>
    </>
  );
}

export function FillStepView({
  step,
  value,
  disabled,
  listen,
  onChange,
  onSubmit,
}: {
  step: FillStep;
  value: string;
  disabled: boolean;
  listen?: ReactNode;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View>
      <MascotPrompt trailing={listen}>
        <Text weight="bold" className="text-lg leading-7 text-ink">
          {step.prompt}
        </Text>
      </MascotPrompt>

      {step.sentenceBefore || step.sentenceAfter ? (
        <Text className="mb-5 text-xl leading-9 text-ink">
          {step.sentenceBefore}
          <Text weight="black" style={{ color: colors.accent, textDecorationLine: 'underline' }}>
            {value.trim() ? ` ${value.trim()} ` : ' … '}
          </Text>
          {step.sentenceAfter}
        </Text>
      ) : null}

      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={100}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        placeholder="Nhập từ tiếng Anh…"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Câu trả lời"
        className="min-h-14 rounded-2xl px-4 text-xl text-ink"
        style={{
          fontFamily: 'BeVietnamPro_700Bold',
          backgroundColor: colors.surfaceTint,
          borderWidth: 2,
          borderColor: value ? colors.accent : colors.line,
        }}
      />
    </View>
  );
}

export function StepsDoneView() {
  return (
    <View className="items-center gap-3 py-10">
      <Image source={OWL_CHEER} contentFit="contain" style={{ width: 160, height: 160 }} accessibilityIgnoresInvertColors />
      <Text weight="black" className="text-center text-2xl" style={{ color: colors.xpDeep }}>
        Đã làm xong các bước!
      </Text>
      <Text className="text-center text-muted">Chạm Hoàn thành để lưu kết quả và mở bài tiếp theo.</Text>
    </View>
  );
}

function Reveal({ index, children }: { index: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(index * motion.stagger).duration(motion.transition)}>
      {children}
    </Animated.View>
  );
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Summary of a finished lesson. Every number is the server's; nothing is computed locally. */
export function CompletionSummary({ completion }: { completion: StudyCompletion }) {
  const reward = completion.reward;
  const milestone = Boolean(reward?.leveledUp) || completion.unlockedUnitIds.length > 0;
  const reduceMotion = useReducedMotion();
  return (
    <View className="gap-6 py-6">
      <Animated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)} style={{ alignItems: 'center' }}>
        <Image source={OWL_CHEER} contentFit="contain" style={{ width: 190, height: 190 }} accessibilityIgnoresInvertColors />
      </Animated.View>

      <Reveal index={1}>
        <View className="items-center gap-2 px-2">
          <Text accessibilityRole="header" weight="black" className="text-center text-3xl" style={{ color: colors.xpDeep }}>
            {completion.accuracyPercent === 100 ? 'Hoàn hảo!' : 'Hoàn thành bài học!'}
          </Text>
          <Text className="text-center text-base leading-6 text-ink">
            {completion.accuracyPercent >= 80
              ? 'Bạn nhớ từ rất tốt. Tiếp tục phát huy nhé!'
              : 'Mỗi lần ôn là một lần nhớ lâu hơn. Bạn làm được rồi!'}
          </Text>
        </View>
      </Reveal>

      <Reveal index={2}>
        <View className="flex-row gap-3">
          {reward ? (
            <StatCard label="Tổng XP" tone="xp" icon={Zap} value={`+${reward.xpEarned}`}>
              <CountUp value={reward.xpEarned} duration={motion.celebrate} weight="black" className="text-2xl" style={{ color: colors.xpDeep }} />
            </StatCard>
          ) : (
            <StatCard label="Số từ" tone="xp" icon={Zap} value={String(completion.studiedWordCount)} />
          )}
          <StatCard
            label={completion.accuracyPercent >= 80 ? 'Tốt' : 'Chính xác'}
            tone="success"
            icon={Target}
            value={`${completion.accuracyPercent}%`}
          />
          <StatCard label="Thời gian" tone="accent" icon={Clock3} value={formatDuration(completion.durationSeconds)} />
        </View>
      </Reveal>

      {reward ? (
        <Reveal index={3}>
          <View className="items-center gap-1">
            <Text weight="bold" className="text-center text-ink">
              Cấp {reward.summary.xp.level} · {completion.studiedWordCount} từ đã học
            </Text>
            {reward.leveledUp ? (
              <Text weight="black" className="text-center text-success">
                Bạn đã lên cấp mới!
              </Text>
            ) : reward.summary.xp.xpToNextLevel > 0 ? (
              <Text className="text-center text-sm text-muted">Còn {reward.summary.xp.xpToNextLevel} XP để lên cấp tiếp theo.</Text>
            ) : null}
            {completion.unlockedUnitIds.length > 0 ? (
              <Text weight="bold" className="text-center text-success">
                Bài tiếp theo đã mở khóa!
              </Text>
            ) : null}
          </View>
        </Reveal>
      ) : completion.unlockedUnitIds.length > 0 ? (
        <Reveal index={3}>
          <Text weight="bold" className="text-center text-success">
            Bài tiếp theo đã mở khóa!
          </Text>
        </Reveal>
      ) : null}

      {milestone ? <ConfettiBurst trigger={1} size="large" originY={0.2} /> : null}
    </View>
  );
}

/** Shown once after a lesson only when the server says the streak went up today. */
export function StreakCelebration({ days }: { days: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <View className="items-center gap-4 py-10">
      <View
        className="rounded-2xl px-4 py-3"
        style={{ borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface }}>
        <Text className="text-center text-base text-ink">
          {days <= 1 ? 'Khởi đầu tuyệt vời! Mai mình học tiếp nhé?' : 'Bạn đang giữ nhịp rất đều. Tiếp tục nào!'}
        </Text>
      </View>
      <Animated.View
        entering={reduceMotion ? undefined : ZoomIn.springify().damping(10)}
        style={{ backgroundColor: colors.warmSoft, width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' }}>
        <Flame size={96} color={colors.flame} fill={colors.flame} strokeWidth={1.5} />
      </Animated.View>
      <Reveal index={1}>
        <View className="items-center">
          <Text weight="black" style={{ color: colors.flame, fontSize: 88, lineHeight: 96 }}>
            {days}
          </Text>
          <Text weight="black" className="text-2xl" style={{ color: colors.flame }}>
            ngày streak
          </Text>
        </View>
      </Reveal>
      <ConfettiBurst trigger={1} size="small" originY={0.35} />
    </View>
  );
}
