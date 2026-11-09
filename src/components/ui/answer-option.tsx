import { Image } from 'expo-image';
import { Check, X } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { MIN_TOUCH, motion } from '@/src/theme/design-tokens';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { Text } from './text';

export type AnswerOptionState = 'default' | 'selected' | 'correct' | 'wrong';

type AnswerOptionProps = {
  text: string;
  state?: AnswerOptionState;
  disabled?: boolean;
  imageUrl?: string | null;
  /** Pair number shown for matching exercises. */
  badge?: number;
  /** `center` for short words in a two-column grid. */
  align?: 'start' | 'center';
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATE_LABEL: Record<AnswerOptionState, string | null> = {
  default: null,
  selected: 'đã chọn',
  correct: 'đúng',
  wrong: 'sai',
};

/**
 * Large answer card. Border and shadow thickness and font weight are constant across states, so selecting or
 * grading never shifts the layout; state is carried by colour AND an icon.
 */
export const AnswerOption = memo(function AnswerOption({ text, state = 'default', disabled, imageUrl, badge, align = 'start', onPress }: AnswerOptionProps) {
  useTheme();
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * 2 }, { scale: 1 - pressed.value * 0.015 }],
  }));

  const palette = {
    default: { bg: colors.surface, border: colors.line, edge: colors.edge },
    selected: { bg: colors.accentSoft, border: colors.accent, edge: colors.accentShade },
    correct: { bg: colors.successSoft, border: colors.success, edge: colors.successShade },
    wrong: { bg: colors.dangerSoft, border: colors.danger, edge: colors.dangerShade },
  }[state];

  const stateLabel = STATE_LABEL[state];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={[text, stateLabel, badge && badge > 0 ? `cặp ${badge}` : null].filter(Boolean).join(', ')}
      accessibilityState={{ selected: state === 'selected', disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = reduceMotion ? 0 : withTiming(1, { duration: motion.micro });
      }}
      onPressOut={() => {
        pressed.value = reduceMotion ? 0 : withTiming(0, { duration: motion.micro });
      }}
      style={[
        {
          minHeight: MIN_TOUCH + 8,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: palette.bg,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: palette.border,
          borderBottomColor: palette.edge,
        },
        pressStyle,
      ]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          style={{ width: 44, height: 44, borderRadius: 12 }}
        />
      ) : null}
      <Text weight="bold" className={`flex-1 text-lg ${align === 'center' ? 'text-center' : ''}`} style={{ color: state === 'default' ? colors.ink : state === 'selected' ? colors.accentDeep : state === 'correct' ? colors.success : colors.danger }}>
        {text}
      </Text>
      {state === 'correct' || state === 'wrong' ? (
        <View
          className="h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: state === 'correct' ? colors.success : colors.danger }}>
          {state === 'correct' ? (
            <Check size={16} color={colors.canvas} strokeWidth={3.5} />
          ) : (
            <X size={16} color={colors.canvas} strokeWidth={3.5} />
          )}
        </View>
      ) : state === 'selected' ? (
        <View
          className="h-7 min-w-7 items-center justify-center rounded-full bg-accent px-1.5"
          style={align === 'center' ? { position: 'absolute', top: -10, right: -6 } : undefined}>
          {badge && badge > 0 ? (
            <Text weight="black" className="text-xs" style={{ color: colors.canvas }}>
              {badge}
            </Text>
          ) : (
            <Check size={16} color={colors.canvas} strokeWidth={3.5} />
          )}
        </View>
      ) : null}
    </AnimatedPressable>
  );
});
