import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { PanResponder, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

/** Shares of the container height the panel snaps to: peek, half, full. */
const SNAPS = [0.2, 0.55, 0.92] as const;
export type SnapIndex = 0 | 1 | 2;
export type SnapPanelHandle = { snapTo: (index: SnapIndex) => void };

type SnapPanelProps = {
  /** Text on the grab bar (e.g. "Câu 3 / 13"). */
  title: string;
  initial?: SnapIndex;
  children: ReactNode;
  onSnap?: (index: SnapIndex) => void;
  tint?: string;
};

/**
 * A panel docked to the bottom of its container that the learner drags between three heights, so the passage and the
 * questions share the screen as the moment needs. Only the grab bar takes the drag, the content scrolls normally.
 */
export const SnapPanel = forwardRef<SnapPanelHandle, SnapPanelProps>(function SnapPanel({ title, initial = 1, children, onSnap, tint = colors.accent }, ref) {
  const reduceMotion = useReducedMotion();
  const [container, setContainer] = useState(0);
  const [snap, setSnap] = useState<SnapIndex>(initial);
  const height = useSharedValue(0);
  const start = useRef(0);
  const containerRef = useRef(0);
  const snapRef = useRef<SnapIndex>(initial);

  const animateTo = (index: SnapIndex) => {
    const target = SNAPS[index] * containerRef.current;
    height.value = reduceMotion ? withTiming(target, { duration: 0 }) : withSpring(target, { damping: 22, stiffness: 220 });
    snapRef.current = index;
    setSnap(index);
    onSnap?.(index);
  };
  useImperativeHandle(ref, () => ({ snapTo: animateTo }));

  const responder = useRef(PanResponder.create({
    // Let a tap reach the accessible height button; only vertical drags take over.
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => { start.current = height.value; },
    onPanResponderMove: (_, gesture) => {
      const max = SNAPS[2] * containerRef.current;
      const min = SNAPS[0] * containerRef.current;
      height.value = Math.max(min * 0.8, Math.min(max, start.current - gesture.dy));
    },
    onPanResponderRelease: (_, gesture) => {
      const current = height.value / Math.max(1, containerRef.current);
      // A fling moves one step in its direction; otherwise the nearest height wins.
      let index: SnapIndex;
      if (gesture.vy < -0.6) index = Math.min(2, snapRef.current + 1) as SnapIndex;
      else if (gesture.vy > 0.6) index = Math.max(0, snapRef.current - 1) as SnapIndex;
      else index = SNAPS.reduce<number>((best, value, candidate) => (Math.abs(value - current) < Math.abs(SNAPS[best]! - current) ? candidate : best), 0) as SnapIndex;
      animateTo(index);
    },
  })).current;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (Math.abs(next - containerRef.current) < 1) return;
    containerRef.current = next;
    setContainer(next);
    height.value = SNAPS[snapRef.current] * next;
  };

  const style = useAnimatedStyle(() => ({ height: height.value }));
  const cycle = () => animateTo(((snap + 1) % 3) as SnapIndex);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onLayout={onLayout}>
      {container > 0 ? (
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.line, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: -2 }, elevation: 12 }, style]}>
          <View {...responder.panHandlers}>
            <Pressable
              onPress={cycle}
              accessibilityRole="adjustable"
              accessibilityLabel={`${title}. Bảng câu hỏi, kéo hoặc chạm để đổi chiều cao`}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(event) => animateTo((event.nativeEvent.actionName === 'increment' ? Math.min(2, snap + 1) : Math.max(0, snap - 1)) as SnapIndex)}
              className="items-center pb-2.5 pt-2.5">
              <View className="h-1.5 w-11 rounded-full bg-line" />
              <View className="mt-2 flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: tint }} />
                <Text weight="extrabold" className="text-xs text-ink">{title}</Text>
                {snap === 2 ? <ChevronDown size={14} color={colors.muted} /> : <ChevronUp size={14} color={colors.muted} />}
              </View>
            </Pressable>
          </View>
          <View className="flex-1">{children}</View>
        </Animated.View>
      ) : null}
    </View>
  );
});
