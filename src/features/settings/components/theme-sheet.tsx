import { Check } from 'lucide-react-native';
import { useSyncExternalStore } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors, darkColors, lightColors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { type ThemeOption, useAppSettings } from '../use-app-settings';

export const THEME_LABEL: Record<ThemeOption, string> = {
  light: 'Sáng',
  dark: 'Tối',
  system: 'Theo máy',
};

const OPTIONS: ThemeOption[] = ['light', 'dark', 'system'];

// Open state lives outside React screens: a theme change remounts the screen that opened the sheet,
// and the sheet has to stay put so the choice can be changed again straight away.
let sheetOpen = false;
const sheetListeners = new Set<() => void>();
function setSheetOpen(next: boolean) {
  sheetOpen = next;
  sheetListeners.forEach((listener) => listener());
}
export const openThemeSheet = () => setSheetOpen(true);

/** Mounted once, above the screens that get re-keyed on theme change. */
export function ThemeSheetHost() {
  const visible = useSyncExternalStore(
    (listener) => {
      sheetListeners.add(listener);
      return () => sheetListeners.delete(listener);
    },
    () => sheetOpen,
    () => false,
  );
  return <ThemeSheet visible={visible} onClose={() => setSheetOpen(false)} />;
}

/** Miniature screen drawn with the real palette; "system" shows both palettes split down the middle. */
function ThemePreview({ option }: { option: ThemeOption }) {
  const half = (palette: typeof lightColors, width: string) => (
    <View style={{ width: width as `${number}%`, height: '100%', backgroundColor: palette.canvas, padding: 8, gap: 6 }}>
      <View style={{ height: 8, width: '60%', borderRadius: 4, backgroundColor: palette.ink }} />
      <View style={{ height: 22, borderRadius: 8, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.line }} />
      <View style={{ height: 10, borderRadius: 5, backgroundColor: palette.accent }} />
    </View>
  );
  return (
    <View style={{ height: 84, borderRadius: 12, overflow: 'hidden', flexDirection: 'row', borderWidth: 1.5, borderColor: colors.line }}>
      {option === 'system' ? (
        <>
          {half(lightColors, '50%')}
          {half(darkColors, '50%')}
        </>
      ) : (
        half(option === 'dark' ? darkColors : lightColors, '100%')
      )}
    </View>
  );
}

/** Bottom sheet with three live previews; the choice applies as soon as a preview is tapped. */
function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const { vars } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }, vars]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={{ flex: 1 }} />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 14 }} />
          <Text accessibilityRole="header" weight="black" className="text-xl text-ink">
            Giao diện
          </Text>
          <Text className="mb-4 mt-0.5 text-sm text-muted">Chọn màu nền cho ứng dụng</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {OPTIONS.map((value) => {
              const selected = settings.theme === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`Giao diện ${THEME_LABEL[value].toLowerCase()}`}
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    haptics.select();
                    void update({ theme: value });
                  }}
                  className="flex-1 active:opacity-80"
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderBottomWidth: 4,
                    borderColor: selected ? colors.accent : colors.line,
                    borderBottomColor: selected ? colors.accentShade : colors.edge,
                    backgroundColor: selected ? colors.accentSoft : colors.surface,
                  }}>
                  <ThemePreview option={value} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, minHeight: 24 }}>
                    {selected ? <Check size={16} color={colors.accentDeep} strokeWidth={3.5} /> : null}
                    <Text weight="extrabold" className="text-sm" style={{ color: selected ? colors.accentDeep : colors.ink }}>
                      {THEME_LABEL[value]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
