import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type WordBankProps = {
  words: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function WordBank({ words, value, onChange, disabled }: WordBankProps) {
  const selected = new Set(value.trim().split(/\s+/).filter(Boolean));

  const toggle = (word: string) => {
    const next = value.trim().split(/\s+/).filter(Boolean);
    const index = next.indexOf(word);
    if (index >= 0) next.splice(index, 1);
    else next.push(word);
    onChange(next.join(' '));
  };

  return (
    <View className="mt-3 flex-row flex-wrap gap-2">
      {words.map((word) => {
        const on = selected.has(word);
        return (
          <Pressable
            key={word}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled }}
            disabled={disabled}
            onPress={() => toggle(word)}
            className="min-h-11 items-center justify-center rounded-full border px-4"
            style={{
              borderColor: on ? colors.accent : colors.line,
              backgroundColor: on ? colors.accentSoft : colors.surface,
            }}>
            <Text weight="bold" className="text-sm">
              {word}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
