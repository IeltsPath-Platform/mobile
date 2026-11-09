import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import { motion } from '@/src/theme/design-tokens';

import { Text } from './text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  className?: string;
};

/** Height of the darker edge under a chunky button; the face sinks by this much when pressed. */
const EDGE = 4;

function paletteFor(variant: ButtonVariant, disabled: boolean, isDark: boolean) {
  // Text on bright fills: white in light mode, deep canvas in dark mode where fills are lighter.
  const onFill = isDark ? colors.canvas : '#ffffff';
  if (variant === 'ghost') return { face: 'transparent', edge: 'transparent', border: 'transparent', text: colors.accentDeep };
  if (disabled) return { face: colors.disabledFill, edge: colors.disabledFill, border: colors.disabledFill, text: colors.muted };
  switch (variant) {
    case 'secondary':
      return { face: colors.surface, edge: colors.edge, border: colors.line, text: colors.accentDeep };
    case 'danger':
      return { face: colors.danger, edge: colors.dangerShade, border: colors.danger, text: onFill };
    case 'success':
      return { face: colors.success, edge: colors.successShade, border: colors.success, text: onFill };
    default:
      return { face: colors.accent, edge: colors.accentShade, border: colors.accent, text: onFill };
  }
}

/**
 * Chunky 3D button: a solid face over a darker edge. Pressing sinks the face onto the edge;
 * disabled buttons go flat grey. Labels are upper-case except for the text-only `ghost` variant.
 */
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
  const isDisabled = Boolean(disabled || loading);
  const flat = variant === 'ghost';
  const palette = paletteFor(variant, Boolean(disabled) && !loading, isDark);
  const { style: customStyle, onPressIn, onPressOut, ...pressableProps } = props;
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.value * EDGE }] }));
  const text = loading && loadingLabel ? loadingLabel : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={text}
      disabled={isDisabled}
      onPressIn={(event) => {
        if (!isDisabled && !flat) pressed.value = reduceMotion ? 1 : withTiming(1, { duration: motion.micro / 2 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = reduceMotion ? 0 : withTiming(0, { duration: motion.micro });
        onPressOut?.(event);
      }}
      className={className}
      style={customStyle}
      {...pressableProps}>
      <View style={{ borderRadius: 16, backgroundColor: palette.edge, paddingBottom: flat ? 0 : EDGE }}>
        <Animated.View
          style={[
            {
              minHeight: 50, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 16,
              backgroundColor: palette.face,
              borderWidth: variant === 'secondary' ? 2 : 0,
              borderColor: palette.border,
            },
            faceStyle,
          ]}>
          {loading ? <ActivityIndicator size="small" color={palette.text} /> : icon ? <View>{icon}</View> : null}
          <Text
            weight={flat ? 'bold' : 'extrabold'}
            className="text-base"
            numberOfLines={2}
            style={{
              color: palette.text,
              textAlign: 'center',
              textTransform: flat ? 'none' : 'uppercase',
              letterSpacing: flat ? 0 : 0.6,
            }}>
            {text}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}
