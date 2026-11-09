import { Check, X } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import type { Graded, SessionQuestion } from '@/src/features/session/types';
import { colors } from '@/src/theme';

type BlockReviewProps = {
  questions: SessionQuestion[];
  answers: Record<string, string>;
  graded: Record<string, Graded>;
};

function answerLabel(question: SessionQuestion, answer: string | undefined) {
  if (!answer) return '—';
  const option = question.options?.find((item) => item.optionKey === answer);
  return option ? `${option.optionKey}. ${option.content}` : answer;
}

/** All results of a submitted block on one screen, so the learner reads them once and moves on. */
export function BlockReview({ questions, answers, graded }: BlockReviewProps) {
  return (
    <View className="gap-3">
      {questions.map((question, index) => {
        const result = graded[question.id];
        const correct = Boolean(result?.correct);
        const tone = correct ? colors.success : colors.danger;
        return (
          <View
            key={question.id}
            accessible
            accessibilityLabel={`Câu ${index + 1}: ${correct ? 'đúng' : 'sai'}`}
            className="rounded-2xl border p-4"
            style={{ borderColor: tone, backgroundColor: correct ? colors.successSoft : colors.dangerSoft }}>
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: tone }}>
                {correct ? <Check size={16} color={colors.onAccent} strokeWidth={3} /> : <X size={16} color={colors.onAccent} strokeWidth={3} />}
              </View>
              <View className="flex-1">
                <Text weight="bold" className="text-sm leading-5">{index + 1}. {question.stem}</Text>
                <Text className="mt-2 text-sm text-muted">Bạn chọn: <Text weight="bold" style={{ color: tone }}>{answerLabel(question, answers[question.id])}</Text></Text>
                {!correct && result?.correctAnswer ? <Text className="mt-1 text-sm text-muted">Đáp án đúng: <Text weight="bold" className="text-ink">{result.correctAnswer}</Text></Text> : null}
                {result?.explanation ? <Text className="mt-2 text-sm leading-5 text-ink">{result.explanation}</Text> : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
