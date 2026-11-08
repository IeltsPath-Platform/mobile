import { memo } from 'react';
import { Image } from 'expo-image';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import type {
  StudyAnswer,
  StudyCompletion,
  StudyOption,
  StudyStep,
} from '../study-types';

export type MatchPair = { leftOptionId: string; rightOptionId: string };
type WordStep = Extract<StudyStep, { type: 'WORD' }>;
type MatchStep = Extract<StudyStep, { type: 'MATCH' }>;
type FillStep = Extract<StudyStep, { type: 'FILL' }>;

const OWL_CHEER = require('@/assets/images/owl/hero-cheer.webp');

export const OptionButton = memo(function OptionButton({
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
      accessibilityLabel={option.text}
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
          accessibilityIgnoresInvertColors
          contentFit="cover"
          style={{ width: 44, height: 44, borderRadius: 12 }}
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
});

export function correctAnswerText(step: StudyStep, answer: StudyAnswer | null): string | null {
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

export function WordStepCard({ step }: { step: WordStep }) {
  const imageUrl = step.word.imageUrl ?? step.imageUrl;
  return (
    <View className="overflow-hidden rounded-3xl border-2 border-line bg-surface shadow-md">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={step.word.lemma}
          contentFit="cover"
          style={{ width: '100%', height: 176, backgroundColor: colors.surfaceTint }}
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
  );
}

export function MatchStepView({
  step,
  pairs,
  selectedLeft,
  disabled,
  onSelectLeft,
  onSelectRight,
}: {
  step: MatchStep;
  pairs: MatchPair[];
  selectedLeft: string | null;
  disabled: boolean;
  onSelectLeft: (optionId: string) => void;
  onSelectRight: (optionId: string) => void;
}) {
  const complete = pairs.length === step.left.length;
  return (
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
            : complete
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
                disabled={disabled}
                onPress={() => onSelectLeft(option.optionId)}
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
  onChange,
  onSubmit,
}: {
  step: FillStep;
  value: string;
  disabled: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  return (
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
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={100}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        placeholder="Nhập từ tiếng Anh..."
        placeholderTextColor={colors.muted}
        accessibilityLabel="Câu trả lời"
        className="min-h-14 rounded-2xl border-2 border-accent bg-canvas px-4 text-center text-xl font-bold text-ink"
      />
    </View>
  );
}

export function StepsDoneView() {
  return (
    <View className="items-center gap-3 py-10">
      <Image source={OWL_CHEER} contentFit="contain" style={{ width: 144, height: 144 }} />
      <Text weight="black" className="text-center text-2xl text-ink">
        Đã làm xong các bước!
      </Text>
      <Text className="text-center text-muted">Hoàn thành để lưu kết quả và mở bài tiếp theo.</Text>
    </View>
  );
}

export function CompletionSummary({ completion }: { completion: StudyCompletion }) {
  return (
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
    </View>
  );
}
