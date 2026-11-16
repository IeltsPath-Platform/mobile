import { Flag, LayoutGrid } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { Sheet } from './sheet';

export type NavQuestion = { id: string; number: number; sectionIndex: number; answered: boolean; flagged: boolean };

type StripProps = {
  questions: NavQuestion[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onOpenGrid: () => void;
  tint?: string;
};

const CHIP = 36;
const GAP = 6;

/** Footer strip: the grid button and the numbers of the current section, scrolled to keep the current one in view. */
export function QuestionStrip({ questions, currentId, onSelect, onOpenGrid, tint = colors.accent }: StripProps) {
  const scroll = useRef<ScrollViewInstance>(null);
  const index = Math.max(0, questions.findIndex((question) => question.id === currentId));
  const current = questions[index];
  const inSection = questions.filter((question) => question.sectionIndex === (current?.sectionIndex ?? 0));
  const positionInSection = inSection.findIndex((question) => question.id === current?.id);

  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, positionInSection * (CHIP + GAP) - (CHIP + GAP) * 2), animated: true });
  }, [positionInSection]);

  return (
    <View className="flex-row items-center gap-2">
      <Pressable onPress={onOpenGrid} accessibilityRole="button" accessibilityLabel="Xem tất cả câu hỏi" className="h-11 w-11 items-center justify-center rounded-2xl bg-canvas active:opacity-70">
        <LayoutGrid size={20} color={colors.ink} />
      </Pressable>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP, alignItems: 'center', paddingVertical: 6, paddingRight: 4 }} className="flex-1">
        {inSection.map((question) => (
          <NumberChip key={question.id} question={question} current={question.id === currentId} tint={tint} onPress={() => onSelect(question.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function NumberChip({ question, current, onPress, tint, size = CHIP }: { question: NavQuestion; current: boolean; onPress: () => void; tint: string; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: current }}
      accessibilityLabel={`Câu ${question.number}${question.answered ? ', đã trả lời' : ', chưa trả lời'}${question.flagged ? ', đã đánh dấu' : ''}`}
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: question.answered ? tint : colors.surface,
        borderWidth: current ? 2.5 : 1.5,
        borderColor: current ? colors.ink : question.answered ? tint : colors.line,
        transform: [{ scale: current ? 1.08 : 1 }],
      }}>
      <Text weight="black" className="text-[13px]" style={{ color: question.answered ? '#ffffff' : colors.ink, fontVariant: ['tabular-nums'] }}>{question.number}</Text>
      {question.flagged ? (
        <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Flag size={10} color={colors.accentWarm} fill={colors.accentWarm} />
        </View>
      ) : null}
    </Pressable>
  );
}

type GridProps = {
  visible: boolean;
  onClose: () => void;
  questions: NavQuestion[];
  sectionLabels: string[];
  currentId: string | null;
  onSelect: (id: string) => void;
  tint?: string;
};

/** Every question of the test by section, with answered / flagged state and a count of what is left. */
export function QuestionGridSheet({ visible, onClose, questions, sectionLabels, currentId, onSelect, tint = colors.accent }: GridProps) {
  const answered = questions.filter((question) => question.answered).length;
  const flagged = questions.filter((question) => question.flagged).length;
  return (
    <Sheet visible={visible} onClose={onClose} title="Danh sách câu hỏi" subtitle={`Đã làm ${answered}/${questions.length} câu${flagged ? ` · ${flagged} câu đánh dấu` : ''}`}>
      {sectionLabels.map((label, sectionIndex) => {
        const items = questions.filter((question) => question.sectionIndex === sectionIndex);
        if (!items.length) return null;
        return (
          <View key={label} className="mb-4">
            <Text weight="bold" className="mb-2 text-sm text-muted">{label}</Text>
            <View className="flex-row flex-wrap gap-2">
              {items.map((question) => (
                <NumberChip key={question.id} size={44} tint={tint} question={question} current={question.id === currentId} onPress={() => { onSelect(question.id); onClose(); }} />
              ))}
            </View>
          </View>
        );
      })}
      <View className="mt-1 flex-row flex-wrap gap-4">
        <Legend color={tint} label="Đã trả lời" />
        <Legend color={colors.surface} border={colors.line} label="Chưa trả lời" />
        <View className="flex-row items-center gap-1.5"><Flag size={13} color={colors.accentWarm} fill={colors.accentWarm} /><Text className="text-xs text-muted">Đánh dấu xem lại</Text></View>
      </View>
    </Sheet>
  );
}

function Legend({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, borderWidth: border ? 2 : 0, borderColor: border }} />
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}
