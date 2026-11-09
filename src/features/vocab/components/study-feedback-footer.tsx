import { Check, Heart, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';
import { motion } from '@/src/theme/design-tokens';

type Props = {
  correct: boolean;
  correctText: string | null;
  explanation: string | null;
  heartLost: boolean;
  buttonLabel: string;
  busy: boolean;
  bottomInset: number;
  onContinue: () => void;
};

/**
 * Result bar that slides up over the check button after grading: green when right, red when
 * wrong, always with an icon and words so colour is never the only signal. Stays until the
 * learner taps the button, so there is time to read the explanation.
 */
export function StudyFeedbackFooter({ correct, correctText, explanation, heartLost, buttonLabel, busy, bottomInset, onContinue }: Props) {
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);

  useEffect(() => {
    if (correct) {
      haptics.success();
      void sound.play('correct');
    } else {
      haptics.warning();
      void sound.play('wrong');
    }
    if (!correct && !reduceMotion) {
      shake.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [correct, reduceMotion, shake]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const tone = correct ? colors.success : colors.danger;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInDown.duration(motion.transition)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: correct ? colors.successSoft : colors.dangerSoft, paddingBottom: bottomInset, paddingHorizontal: 20, paddingTop: 16 }}>
      <View className="mb-3 flex-row items-center gap-3">
        <Animated.View
          style={[{ backgroundColor: tone, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, iconStyle]}>
          {correct ? (
            <Check size={26} color={colors.surface} strokeWidth={3.5} />
          ) : (
            <X size={26} color={colors.surface} strokeWidth={3.5} />
          )}
        </Animated.View>
        <Text weight="black" className="flex-1 text-2xl" style={{ color: tone }}>
          {correct ? 'Tuyệt vời!' : 'Chưa đúng rồi'}
        </Text>
      </View>

      <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
        {!correct && correctText ? (
          <View className="mb-2">
            <Text weight="black" style={{ color: tone }}>
              Đáp án đúng:
            </Text>
            <Text className="text-base leading-6 text-ink">
              {correctText}
            </Text>
          </View>
        ) : null}
        {!correct && explanation ? <Text className="mb-2 text-sm leading-5 text-ink">{explanation}</Text> : null}
        {!correct && !explanation && !correctText ? (
          <Text className="mb-2 text-sm leading-5 text-ink">Đọc lại câu hỏi và thử thêm lần nữa nhé.</Text>
        ) : null}
        {heartLost ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <Heart size={14} color={colors.danger} fill={colors.danger} />
            <Text className="text-sm text-ink">Bạn vừa mất 1 tim ở câu này.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Button
        className="mt-1"
        variant={correct ? 'success' : 'danger'}
        label={buttonLabel}
        disabled={busy}
        onPress={onContinue}
      />
    </Animated.View>
  );
}
