import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';

import { MarkableText, type TextSelection } from '../components/markable-text';
import { useReaderPrefs } from '../components/reader-prefs';
import type { Highlight } from '../hooks/use-annotations';
import type { Passage } from '../model/types';

type PassageViewProps = {
  sectionId: string;
  tint: string;
  title: string;
  instructions?: string;
  passage: Passage;
  highlights: Highlight[];
  selection: TextSelection;
  onWordPress: (block: string, index: number, word: string) => void;
  onWordLongPress: (block: string, index: number, word: string) => void;
};

export const paragraphBlock = (sectionId: string, index: number) => `p:${sectionId}:${index}`;

/** The passage as lettered paragraphs; every word answers tap (look up / mark menu) and long-press (select). */
export const PassageView = memo(function PassageView({ sectionId, tint, title, instructions, passage, highlights, selection, onWordPress, onWordLongPress }: PassageViewProps) {
  const { text, paper } = useReaderPrefs();
  return (
    <View>
      <View className="mb-2 h-1 w-10 rounded-full" style={{ backgroundColor: tint }} />
      <Text accessibilityRole="header" weight="black" style={{ fontSize: text.fontSize + 5, lineHeight: text.lineHeight + 6, color: paper.text }}>{passage.title || title}</Text>
      {instructions ? <Text className="mt-1" style={{ fontSize: text.fontSize - 2, lineHeight: text.lineHeight - 3, color: paper.text, opacity: 0.75 }}>{instructions}</Text> : null}
      <View className="mt-5 gap-5">
        {passage.paragraphs.map((paragraph, index) => (
          <View key={index} className="flex-row gap-2.5">
            {paragraph.label ? (
              <View className="items-center justify-center rounded-lg" style={{ width: 26, height: 26, marginTop: Math.max(0, (text.lineHeight - 26) / 2), backgroundColor: `${tint}22` }}>
                <Text weight="black" className="text-[13px]" style={{ color: tint }}>{paragraph.label}</Text>
              </View>
            ) : null}
            <View className="flex-1">
              <MarkableText
                block={paragraphBlock(sectionId, index)}
                text={paragraph.text}
                style={{ ...text, color: paper.text }}
                highlights={highlights}
                selection={selection}
                onWordPress={onWordPress}
                onWordLongPress={onWordLongPress}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});
