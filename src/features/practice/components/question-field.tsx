import { Check, CheckCircle2, Flag, X, XCircle } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { Question } from '../model/types';
import { MarkableText, type TextSelection } from './markable-text';
import { useReaderPrefs } from './reader-prefs';

import type { Highlight } from '../hooks/use-annotations';

/** Lets question text take highlights like the passage (tap / long-press words). */
export type MarkableProps = {
  highlights: Highlight[];
  selection: TextSelection;
  onWordPress: (block: string, index: number, word: string) => void;
  onWordLongPress: (block: string, index: number, word: string) => void;
};

export type QuestionReview = { correct: boolean | null; correctAnswer: string | null; explanation?: string | null };

type QuestionFieldProps = {
  question: Question;
  number: number;
  value: string;
  disabled?: boolean;
  flagged?: boolean;
  active?: boolean;
  onChange?: (value: string, mode: 'now' | 'debounce') => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onToggleFlag?: () => void;
  /** Present on the review screen: marks the answer right or wrong and shows the solution. */
  review?: QuestionReview;
  markable?: MarkableProps;
  tint?: string;
};

/**
 * One question: options as large tappable rows (a single choice), otherwise a text field for gap filling.
 * Review mode colours the learner's choice and the right option, with the verdict also written in words.
 */
export const QuestionField = memo(function QuestionField({ question, number, value, disabled, flagged, active, onChange, onBlur, onFocus, onToggleFlag, review, markable, tint = colors.accent }: QuestionFieldProps) {
  const { text, paper } = useReaderPrefs();
  const verdictOf = (optionValue: string): 'correct' | 'wrong' | undefined => {
    if (!review) return undefined;
    if (review.correctAnswer && optionValue === review.correctAnswer) return 'correct';
    if (optionValue !== value) return undefined;
    return review.correct ? 'correct' : 'wrong';
  };

  return (
    <View
      className="rounded-3xl px-3.5 py-3.5"
      style={{ borderWidth: active ? 2 : 1.5, borderColor: active ? tint : paper.line, backgroundColor: paper.background }}>
      <View className="flex-row items-start gap-2">
        <View className="mt-0.5 h-7 min-w-7 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: value ? tint : colors.canvas }}>
          <Text weight="black" className="text-xs" style={{ color: value ? '#ffffff' : colors.ink }} accessibilityLabel={`Câu ${number}`}>{number}</Text>
        </View>
        {markable ? (
          <MarkableText block={`q:${question.id}`} text={question.prompt} style={{ flex: 1, ...text, color: paper.text }} {...markable} />
        ) : <Text className="flex-1" style={{ ...text, color: paper.text }}>{question.prompt}</Text>}
        {onToggleFlag ? (
          <Pressable onPress={onToggleFlag} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: flagged }} accessibilityLabel={flagged ? `Bỏ đánh dấu câu ${number}` : `Đánh dấu câu ${number} để xem lại`} className="h-8 w-8 items-center justify-center">
            <Flag size={17} color={flagged ? colors.accentWarm : colors.muted} fill={flagged ? colors.accentWarm : 'transparent'} />
          </Pressable>
        ) : null}
      </View>

      {question.options ? (
        <View accessibilityRole="radiogroup" className="mt-3 gap-2">
          {question.options.map((option) => {
            const selected = value === option.value;
            const verdict = verdictOf(option.value);
            const tone = verdict === 'correct' ? colors.success : verdict === 'wrong' ? colors.danger : selected ? tint : paper.line;
            const background = verdict === 'correct' ? colors.successSoft : verdict === 'wrong' ? colors.dangerSoft : selected ? `${tint}1f` : 'transparent';
            const showKey = option.label !== option.value && option.value.length <= 2;
            return (
              <Pressable
                key={option.value}
                disabled={disabled || !onChange}
                onPress={() => { onFocus?.(); onChange?.(option.value, 'now'); }}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={`${showKey ? `${option.value}. ` : ''}${option.label}${verdict === 'correct' ? ', đáp án đúng' : verdict === 'wrong' ? ', sai' : ''}`}
                className="min-h-12 flex-row items-center gap-3 rounded-2xl px-3 py-2.5"
                style={{ borderWidth: 2, borderColor: tone, backgroundColor: background }}>
                {showKey ? (
                  <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: selected || verdict ? tone : colors.canvas }}>
                    <Text weight="extrabold" className="text-xs" style={{ color: selected || verdict ? '#ffffff' : colors.ink }}>{option.value}</Text>
                  </View>
                ) : (
                  <View className="h-5 w-5 items-center justify-center rounded-full" style={{ borderWidth: 2, borderColor: tone }}>
                    {selected ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} /> : null}
                  </View>
                )}
                <Text className="flex-1" style={{ fontSize: text.fontSize - 1, lineHeight: text.lineHeight - 2, color: paper.text }}>{option.label}</Text>
                {verdict === 'correct' ? <Check size={18} color={colors.success} /> : verdict === 'wrong' ? <X size={18} color={colors.danger} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextInput
          value={value}
          editable={!disabled && Boolean(onChange)}
          onChangeText={(next) => onChange?.(next, 'debounce')}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Nhập câu trả lời"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="done"
          accessibilityLabel={`Câu trả lời câu ${number}`}
          className="mt-3 min-h-12 rounded-xl px-3"
          style={{
            fontSize: text.fontSize, color: paper.text,
            borderWidth: 2,
            borderColor: review ? (review.correct ? colors.success : colors.danger) : value ? tint : paper.line,
            backgroundColor: review ? (review.correct ? colors.successSoft : colors.dangerSoft) : 'transparent',
          }}
        />
      )}

      {review ? <ReviewNote review={review} answered={value.trim() !== ''} /> : null}
    </View>
  );
});

function ReviewNote({ review, answered }: { review: QuestionReview; answered: boolean }) {
  const correct = review.correct === true;
  return (
    <View className="mt-3 gap-2">
      <View className="flex-row items-center gap-2">
        {correct ? <CheckCircle2 size={16} color={colors.success} /> : <XCircle size={16} color={colors.danger} />}
        <Text weight="bold" className="text-sm" style={{ color: correct ? colors.success : colors.danger }}>
          {correct ? 'Bạn trả lời đúng' : answered ? 'Bạn trả lời sai' : 'Bạn chưa trả lời câu này'}
        </Text>
      </View>
      {review.correctAnswer ? (
        <Text className="text-sm text-ink"><Text weight="bold">Đáp án: </Text>{review.correctAnswer}</Text>
      ) : null}
    </View>
  );
}
