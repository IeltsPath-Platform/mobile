import { useEffect, useRef, useState } from 'react';
import { ThumbsUp } from 'lucide-react-native';
import { Animated, Pressable, View, type GestureResponderEvent, type ViewInstance } from 'react-native';
import { Text } from '@/src/components/ui/text';
import type { ReactionType } from '@/src/features/community/api';
import { getReactions } from '@/src/features/community/reaction-meta';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

type Props = {
  /** Icon + count only (feed rows); the full labelled button is used on the detail screen. */
  compact?: boolean;
  count?: number;
  selected?: ReactionType | null;
  disabled?: boolean;
  onSelect: (reaction: ReactionType) => void;
};

/** Quick tap applies/removes the current reaction; holding opens the reaction tray. */
export function CommunityReactionControl({ selected, disabled = false, onSelect, compact = false, count = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<ReactionType | null>(null);
  const hoveredRef = useRef<ReactionType | null>(null);
  const suppressTap = useRef(false);
  const dragging = useRef(false);
  const clearSuppressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reactionRefs = useRef(new Map<ReactionType, ViewInstance>());
  const reactionBounds = useRef(new Map<ReactionType, { left: number; top: number; right: number; bottom: number }>());
  const reactions = getReactions();
  const scales = useRef(new Map(reactions.map(({ type }) => [type, new Animated.Value(1)]))).current;
  const active = reactions.find((item) => item.type === selected);
  const ActiveIcon = active?.Icon ?? ThumbsUp;

  useEffect(() => () => clearTimeout(clearSuppressTimer.current), []);
  useEffect(() => {
    for (const { type } of reactions) {
      Animated.spring(scales.get(type)!, {
        toValue: hovered === type ? 1.38 : 1,
        stiffness: 320,
        damping: 15,
        mass: 0.55,
        useNativeDriver: true,
      }).start();
    }
  }, [hovered, scales]);

  const measureReaction = (type: ReactionType) => {
    reactionRefs.current.get(type)?.measureInWindow((x, y, width, height) => {
      reactionBounds.current.set(type, { left: x - 8, top: y - 10, right: x + width + 8, bottom: y + height + 10 });
    });
  };
  const findReaction = (x: number, y: number) => reactions.find(({ type }) => {
    const rect = reactionBounds.current.get(type);
    return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  })?.type ?? null;
  const touchPoint = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0] ?? event.nativeEvent.changedTouches[0];
    return touch ? { x: touch.pageX, y: touch.pageY } : null;
  };
  const updateHovered = (event: GestureResponderEvent) => {
    if (!dragging.current) return;
    const point = touchPoint(event);
    if (!point) return;
    const next = findReaction(point.x, point.y);
    if (next && next !== hoveredRef.current) haptics.select();
    hoveredRef.current = next;
    setHovered(next);
  };
  const finishDrag = (event: GestureResponderEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const point = touchPoint(event);
    const target = point ? findReaction(point.x, point.y) : hovered;
    setOpen(false);
    setHovered(null);
    hoveredRef.current = null;
    if (target) { haptics.tap(); onSelect(target); }
  };

  const onLongPress = () => {
    haptics.hold();
    hoveredRef.current = null;
    suppressTap.current = true;
    dragging.current = true;
    reactionBounds.current.clear();
    setOpen(true);
  };
  const onPressOut = () => {
    if (!suppressTap.current) return;
    clearTimeout(clearSuppressTimer.current);
    clearSuppressTimer.current = setTimeout(() => { suppressTap.current = false; }, 250);
  };
  const onQuickPress = () => {
    if (suppressTap.current) {
      clearTimeout(clearSuppressTimer.current);
      suppressTap.current = false;
      return;
    }
    setOpen(false);
    haptics.tap();
    onSelect(selected ?? 'LIKE');
  };
  return (
    <View
      className={compact ? 'relative' : 'relative flex-1'}
      style={{ zIndex: open ? 20 : 0 }}
      onMoveShouldSetResponderCapture={() => dragging.current}
      onResponderTerminationRequest={() => !dragging.current}
      onResponderMove={updateHovered}
      onResponderRelease={finishDrag}
      onResponderTerminate={() => { dragging.current = false; setOpen(false); setHovered(null); }}
      onTouchMove={updateHovered}
      onTouchEnd={finishDrag}
      onTouchCancel={() => { dragging.current = false; setOpen(false); setHovered(null); }}
    >
      {open ? (
        <View
          className="absolute bottom-12 left-0 z-20 flex-row items-center rounded-full border border-line bg-surface p-1.5"
          style={{ shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12 }}
          accessibilityLabel="Chọn cảm xúc"
          pointerEvents="none"
        >
          {reactions.map(({ type, label, Icon, color }) => {
            const isHovered = hovered === type;
            return (
              <View key={type} ref={(node) => { if (node) reactionRefs.current.set(type, node); }} onLayout={() => requestAnimationFrame(() => measureReaction(type))} className="relative h-11 w-11 items-center justify-center">
                {isHovered ? <View className="absolute -top-7 z-30 rounded-full px-2 py-1" style={{ backgroundColor: color }}><Text weight="bold" className="text-[10px] text-white">{label}</Text></View> : null}
                <Animated.View className="h-11 w-11 items-center justify-center rounded-full" style={[{ backgroundColor: isHovered ? `${color}20` : 'transparent', transform: [{ scale: scales.get(type)! }] }]}>
                  <Icon size={isHovered ? 27 : 22} color={color} fill={type === 'LOVE' && (isHovered || selected === type) ? color : 'transparent'} />
                </Animated.View>
              </View>
            );
          })}
        </View>
      ) : null}
      <View className="flex-row items-center">
        <Pressable
          disabled={disabled}
          onPress={onQuickPress}
          onPressOut={onPressOut}
          onLongPress={onLongPress}
          delayLongPress={350}
          className={compact ? 'min-h-11 min-w-11 flex-row items-center justify-center gap-1.5 rounded-full px-2.5 active:opacity-60' : 'min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg active:opacity-60'}
          accessibilityRole="button"
          accessibilityLabel={`${active?.label ?? 'Thích'}${count > 0 ? `, ${count} lượt` : ''}`}
          accessibilityHint="Nhấn nhanh để thích; nhấn giữ, trượt tới cảm xúc rồi thả tay để chọn"
        >
          <ActiveIcon
            size={compact ? 21 : 18}
            color={active?.color ?? colors.muted}
            fill={selected === 'LIKE' || selected === 'LOVE' ? active?.color ?? colors.accent : 'transparent'}
          />
          {compact
            ? (count > 0 ? <Text weight="semibold" className="text-[13px]" style={{ color: active?.color ?? colors.muted }}>{count}</Text> : null)
            : <TextLabel label={active?.label ?? 'Thích'} color={active?.color ?? colors.muted} />}
        </Pressable>
      </View>
    </View>
  );
}

function TextLabel({ label, color }: { label: string; color: string }) {
  return <Text weight="semibold" className="text-xs" style={{ color }}>{label}</Text>;
}
