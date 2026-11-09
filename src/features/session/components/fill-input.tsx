import { TextInput } from 'react-native';

import { colors } from '@/src/theme';

type FillInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function FillInput({ value, onChange, disabled }: FillInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      editable={!disabled}
      placeholder="Nhập đáp án"
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      autoCorrect={false}
      className="min-h-14 rounded-2xl border border-line bg-surface px-4 text-base text-ink"
    />
  );
}
