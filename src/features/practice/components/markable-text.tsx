import { memo, useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { Highlight } from '../hooks/use-annotations';
import { tokenize } from '../model/tokens';

export type TextSelection = { block: string; start: number; end: number } | null;

type MarkableTextProps = {
  block: string;
  text: string;
  style?: StyleProp<TextStyle>;
  highlights: Highlight[];
  selection: TextSelection;
  /** Word span to show as the evidence of a reviewed answer. */
  evidence?: { start: number; end: number } | null;
  onWordPress?: (block: string, index: number, word: string) => void;
  onWordLongPress?: (block: string, index: number, word: string) => void;
};

const MARK = '#ffe58f';
const MARK_EYE = '#f5d77a';

/**
 * Text whose words answer touches: tap a word, long-press to start a selection. Marked words get a background.
 * Each word is a nested Text so the paragraph still wraps and reads as one block for screen readers.
 */
export const MarkableText = memo(function MarkableText({ block, text, style, highlights, selection, evidence, onWordPress, onWordLongPress }: MarkableTextProps) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const marks = useMemo(() => highlights.filter((item) => item.block === block), [highlights, block]);
  const selected = selection?.block === block ? { start: Math.min(selection.start, selection.end), end: Math.max(selection.start, selection.end) } : null;
  const interactive = Boolean(onWordPress || onWordLongPress);

  return (
    <Text style={style} selectable={!interactive}>
      {tokens.map((token, position) => {
        if (token.index === null) return token.text;
        const index = token.index;
        const isSelected = selected !== null && index >= selected.start && index <= selected.end;
        const isMarked = marks.some((mark) => index >= mark.start && index <= mark.end);
        const isEvidence = evidence != null && index >= evidence.start && index <= evidence.end;
        const background = isSelected ? colors.accentSoft : isEvidence ? colors.successSoft : isMarked ? MARK : undefined;
        if (!interactive && !background) return token.text;
        return (
          <Text
            key={position}
            suppressHighlighting
            onPress={onWordPress ? () => onWordPress(block, index, token.text) : undefined}
            onLongPress={onWordLongPress ? () => onWordLongPress(block, index, token.text) : undefined}
            style={background ? { backgroundColor: background, color: isMarked && !isSelected ? '#2b2200' : undefined, textDecorationLine: isEvidence ? 'underline' : 'none' } : undefined}>
            {token.text}
          </Text>
        );
      })}
    </Text>
  );
});

export { MARK, MARK_EYE };
