import { memo, useMemo } from 'react';
import type { GestureResponderEvent, StyleProp, TextStyle } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { Highlight } from '../hooks/use-annotations';
import type { Segment } from '../model/highlight-marks';
import { tokenize } from '../model/tokens';

/** Where a finger touched the screen, to put the menu next to the word. */
export type Point = { x: number; y: number };
export type WordHandler = (block: string, index: number, word: string, point: Point) => void;
/** The words being selected, one segment per block the selection touches. */
export type TextSelection = Segment[] | null;

type MarkableTextProps = {
  block: string;
  text: string;
  style?: StyleProp<TextStyle>;
  highlights: Highlight[];
  selection: TextSelection;
  onWordPress?: WordHandler;
  onWordLongPress?: WordHandler;
};

const MARK = '#ffe58f';
const MARK_TEXT = '#2b2200';

const pointOf = (event: GestureResponderEvent): Point => ({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
const parseRanges = (key: string): [number, number][] => (key ? key.split(',').map((range) => range.split('-').map(Number) as [number, number]) : []);

/**
 * Text whose words answer touches: tap a word, long-press to start a selection. Marked and selected words get a
 * background that also runs over the spaces between them, so a highlight reads as one band. Each word is a nested Text
 * so the paragraph still wraps and reads as one block for screen readers.
 */
export const MarkableText = memo(function MarkableText({ block, text, style, highlights, selection, onWordPress, onWordLongPress }: MarkableTextProps) {
  const tokens = useMemo(() => tokenize(text), [text]);
  // Only what this block shows decides when its words are rebuilt: a hundred-word paragraph is not redrawn because
  // another paragraph was highlighted.
  const markKey = useMemo(() => highlights.filter((item) => item.block === block).map((item) => `${item.start}-${item.end}`).join(','), [highlights, block]);
  const segment = selection?.find((item) => item.block === block);
  const selKey = segment ? `${segment.start}-${segment.end}` : '';
  const interactive = Boolean(onWordPress || onWordLongPress);

  const words = useMemo(() => {
    const marks = parseRanges(markKey);
    const [selStart, selEnd] = selKey ? (selKey.split('-').map(Number) as [number, number]) : [-1, -2];
    const selected = `${colors.accent}55`;
    const backgroundOf = (index: number | null) => {
      if (index === null) return undefined;
      if (index >= selStart && index <= selEnd) return selected;
      return marks.some(([start, end]) => index >= start && index <= end) ? MARK : undefined;
    };
    return tokens.map((token, position) => {
      if (token.index === null) {
        // The space between two highlighted words is highlighted too.
        const before = backgroundOf(tokens[position - 1]?.index ?? null);
        const after = backgroundOf(tokens[position + 1]?.index ?? null);
        const gap = before && after ? (before === selected || after === selected ? selected : before) : undefined;
        return gap ? <Text key={position} style={{ backgroundColor: gap }}>{token.text}</Text> : token.text;
      }
      const index = token.index;
      const background = backgroundOf(index);
      if (!interactive && !background) return token.text;
      return (
        <Text
          key={position}
          suppressHighlighting
          onPress={onWordPress ? (event) => onWordPress(block, index, token.text, pointOf(event)) : undefined}
          onLongPress={onWordLongPress ? (event) => onWordLongPress(block, index, token.text, pointOf(event)) : undefined}
          style={background ? { backgroundColor: background, color: background === MARK ? MARK_TEXT : undefined } : undefined}>
          {token.text}
        </Text>
      );
    });
  }, [tokens, markKey, selKey, interactive, block, onWordPress, onWordLongPress]);

  return <Text style={style} selectable={!interactive}>{words}</Text>;
});
