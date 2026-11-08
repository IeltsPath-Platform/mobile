import { ChevronDown } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export function Panel({ children }: { children: ReactNode }) {
  return <View className="mb-4 gap-3 rounded-3xl border border-line bg-surface p-4">{children}</View>;
}

export function CollapseHeader({
  label,
  open,
  onPress,
}: {
  label: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      className="min-h-11 flex-row items-center justify-between"
    >
      <Text weight="bold">{label}</Text>
      <ChevronDown
        size={17}
        color={colors.muted}
        style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
      />
    </Pressable>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className="h-2 overflow-hidden rounded-full bg-canvas"
    >
      <View
        className="h-full rounded-full"
        style={{ width: `${pct}%`, backgroundColor: color ?? colors.accent }}
      />
    </View>
  );
}
