import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { LetterTile, type TileMode } from '../letter-tile';

const SAMPLE: { letter: string; mode: TileMode }[] = [
  { letter: 'L', mode: 'ABSENT' },
  { letter: 'E', mode: 'PRESENT' },
  { letter: 'A', mode: 'CORRECT' },
  { letter: 'R', mode: 'CORRECT' },
  { letter: 'N', mode: 'CORRECT' },
];

/** "How to play" card: a graded sample row plus the colour legend. */
export function WordlyPreview() {
  const legend = [
    { color: colors.success, label: 'Đúng chữ, đúng vị trí' },
    { color: colors.warning, label: 'Có trong từ, sai vị trí' },
    { color: colors.absent, label: 'Không có trong từ' },
  ];
  return (
    <View className="rounded-3xl border border-line bg-surface p-4" style={{ borderBottomWidth: 4, borderBottomColor: colors.edge }}>
      <Text weight="black" className="text-base">Cách chơi</Text>
      <Text className="mt-0.5 text-sm text-muted">Đọc nghĩa tiếng Việt, đoán từ tiếng Anh đúng số chữ.</Text>
      <View className="mt-3 flex-row justify-center gap-1.5" accessible accessibilityLabel="Ví dụ từ LEARN: A, R, N đúng vị trí, E sai vị trí, L không có trong từ">
        {SAMPLE.map((cell, index) => (
          <LetterTile key={index} letter={cell.letter} size={44} mode={cell.mode} cursor={false} />
        ))}
      </View>
      <View className="mt-3 gap-1.5">
        {legend.map((item) => (
          <View key={item.label} className="flex-row items-center gap-2">
            <View className="h-3.5 w-3.5 rounded" style={{ backgroundColor: item.color }} />
            <Text className="text-xs text-muted">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
