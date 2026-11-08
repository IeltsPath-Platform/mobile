import { memo, useEffect, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LetterTile, type TileMode } from '../letter-tile';
import type { CurrentWord } from '../types';

const MAX_TILE = 52;
const MIN_TILE = 28;

function ShakeRow({ shakeKey, gap, children }: { shakeKey: number; gap: number; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!shakeKey || reduceMotion) return;
    x.value = withSequence(
      withTiming(-9, { duration: 50 }),
      withTiming(9, { duration: 70 }),
      withTiming(-6, { duration: 70 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeKey, reduceMotion, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[{ flexDirection: 'row', gap }, style]}>{children}</Animated.View>;
}

/**
 * Full grid of attempts. Tile size is derived from the measured area so the board
 * always fits above the keyboard instead of scrolling the page.
 */
export const WordlyBoard = memo(function WordlyBoard({
  word,
  guess,
  shakeKey,
}: {
  word: CurrentWord;
  guess: string;
  shakeKey: number;
}) {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((previous) => (Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1 ? previous : { width, height }));
  };

  // Long words need tighter spacing so ten tiles still fit with side margins.
  const gap = word.columns > 8 ? 4 : 6;
  const activeRow = word.guesses.length;
  // One answer row at full size; earlier guesses sit above it as a compact history.
  const rows = Math.min(word.maxAttempts, activeRow + 1);
  const byWidth = Math.floor((area.width - 32 - (word.columns - 1) * gap) / word.columns);
  const size = area.width ? Math.max(MIN_TILE, Math.min(MAX_TILE, byWidth)) : MAX_TILE;
  const historySize = Math.max(24, Math.round(size * 0.66));
  const hintCell = word.hint?.revealedCell;
  const scroller = useRef<ScrollViewInstance>(null);

  return (
    <View style={{ flexShrink: 1 }} onLayout={onLayout}>
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 4 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ gap: 10 }} accessibilityLabel={`Bảng đoán, đã dùng ${word.attemptsUsed} trên ${word.maxAttempts} lượt`}>
          {Array.from({ length: rows }, (_, row) => {
            const past = word.guesses[row];
            const isActive = row === activeRow;
            return (
              <ShakeRow key={row} gap={isActive ? gap : Math.max(3, gap - 2)} shakeKey={isActive ? shakeKey : 0}>
                {Array.from({ length: word.columns }, (_, column) => {
                  const typed = isActive ? guess[column] : undefined;
                  const hinted = isActive && !typed && hintCell?.column === column;
                  const letter = past?.guess[column] ?? typed ?? (hinted ? hintCell.letter.toUpperCase() : '');
                  const mode: TileMode = past ? past.letters[column] : typed ? 'typed' : hinted ? 'hint' : 'empty';
                  return (
                    <LetterTile
                      key={column}
                      letter={letter}
                      size={isActive ? size : historySize}
                      mode={mode}
                      cursor={isActive && column === guess.length && word.wordStatus === 'ACTIVE'}
                      revealDelay={column * 160}
                    />
                  );
                })}
              </ShakeRow>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
});
