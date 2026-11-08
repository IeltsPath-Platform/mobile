import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { LetterStatus } from '../types';

const ORDER: Record<LetterStatus, number> = { CORRECT: 0, PRESENT: 1, ABSENT: 2 };

/** Only the letters already tried, grouped by result; renders nothing before the first guess. */
export const UsedLetters = memo(function UsedLetters({ statuses }: { statuses: Record<string, LetterStatus> }) {
  const used = Object.entries(statuses)
    .map(([letter, status]) => ({ letter: letter.toUpperCase(), status }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.letter.localeCompare(b.letter));
  if (!used.length) return null;
  return (
    <View accessible accessibilityLabel="Chữ cái đã thử" className="flex-row flex-wrap items-center gap-1.5 px-4">
      {used.map(({ letter, status }) => {
        const bg = status === 'CORRECT' ? colors.success : status === 'PRESENT' ? colors.warning : colors.line;
        const fg = status === 'ABSENT' ? colors.muted : colors.onAccent;
        return (
          <View key={letter} className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
            <Text weight="black" className="text-xs" style={{ color: fg, textDecorationLine: status === 'ABSENT' ? 'line-through' : 'none' }}>
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
});
