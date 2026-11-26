import { ChevronDown, Flag } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { QuestionOption } from '../model/types';
import type { QuestionReview } from './question-field';
import { useReaderPrefs } from './reader-prefs';
import { Sheet } from './sheet';

export type MatchingRow = { id: string; number: number; prompt: string; value: string; flagged?: boolean; review?: QuestionReview };

type MatchingGroupProps = {
  rows: MatchingRow[];
  options: QuestionOption[];
  disabled?: boolean;
  activeId?: string | null;
  onChange?: (itemId: string, value: string) => void;
  onFocusRow?: (itemId: string) => void;
  onToggleFlag?: (itemId: string) => void;
  onRowLayout?: (itemId: string, y: number) => void;
  tint?: string;
};

/**
 * A matching group without drag and drop: the shared option list is printed once, each statement has a chip that opens
 * a sheet of options. An option already used elsewhere stays selectable (IELTS lets options repeat) but says where.
 */
export function MatchingGroup({ rows, options, disabled, activeId, onChange, onFocusRow, onToggleFlag, onRowLayout, tint = colors.accent }: MatchingGroupProps) {
  const { text, paper } = useReaderPrefs();
  const [picking, setPicking] = useState<MatchingRow | null>(null);
  const labelOf = (value: string) => options.find((option) => option.value === value)?.label ?? value;
  const usedBy = (value: string) => rows.filter((row) => row.value === value && row.id !== picking?.id).map((row) => row.number);

  return (
    <View className="gap-2">
      <View className="rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
        <Text weight="bold" className="mb-1 text-xs uppercase tracking-wider text-muted">Danh sách lựa chọn</Text>
        {options.map((option) => (
          <Text key={option.value} className="py-0.5" style={{ fontSize: text.fontSize - 2, lineHeight: text.lineHeight - 3, color: colors.ink }}>
            <Text weight="extrabold">{option.value}</Text>  {option.label}
          </Text>
        ))}
      </View>
      {rows.map((row) => {
        const review = row.review;
        const graded = review && review.correct !== null;
        const tone = graded ? (review.correct ? colors.success : colors.danger) : row.value ? tint : paper.line;
        return (
          <View key={row.id} onLayout={(event) => onRowLayout?.(row.id, event.nativeEvent.layout.y)} className="rounded-3xl px-3.5 py-3.5" style={{ borderWidth: activeId === row.id ? 2 : 1.5, borderColor: activeId === row.id ? tint : paper.line, backgroundColor: paper.background }}>
            <View className="flex-row items-start gap-2">
              <View className="mt-0.5 h-7 min-w-7 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: row.value ? tint : colors.canvas }}>
                <Text weight="black" className="text-xs" style={{ color: row.value ? '#ffffff' : colors.ink }}>{row.number}</Text>
              </View>
              <Text className="flex-1" style={{ ...text, color: paper.text }}>{row.prompt}</Text>
              {onToggleFlag ? (
                <Pressable onPress={() => onToggleFlag(row.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={row.flagged ? `Bỏ đánh dấu câu ${row.number}` : `Đánh dấu câu ${row.number}`} className="h-8 w-8 items-center justify-center">
                  <Flag size={17} color={row.flagged ? colors.accentWarm : colors.muted} fill={row.flagged ? colors.accentWarm : 'transparent'} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              disabled={disabled || !onChange}
              onPress={() => { onFocusRow?.(row.id); setPicking(row); }}
              accessibilityRole="button"
              accessibilityLabel={row.value ? `Câu ${row.number}: đã chọn ${row.value}. Chạm để đổi` : `Chọn đáp án cho câu ${row.number}`}
              className="mt-3 min-h-12 flex-row items-center gap-2 rounded-xl px-3"
              style={{ borderWidth: 2, borderColor: tone, borderStyle: row.value ? 'solid' : 'dashed', backgroundColor: graded ? (review.correct ? colors.successSoft : colors.dangerSoft) : 'transparent' }}>
              <Text weight={row.value ? 'bold' : 'regular'} numberOfLines={2} className="flex-1" style={{ color: row.value ? colors.ink : colors.muted }}>
                {row.value ? `${row.value}. ${labelOf(row.value)}` : 'Chọn đáp án'}
              </Text>
              {!review ? <ChevronDown size={18} color={colors.muted} /> : null}
            </Pressable>
            {review?.correct === null ? <Text className="mt-2 text-sm text-muted">Câu này chưa có kết quả chấm.</Text> : null}
            {review && review.correct === false && review.correctAnswer ? (
              <Text className="mt-2 text-sm text-ink"><Text weight="bold">Đáp án: </Text>{review.correctAnswer}</Text>
            ) : null}
          </View>
        );
      })}

      <Sheet visible={picking !== null} onClose={() => setPicking(null)} title={picking ? `Câu ${picking.number}` : undefined} subtitle={picking?.prompt}>
        <View className="gap-2">
          {options.map((option) => {
            const selected = picking?.value === option.value;
            const used = usedBy(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => { if (picking) onChange?.(picking.id, selected ? '' : option.value); setPicking(null); }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className="min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-2"
                style={{ borderWidth: 2, borderColor: selected ? tint : colors.line, backgroundColor: selected ? `${tint}1f` : colors.surface }}>
                <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: selected ? tint : colors.canvas }}>
                  <Text weight="extrabold" style={{ color: selected ? '#ffffff' : colors.ink }}>{option.value}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base text-ink">{option.label}</Text>
                  {used.length ? <Text className="mt-0.5 text-xs text-muted">Đang dùng ở câu {used.join(', ')}</Text> : null}
                </View>
              </Pressable>
            );
          })}
          {picking?.value ? (
            <Pressable onPress={() => { if (picking) onChange?.(picking.id, ''); setPicking(null); }} accessibilityRole="button" className="min-h-12 items-center justify-center">
              <Text weight="bold" style={{ color: colors.danger }}>Bỏ chọn</Text>
            </Pressable>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}
