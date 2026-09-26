import { Check, Lock } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { PathNode } from '../path';

type PathNodeButtonProps = {
  node: PathNode;
  align: 'left' | 'center' | 'right';
  showConnector?: boolean;
  onPress?: () => void;
};

const ALIGN = {
  left: 'items-start self-start',
  center: 'items-center self-center',
  right: 'items-end self-end',
} as const;

export function PathNodeButton({ node, align, showConnector = true, onPress }: PathNodeButtonProps) {
  const locked = node.status === 'locked';
  const current = node.status === 'current';
  const done = node.status === 'done';
  const fill = locked ? colors.line : node.color;
  const edge = locked ? colors.edge : darken(node.color);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!current) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [current, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View className={`w-full ${ALIGN[align]}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        accessibilityHint={locked ? 'Bài khóa, chạm để xem vì sao' : 'Chạm để xem chi tiết và bắt đầu'}
        accessibilityLabel={`${node.title}. ${current ? 'Bài tiếp theo' : done ? 'Đã xong' : 'Đã khóa'}`}
        onPress={onPress}
        className="items-center"
        hitSlop={10}>
        {current ? (
          <View className="mb-2 rounded-full bg-accent px-3 py-1">
            <Text weight="extrabold" className="text-[11px] uppercase tracking-wide text-white">
              Bắt đầu
            </Text>
          </View>
        ) : (
          <View className="mb-2 h-6" />
        )}

        <Animated.View style={current ? ringStyle : undefined}>
          <View
            className="h-[76px] w-[76px] items-center justify-center rounded-full border-[5px]"
            style={{
              backgroundColor: done || current ? fill : colors.surface,
              borderColor: fill,
              borderBottomWidth: 8,
              borderBottomColor: edge,
              opacity: locked ? 0.75 : 1,
            }}>
            {done ? (
              <Check size={30} color="#fff" strokeWidth={3.5} />
            ) : locked ? (
              <Lock size={26} color={colors.muted} />
            ) : (
              <node.Icon size={30} color="#fff" />
            )}
          </View>
        </Animated.View>

        {(current || done) && (
          <Text weight="extrabold" className="mt-2 max-w-[150px] text-center text-sm" numberOfLines={2}>
            {node.title}
          </Text>
        )}
      </Pressable>

      {showConnector ? (
        <View
          className="mt-2 h-8 w-1 self-center rounded-full"
          style={{ backgroundColor: done ? colors.accent : colors.line, marginLeft: align === 'left' ? 37 : align === 'right' ? undefined : 0, marginRight: align === 'right' ? 37 : 0 }}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

function darken(hex: string) {
  const value = hex.replace('#', '');
  const num = Number.parseInt(value.length === 3 ? value.split('').map((c) => c + c).join('') : value, 16);
  const r = Math.max(0, ((num >> 16) & 255) - 28);
  const g = Math.max(0, ((num >> 8) & 255) - 28);
  const b = Math.max(0, (num & 255) - 28);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
