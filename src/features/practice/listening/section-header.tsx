import { Headphones } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { useReaderPrefs } from '../components/reader-prefs';
import { skillInk } from '../model/skill-meta';

// "Section 3: Planning a river survey" -> the label is a chip, so the title keeps only the topic.
const LABEL_PREFIX = /^(?:Section|Part)\s*\d+\s*[:.-]\s*/i;
const QUESTION_RANGE = /Questions?\s+\d+\s*[-–]\s*\d+/i;

/**
 * The top of a Listening section in practice: which section it is, its topic, what to do and how many of its questions
 * are answered, as on the web.
 */
export function SectionHeader({ label, title, instructions, numbers, answered }: {
  label: string;
  title: string;
  instructions: string | null;
  /** Numbers of the questions of this section. */
  numbers: number[];
  answered: number;
}) {
  const { text, paper } = useReaderPrefs();
  const tint = colors.skill.listening;
  const ink = skillInk('listening');
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  // The data names the numbers of the whole test ("Questions 21-30"); the app numbers what it shows.
  const hint = instructions && first !== undefined && last !== undefined ? instructions.replace(QUESTION_RANGE, `Questions ${first}–${last}`) : instructions;
  const topic = title.replace(LABEL_PREFIX, '');
  const share = numbers.length ? answered / numbers.length : 0;

  return (
    <View className="mb-4 rounded-3xl bg-surface p-4" style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: `${tint}22` }}>
          <Headphones size={14} color={ink} />
          <Text weight="black" className="text-xs" style={{ color: ink }}>{label}</Text>
        </View>
        <Text accessibilityLabel={`Đã trả lời ${answered} trên ${numbers.length} câu`} weight="bold" className="text-xs text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          <Text weight="black" className="text-xs text-ink">{answered}</Text>/{numbers.length} câu
        </Text>
      </View>
      {topic ? <Text accessibilityRole="header" weight="black" className="mt-3" style={{ fontSize: text.fontSize + 3, lineHeight: text.lineHeight + 2, color: paper.text }}>{topic}</Text> : null}
      {hint ? <Text className="mt-1" style={{ fontSize: text.fontSize - 2, lineHeight: text.lineHeight - 3, color: paper.text, opacity: 0.8 }}>{hint}</Text> : null}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: colors.line }}>
        <View className="h-1.5 rounded-full" style={{ width: `${Math.round(share * 100)}%`, backgroundColor: tint }} />
      </View>
    </View>
  );
}
