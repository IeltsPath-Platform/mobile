import type { LucideIcon } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export type ActionSheetItem = {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  /** Short helper line under the label. */
  hint?: string;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
};

/**
 * Bottom sheet for contextual actions. Unlike Alert it has no 3-button limit on Android
 * and keeps every row at a thumb-sized 56pt target.
 */
export function ActionSheet({ visible, title, items, onClose }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} className="absolute inset-0 bg-black/50">
          <Pressable className="flex-1" onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(220).reduceMotion(ReduceMotion.System)}
          accessibilityViewIsModal
          className="rounded-t-[28px] bg-surface px-4 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-line" />
          {title ? <Text weight="bold" className="px-2 pb-2 pt-1 text-xs uppercase tracking-wider text-muted">{title}</Text> : null}
          {items.map((item) => {
            const Icon = item.icon;
            const tone = item.destructive ? colors.danger : colors.ink;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => { onClose(); item.onPress(); }}
                className="min-h-14 flex-row items-center gap-4 rounded-2xl px-3 active:bg-canvas">
                {Icon ? <Icon size={21} color={tone} /> : null}
                <View className="flex-1">
                  <Text weight="semibold" className="text-base" style={{ color: tone }}>{item.label}</Text>
                  {item.hint ? <Text className="mt-0.5 text-xs text-muted">{item.hint}</Text> : null}
                </View>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="mt-2 min-h-12 items-center justify-center rounded-2xl bg-canvas active:opacity-70">
            <Text weight="bold" className="text-base text-muted">Hủy</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
