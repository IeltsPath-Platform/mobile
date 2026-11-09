import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { ReviewItem } from '../review-log';

type Filter = 'all' | 'wrong';

/** Question-by-question list on the result screen, with a filter to show only the missed ones. */
export function ReviewList({ items }: { items: ReviewItem[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  if (items.length === 0) return null;
  const wrong = items.filter((item) => !item.correct);
  const shown = filter === 'wrong' ? wrong : items;

  return (
    <Card className="mt-5 p-4">
      <Text accessibilityRole="header" weight="black" className="text-lg">
        Xem lại câu trả lời
      </Text>
      <View className="mt-3 flex-row gap-2">
        {(
          [
            { id: 'all', label: `Tất cả (${items.length})` },
            { id: 'wrong', label: `Câu sai (${wrong.length})` },
          ] as const
        ).map((option) => {
          const selected = filter === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setFilter(option.id)}
              className="min-h-11 flex-1 items-center justify-center rounded-2xl active:opacity-80"
              style={{
                borderWidth: 2,
                borderBottomWidth: 3,
                borderColor: selected ? colors.accent : colors.line,
                borderBottomColor: selected ? colors.accentShade : colors.edge,
                backgroundColor: selected ? colors.accentSoft : colors.surface,
              }}>
              <Text weight="extrabold" className="text-sm" style={{ color: selected ? colors.accentDeep : colors.muted }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {shown.length === 0 ? (
        <Text className="py-5 text-center text-sm text-muted">Bạn không sai câu nào. Tuyệt vời!</Text>
      ) : (
        <View className="mt-3 gap-2">
          {shown.map((item, index) => {
            const tone = item.correct ? colors.success : colors.danger;
            const Icon = item.correct ? Check : X;
            return (
              <View
                key={item.id}
                accessible
                accessibilityLabel={`Câu ${index + 1}, ${item.meaning}, ${item.correct ? 'đúng' : 'sai'}${item.answer ? `, đáp án ${item.answer}` : ''}`}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
                style={{ backgroundColor: item.correct ? colors.successSoft : colors.dangerSoft }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: tone }}>
                  <Icon size={16} color={colors.canvas} strokeWidth={3.5} />
                </View>
                <View className="flex-1">
                  <Text weight="bold" className="text-sm text-ink" numberOfLines={2}>
                    {item.meaning}
                  </Text>
                  {item.answer ? (
                    <Text weight="black" className="mt-0.5 text-base" style={{ color: item.correct ? tone : colors.ink }}>
                      {item.correct ? item.answer : `Đáp án: ${item.answer}`}
                    </Text>
                  ) : null}
                  {!item.correct && item.yours ? (
                    <Text className="mt-0.5 text-xs text-muted">Bạn chọn: {item.yours}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
