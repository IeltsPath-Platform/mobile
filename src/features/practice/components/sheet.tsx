import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type SheetProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons pinned under the scrolling content. */
  footer?: ReactNode;
  /** Largest share of the screen height the sheet may take. */
  maxHeight?: `${number}%`;
  /** A sheet that must be answered (e.g. while sending) cannot be dismissed by the backdrop. */
  dismissable?: boolean;
  scroll?: boolean;
};

/** Modal bottom sheet used by every practice dialog: grab bar, title, scrolling body and pinned footer. */
export function Sheet({ visible, title, subtitle, onClose, children, footer, maxHeight = '88%', dismissable = true, scroll = true }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { vars } = useTheme();
  const close = () => { if (dismissable) onClose(); };
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end" style={vars}>
        <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable className="flex-1" onPress={close} accessibilityRole="button" accessibilityLabel="Đóng" />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(220).reduceMotion(ReduceMotion.System)}
          accessibilityViewIsModal
          style={{ maxHeight, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="mb-1 mt-2 h-1 w-10 self-center rounded-full bg-line" />
          {title ? (
            <View className="flex-row items-start gap-3 px-5 pb-2 pt-2">
              <View className="flex-1">
                <Text accessibilityRole="header" weight="extrabold" className="text-lg text-ink">{title}</Text>
                {subtitle ? <Text className="mt-1 text-sm text-muted">{subtitle}</Text> : null}
              </View>
              {dismissable ? (
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-canvas">
                  <X size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>{children}</ScrollView>
          ) : <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexShrink: 1 }}>{children}</View>}
          {footer ? <View className="gap-3 px-5 pt-2">{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
