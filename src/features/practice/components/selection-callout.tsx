import { Eraser, Layers, X, type LucideIcon } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewInstance } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';

import type { TextMarking } from '../hooks/use-text-marking';

const BUBBLE = '#2b2b2f';
const ARROW = 10;
/** From the touched word to the tip of the arrow. */
const GAP = 24;
const MARGIN = 8;

type Action = { id: string; onPress: () => void; label?: string; icon?: LucideIcon; description: string };

function actionsOf(marking: TextMarking, lookupEnabled: boolean): Action[] {
  const actions: Action[] = [];
  if (marking.coverage === 'full') actions.push({ id: 'unhighlight', label: 'Bỏ highlight', description: 'Bỏ highlight đoạn đã chọn', onPress: marking.unhighlight });
  else actions.push({ id: 'highlight', label: 'Highlight', description: 'Highlight đoạn đã chọn', onPress: marking.highlight });
  // Selected words that are only partly highlighted can still be cleared, without a wide label.
  if (marking.coverage === 'partial') actions.push({ id: 'erase', icon: Eraser, description: 'Bỏ highlight đoạn đã chọn', onPress: marking.unhighlight });
  actions.push({ id: 'note', label: 'Ghi chú', description: 'Ghi chú cho đoạn đã chọn', onPress: marking.note });
  if (lookupEnabled) actions.push({ id: 'translate', label: 'Dịch', description: 'Dịch và lưu vào sổ từ', onPress: marking.translate });
  // A phrase or sentence is kept whole as a flashcard; a single word is saved from its meaning (Translate).
  if (lookupEnabled) actions.push({ id: 'card', icon: Layers, description: 'Lưu đoạn đã chọn thành flashcard', onPress: marking.saveCard });
  actions.push({ id: 'close', icon: X, description: 'Bỏ chọn', onPress: marking.clearSelection });
  return actions;
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));

/**
 * The menu of a selection, as a dark bubble with an arrow next to the touched word (like the iPhone's): Highlight,
 * Note, Translate. It sits above the word, or below it when there is no room, and keeps inside the screen.
 */
export function SelectionCallout({ marking, lookupEnabled }: { marking: TextMarking; lookupEnabled: boolean }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const root = useRef<ViewInstance>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<{ key: string; width: number; height: number } | null>(null);

  const actions = actionsOf(marking, lookupEnabled);
  const key = actions.map((action) => action.id).join('|');
  const point = marking.callout;
  const measured = size && size.key === key ? size : null;
  const content = <Row actions={actions} />;

  let bubble: ReactNode = null;
  if (point && measured) {
    const x = point.x - origin.x;
    const y = point.y - origin.y;
    const left = clamp(x - measured.width / 2, MARGIN, screenWidth - measured.width - MARGIN);
    // Above the word unless that would run under the header; below it when the bottom has room.
    const above = point.y - GAP - ARROW - measured.height >= insets.top + 64 || point.y + GAP + ARROW + measured.height > screenHeight - insets.bottom;
    const top = above ? y - GAP - ARROW - measured.height : y + GAP * 0.8 + ARROW;
    const arrowLeft = clamp(x - left, 18, measured.width - 18) - ARROW / 2;
    bubble = (
      <Animated.View
        key={key}
        entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)}
        accessibilityRole="toolbar"
        accessibilityLabel="Công cụ trên đoạn đã chọn"
        style={{ position: 'absolute', left, top, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12 }}>
        {content}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: arrowLeft, width: ARROW, height: ARROW, backgroundColor: BUBBLE, borderRadius: 2, transform: [{ rotate: '45deg' }],
            ...(above ? { bottom: -ARROW / 2 + 1 } : { top: -ARROW / 2 + 1 }),
          }}
        />
      </Animated.View>
    );
  }

  return (
    <View
      ref={root}
      pointerEvents="box-none"
      onLayout={() => root.current?.measureInWindow((x, y) => setOrigin((current) => (current.x === x && current.y === y ? current : { x, y })))}
      style={[StyleSheet.absoluteFill, { zIndex: 60, elevation: 60 }]}>
      {/* The bubble is measured off screen first, so it can be centred on the word without jumping. */}
      {point && !measured ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', opacity: 0, left: 0, top: 0 }}
          onLayout={(event) => setSize({ key, width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
          {content}
        </View>
      ) : null}
      {bubble}
      {/* While the learner scrolls to the far end of a long selection the bubble steps aside; its actions stay in reach. */}
      {marking.selection && !point ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 92, alignItems: 'center' }}>
          <Animated.View entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)} className="items-center gap-1.5">
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: BUBBLE }}>
              <Text weight="bold" className="text-xs" style={{ color: '#ffffffcc' }}>{marking.wordCount} từ đã chọn · chạm từ cuối để mở rộng</Text>
            </View>
            {content}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

function Row({ actions }: { actions: Action[] }) {
  return (
    <View className="flex-row items-center self-start rounded-2xl px-1" style={{ backgroundColor: BUBBLE }}>
      {actions.map((action, position) => (
        <View key={action.id} className="flex-row items-center">
          {position > 0 ? <View style={{ width: StyleSheet.hairlineWidth, height: 18, backgroundColor: 'rgba(255,255,255,0.25)' }} /> : null}
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.description}
            hitSlop={{ top: 6, bottom: 6 }}
            className="h-11 items-center justify-center active:opacity-60"
            style={{ paddingHorizontal: action.label ? 13 : 11 }}>
            {action.icon ? <action.icon size={17} color="#ffffffcc" strokeWidth={2.2} /> : null}
            {action.label ? <Text weight="semibold" className="text-[14px]" style={{ color: '#ffffff' }} numberOfLines={1}>{action.label}</Text> : null}
          </Pressable>
        </View>
      ))}
    </View>
  );
}
