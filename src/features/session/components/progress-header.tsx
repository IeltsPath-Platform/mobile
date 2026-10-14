import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';

type ProgressHeaderProps = {
  index: number;
  total: number;
};

export function ProgressHeader({ index, total }: ProgressHeaderProps) {
  const ratio = total > 0 ? Math.min(1, (index + 1) / total) : 0;

  return (
    <View>
      <Text weight="bold" className="text-xs uppercase tracking-wide text-muted">
        Câu {Math.min(index + 1, total)}/{total}
      </Text>
      <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-line">
        <View className="h-2.5 rounded-full bg-accent" style={{ width: `${Math.max(ratio * 100, 8)}%` }} />
      </View>
    </View>
  );
}
