import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/src/theme/app-theme';
import { colors, fonts } from '@/src/theme';

import { Text } from './text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
};

/** Labelled input in the same 2px-frame style as the cards; the frame turns blue on focus and red on error. */
export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, hint, secureToggle = false, secureTextEntry, onFocus, onBlur, ...props },
  ref,
) {
  const { fontScale } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isSecure = secureToggle ? hidden : secureTextEntry;
  const frame = error ? colors.danger : focused ? colors.accent : colors.line;

  return (
    <View className="gap-1.5">
      <Text weight="bold" className="text-sm text-ink">
        {label}
      </Text>
      <View
        className="min-h-14 flex-row items-center rounded-2xl px-4"
        style={{
          borderWidth: 2,
          borderColor: frame,
          backgroundColor: focused ? colors.surface : colors.surfaceTint,
        }}>
        <TextInput
          ref={ref}
          className="flex-1 py-3 text-base text-ink"
          style={{ fontFamily: fonts.medium ?? fonts.regular, fontSize: Math.round(17 * fontScale) }}
          placeholderTextColor={colors.muted}
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
            hitSlop={12}
            onPress={() => setHidden((value) => !value)}
            className="pl-2">
            {hidden ? <Eye size={22} color={colors.muted} /> : <EyeOff size={22} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text weight="semibold" className="text-sm text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-sm text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
