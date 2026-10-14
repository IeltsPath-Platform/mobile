import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import type { QuestionOptionDto } from '@/src/features/learning/types';
import { colors } from '@/src/theme';

type ChoiceButtonsProps = {
  options: QuestionOptionDto[];
  value: string;
  onChange: (optionKey: string) => void;
  disabled?: boolean;
};

export function ChoiceButtons({ options, value, onChange, disabled }: ChoiceButtonsProps) {
  return (
    <View className="gap-2">
      {options.map((option) => {
        const selected = value === option.optionKey;
        const showKey = option.content.trim().toUpperCase() !== option.optionKey.trim().toUpperCase();
        return (
          <Pressable
            key={option.optionKey}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.optionKey)}
            className="min-h-14 justify-center rounded-2xl border px-4 py-3"
            style={{
              borderColor: selected ? colors.accent : colors.line,
              backgroundColor: selected ? colors.accentSoft : colors.surface,
            }}>
            <Text className="text-base leading-6">
              {showKey ? <Text weight="bold">{option.optionKey}. </Text> : null}
              {option.content}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
