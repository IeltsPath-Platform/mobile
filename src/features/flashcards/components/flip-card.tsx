import { useEffect } from 'react';
import { Image, Pressable, View, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type FlipCardProps = {
  front: string;
  back: string;
  imageUrl?: string | null;
  flipped: boolean;
  onFlip: () => void;
};

const cardFace: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  minHeight: 240,
  borderRadius: 24,
  borderWidth: 1,
  borderBottomWidth: 4,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 24,
  backfaceVisibility: 'hidden',
};

export function FlipCard({ front, back, imageUrl, flipped, onFlip }: FlipCardProps) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withTiming(flipped ? 180 : 0, { duration: 280 });
  }, [flipped, spin]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(spin.value, [0, 90, 180], [1, 0, 0]),
    transform: [{ perspective: 1000 }, { rotateY: `${spin.value}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(spin.value, [0, 90, 180], [0, 0, 1]),
    transform: [{ perspective: 1000 }, { rotateY: `${spin.value - 180}deg` }],
  }));

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={flipped ? back : front} onPress={onFlip}>
      <View style={{ minHeight: 240 }}>
        <Animated.View style={[cardFace, { backgroundColor: colors.surface, borderColor: colors.line }, frontStyle]}>
          <Text weight="bold" className="text-xs uppercase tracking-wide text-muted">
            Mặt trước
          </Text>
          <Text weight="black" className="mt-3 text-center text-3xl leading-9">
            {front}
          </Text>
          <Text className="mt-4 text-sm text-muted">Chạm để lật</Text>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[cardFace, { backgroundColor: colors.accentSoft, borderColor: colors.accent }, backStyle]}>
          <Text weight="bold" className="text-xs uppercase tracking-wide text-accent-deep">
            Nghĩa
          </Text>
          {imageUrl ? <Image source={{ uri: imageUrl }} resizeMode="contain" className="mt-3 h-20 w-full" accessibilityLabel="Ảnh minh họa của thẻ" /> : null}
          <Text weight="extrabold" className="mt-3 text-center text-2xl leading-8 text-accent-deep">
            {back}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}
