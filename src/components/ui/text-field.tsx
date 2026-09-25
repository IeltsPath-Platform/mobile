import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { colors, fonts } from '@/src/theme';

import { Text } from './text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, secureToggle = false, secureTextEntry, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isSecure = secureToggle ? hidden : secureTextEntry;

  const borderClass = error ? 'border-danger' : focused ? 'border-accent' : 'border-line';

  return (
    <View className="gap-1.5">
      <Text weight="semibold" className="text-sm">
        {label}
      </Text>
      <View className={`min-h-12 flex-row items-center rounded-xl border bg-surface px-3.5 ${borderClass}`}>
        <TextInput
          ref={ref}
          className="flex-1 py-3 text-base text-ink"
          style={{ fontFamily: fonts.regular }}
          placeholderTextColor="#a8a29e"
          selectionColor={colors.accentDeep}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
            hitSlop={10}
            onPress={() => setHidden((value) => !value)}
            className="pl-2">
            {hidden ? <Eye size={20} color={colors.muted} /> : <EyeOff size={20} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="text-sm text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-sm text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
