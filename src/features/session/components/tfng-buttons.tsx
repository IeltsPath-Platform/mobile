import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import type { QuestionOptionDto } from '@/src/features/learning/types';
import { colors } from '@/src/theme';

type TfngButtonsProps = {
  options: QuestionOptionDto[];
  value: string;
  onChange: (optionKey: string) => void;
  disabled?: boolean;
};

export function TfngButtons({ options, value, onChange, disabled }: TfngButtonsProps) {
  return (
    <View className="gap-3">
      {options.map((option) => {
        const selected = value === option.optionKey;
        const label = option.content.trim() || option.optionKey;
        return (
          <Pressable
            key={option.optionKey}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.optionKey)}
            className="min-h-14 items-center justify-center rounded-2xl border px-4"
            style={{
              borderColor: selected ? colors.accent : colors.line,
              backgroundColor: selected ? colors.accent : colors.surface,
            }}>
            <Text weight="extrabold" className={`text-base ${selected ? 'text-white' : 'text-ink'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
