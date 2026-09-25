import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

import { colors } from '@/src/theme';

import { Text } from './text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  className?: string;
};

const variantStyles: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: 'bg-accent border-b-4 border-accent-edge',
    text: 'text-white',
    spinner: '#ffffff',
  },
  secondary: {
    container: 'bg-surface border border-line border-b-4 border-b-edge',
    text: 'text-ink',
    spinner: colors.ink,
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent-deep',
    spinner: colors.accentDeep,
  },
  danger: {
    container: 'bg-danger-soft border border-danger/20 border-b-4 border-b-danger/40',
    text: 'text-danger',
    spinner: colors.danger,
  },
};

export function Button({
  label,
  loading = false,
  loadingLabel,
  variant = 'primary',
  icon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const style = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      disabled={isDisabled}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-5 active:translate-y-0.5 active:opacity-90 ${style.container} ${isDisabled ? 'opacity-60' : ''} ${className ?? ''}`}
      style={variant === 'primary' ? primaryShadow : undefined}
      {...props}>
      {loading ? <ActivityIndicator size="small" color={style.spinner} /> : icon}
      <View>
        <Text weight="bold" className={`text-base ${style.text}`}>
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
      </View>
    </Pressable>
  );
}

const primaryShadow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};
