import { Lightbulb } from 'lucide-react-native';
import { useMemo, useRef } from 'react';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { practiceFormatLabel } from '../model/format-labels';
import { formatTip } from '../model/practice-analysis';
import { groupItems, rangeLabel, sharedOptions, type TestSection } from '../model/sections';
import { MatchingGroup } from './matching-group';
import { MarkableText } from './markable-text';
import { QuestionField, type MarkableProps, type QuestionReview } from './question-field';
import { useReaderPrefs } from './reader-prefs';

type QuestionGroupsProps = {
  section: TestSection;
  numberByItem: ReadonlyMap<string, number>;
  answers: Record<string, string>;
  disabled?: boolean;
  flagged?: ReadonlySet<string>;
  activeId?: string | null;
  onChange?: (itemId: string, value: string, mode: 'now' | 'debounce') => void;
  onBlur?: (itemId: string) => void;
  onFocusItem?: (itemId: string) => void;
  onToggleFlag?: (itemId: string) => void;
  reviewOf?: (itemId: string) => QuestionReview | undefined;
  /** Lets the screen remember where each question sits, to scroll to it. */
  onItemLayout?: (itemId: string, y: number) => void;
  showTips?: boolean;
  markable?: MarkableProps;
  /** Skill colour for the range pill and answered numbers. */
  tint?: string;
};

/** The questions of one section grouped like the paper: range title, instructions, then each question. */
export function QuestionGroups({ section, numberByItem, answers, disabled, flagged, activeId, onChange, onBlur, onFocusItem, onToggleFlag, reviewOf, onItemLayout, showTips, markable, tint = colors.accent }: QuestionGroupsProps) {
  const { paper, text } = useReaderPrefs();
  const groups = useMemo(() => groupItems(section), [section]);
  const instructionStyle = useMemo(() => ({ fontSize: text.fontSize - 2, lineHeight: text.lineHeight - 3, color: paper.text }), [text, paper.text]);
  // onLayout coordinates are relative to the immediate parent, not the ScrollView.
  const rootY = useRef(0);
  const groupY = useRef(new Map<string, number>());
  const matchingY = useRef(new Map<string, number>());
  const itemY = useRef(new Map<string, { group: string; y: number; matching?: boolean }>());
  const publishLayout = () => {
    itemY.current.forEach((item, id) => {
      const offset = groupY.current.get(item.group);
      if (offset !== undefined) onItemLayout?.(id, rootY.current + offset + (item.matching ? matchingY.current.get(item.group) ?? 0 : 0) + item.y);
    });
  };
  return (
    <View className="gap-6" onLayout={(event) => { rootY.current = event.nativeEvent.layout.y; publishLayout(); }}>
      {groups.map((group) => {
        const numbers = group.items.map((item) => numberByItem.get(item.id) ?? 0);
        const options = group.formatCode.startsWith('MATCHING') ? sharedOptions(group.items) : null;
        return (
          <View key={group.key} className="gap-3" onLayout={(event) => { groupY.current.set(group.key, event.nativeEvent.layout.y); publishLayout(); }}>
            <View>
              <View className="flex-row items-center gap-2">
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: tint }}>
                  <Text weight="black" className="text-[13px]" style={{ color: '#ffffff' }}>{rangeLabel(numbers)}</Text>
                </View>
                {group.formatCode !== 'OTHER' ? <Text weight="bold" numberOfLines={1} className="flex-1 text-xs text-muted">{practiceFormatLabel(group.formatCode)}</Text> : null}
              </View>
              {group.instructions ? (markable
                ? <View className="mt-2"><MarkableText block={`g:${group.key}`} text={group.instructions} style={instructionStyle} {...markable} /></View>
                : <Text className="mt-2" style={{ fontSize: text.fontSize - 2, lineHeight: text.lineHeight - 3, color: paper.text, opacity: 0.85 }}>{group.instructions}</Text>) : null}
              {showTips && group.formatCode !== 'OTHER' ? (
                <View className="mt-2 flex-row gap-2 rounded-2xl px-3 py-2" style={{ backgroundColor: colors.warmSoft }}>
                  <Lightbulb size={15} color={colors.accentWarm} style={{ marginTop: 1 }} />
                  <Text className="flex-1 text-xs leading-4 text-ink">{formatTip(group.formatCode)}</Text>
                </View>
              ) : null}
            </View>
            {options ? (
              <View onLayout={(event) => { matchingY.current.set(group.key, event.nativeEvent.layout.y); publishLayout(); }}>
                <MatchingGroup
                  rows={group.items.map((item) => ({
                    id: item.id,
                    number: numberByItem.get(item.id) ?? 0,
                    prompt: item.question?.prompt ?? '',
                    value: answers[item.id] ?? '',
                    flagged: flagged?.has(item.id),
                    review: reviewOf?.(item.id),
                  }))}
                  options={options}
                  disabled={disabled}
                  activeId={activeId}
                  onChange={onChange ? (itemId, value) => onChange(itemId, value, 'now') : undefined}
                  onFocusRow={onFocusItem}
                  onToggleFlag={onToggleFlag}
                  tint={tint}
                  onRowLayout={(itemId, y) => { itemY.current.set(itemId, { group: group.key, y, matching: true }); publishLayout(); }}
                />
              </View>
            ) : group.items.map((item) => item.question ? (
              <View key={item.id} onLayout={(event) => { itemY.current.set(item.id, { group: group.key, y: event.nativeEvent.layout.y }); publishLayout(); }}>
                <QuestionField
                  question={item.question}
                  number={numberByItem.get(item.id) ?? 0}
                  value={answers[item.id] ?? ''}
                  disabled={disabled}
                  flagged={flagged?.has(item.id)}
                  active={activeId === item.id}
                  tint={tint}
                  onChange={onChange ? (value, mode) => onChange(item.id, value, mode) : undefined}
                  onBlur={() => onBlur?.(item.id)}
                  onFocus={() => onFocusItem?.(item.id)}
                  onToggleFlag={onToggleFlag ? () => onToggleFlag(item.id) : undefined}
                  review={reviewOf?.(item.id)}
                  markable={markable}
                />
              </View>
            ) : null)}
          </View>
        );
      })}
    </View>
  );
}
