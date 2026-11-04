import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';

type AnswerFeedbackProps = {
  correct: boolean;
  detail?: string | null;
  title?: string;
};

/** A short, supportive mascot reaction after each checked answer. */
export function AnswerFeedback({ correct, detail, title }: AnswerFeedbackProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.78);
  const opacity = useSharedValue(reduceMotion ? 1 : 0.55);

  useEffect(() => {
    if (correct) { haptics.success(); void sound.play('correct'); }
    else { haptics.warning(); void sound.play('wrong'); }
  }, [correct]);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = 0.78;
    opacity.value = 0.55;
    scale.value = withSpring(1, { damping: 11, stiffness: 190, mass: 0.7 });
    opacity.value = withSpring(1, { damping: 16, stiffness: 180 });
  }, [correct, reduceMotion, scale, opacity]);

  const mascotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: (1 - scale.value) * 8 }],
  }));
  const tone = correct ? colors.success : colors.accentWarm;
  const surface = correct ? colors.successSoft : colors.warmSoft;

  return (
    <View
      accessibilityRole="alert"
      className="mt-4 flex-row items-center gap-3 rounded-2xl px-3 py-3"
      style={{ backgroundColor: surface }}>
      <Animated.View style={mascotStyle}>
        <Image
          source={correct ? require('@/assets/images/owl/hero-cheer.webp') : require('@/assets/images/owl/nav-owl-stand.webp')}
          style={{ width: 52, height: 52 }}
          resizeMode="contain"
          accessibilityLabel={correct ? 'Cú IELTSPath chúc mừng bạn' : 'Cú IELTSPath động viên bạn thử lại'}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      <View className="flex-1">
        <Text weight="extrabold" className="text-base" style={{ color: tone }}>
          {title ?? (correct ? 'Chính xác! Làm tốt lắm.' : 'Chưa đúng, mình thử lại nhé.')}
        </Text>
        {detail ? <Text className="mt-1 text-sm leading-5 text-ink">{detail}</Text> : null}
      </View>
    </View>
  );
}
