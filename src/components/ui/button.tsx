import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

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

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-accent border-b-4 border-accent-edge',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-surface border border-line border-b-4 border-b-edge',
    text: 'text-ink',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent-deep',
  },
  danger: {
    container: 'bg-danger-soft border border-danger/20 border-b-4 border-b-danger/40',
    text: 'text-danger',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function spinnerColor(variant: ButtonVariant) {
  if (variant === 'secondary') return colors.ink;
  if (variant === 'ghost') return colors.accentDeep;
  if (variant === 'danger') return colors.danger;
  return '#ffffff';
}

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
  const { isDark } = useTheme();
  const primaryForeground = isDark ? colors.canvas : '#ffffff';
  const style = variantStyles[variant];
  const isDisabled = disabled || loading;
  const { style: customStyle, onPressIn, onPressOut, ...pressableProps } = props;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      disabled={isDisabled}
      onPressIn={(event) => {
        if (!isDisabled && !reduceMotion) scale.value = withSpring(0.975, { damping: 16, stiffness: 260 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = reduceMotion ? 1 : withSpring(1, { damping: 14, stiffness: 220 });
        onPressOut?.(event);
      }}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-5 ${style.container} ${isDisabled ? 'opacity-60' : ''} ${className ?? ''}`}
      style={[variant === 'primary' ? { ...primaryShadow, shadowColor: colors.accent } : undefined, customStyle, pressStyle]}
      {...pressableProps}>
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? primaryForeground : spinnerColor(variant)} /> : icon}
      <View>
        <Text weight="bold" className={`text-base ${style.text}`} style={variant === 'primary' ? { color: primaryForeground } : undefined}>
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const primaryShadow = {
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};
