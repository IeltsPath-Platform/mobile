import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

type StepperProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  /** Spoken unit, e.g. "mạng" → "Mạng mỗi người: 3 mạng". */
  unit?: string;
};

/** Labelled -/+ control with 44pt targets, used for numeric room settings. */
export function Stepper({ label, value, onChange, min, max, disabled = false, unit }: StepperProps) {
  const step = (delta: number) => {
    haptics.select();
    onChange(Math.min(max, Math.max(min, value + delta)));
  };
  const spoken = `${label}: ${value}${unit ? ` ${unit}` : ''}`;
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={spoken} accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => { if (!disabled) step(event.nativeEvent.actionName === 'increment' ? 1 : -1); }}
      className="mt-3 flex-row items-center justify-between">
      <Text className="text-sm">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel={`Giảm ${label.toLowerCase()}`} disabled={disabled || value <= min} onPress={() => step(-1)}
          className={`h-11 w-11 items-center justify-center rounded-xl bg-canvas active:opacity-70 ${disabled || value <= min ? 'opacity-40' : ''}`}>
          <Minus size={17} color={colors.ink} />
        </Pressable>
        <Text weight="bold" className="min-w-8 text-center">{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Tăng ${label.toLowerCase()}`} disabled={disabled || value >= max} onPress={() => step(1)}
          className={`h-11 w-11 items-center justify-center rounded-xl bg-canvas active:opacity-70 ${disabled || value >= max ? 'opacity-40' : ''}`}>
          <Plus size={17} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
