import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { type ThemeOption, useAppSettings } from '../use-app-settings';

export const THEME_LABEL: Record<ThemeOption, string> = {
  light: 'Chế độ sáng',
  dark: 'Chế độ tối',
  system: 'Giao diện thiết bị',
};

const OPTIONS: { value: ThemeOption; hint?: string }[] = [
  { value: 'light' },
  { value: 'dark' },
  { value: 'system', hint: 'Tự động khớp với giao diện thiết bị của bạn.' },
];

/** Bottom sheet with one big tile per theme; the chosen tile is outlined in the accent colour. */
export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const { vars } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }, vars]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={{ flex: 1 }} />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}>
          <Text accessibilityRole="header" weight="black" className="mb-5 text-center text-xl text-ink">
            Chọn giao diện cho ứng dụng
          </Text>
          {OPTIONS.map(({ value, hint }) => {
            const selected = settings.theme === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={THEME_LABEL[value]}
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  haptics.select();
                  void update({ theme: value });
                }}
                style={{
                  minHeight: 64,
                  justifyContent: 'center',
                  borderRadius: 18,
                  borderWidth: 2,
                  borderBottomWidth: 4,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  marginBottom: 12,
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                  borderColor: selected ? colors.accent : colors.line,
                  borderBottomColor: selected ? colors.accentShade : colors.edge,
                }}
                className="active:opacity-80">
                <Text weight="black" className="text-lg" style={{ color: selected ? colors.accentDeep : colors.ink }}>
                  {THEME_LABEL[value]}
                </Text>
                {hint ? <Text className="mt-0.5 text-sm text-muted">{hint}</Text> : null}
              </Pressable>
            );
          })}
          <Button className="mt-2" label="Xong" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
