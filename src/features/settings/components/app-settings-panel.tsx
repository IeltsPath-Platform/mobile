import { Bell, ChevronRight, Music, Volume2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';
import { SettingsToggleItem } from './settings-rows';
import { type AppSettings, type FontSizeOption, useAppSettings } from '../use-app-settings';

const FONT_OPTIONS: { value: FontSizeOption; label: string; preview: number }[] = [
  { value: 'S', label: 'Nhỏ', preview: 15 },
  { value: 'M', label: 'Vừa', preview: 19 },
  { value: 'L', label: 'Lớn', preview: 24 },
];

type BooleanSettingKey = 'soundEnabled' | 'musicEnabled';

function Divider() {
  return <View style={{ height: 2, backgroundColor: colors.line, marginHorizontal: 16 }} />;
}

/** Notification, sound and font-size controls shown inside the settings accordion. */
export function AppSettingsPanel() {
  const router = useRouter();
  const { settings, update } = useAppSettings();

  const toggle = (key: BooleanSettingKey) => (value: boolean) => {
    haptics.select();
    void update({ [key]: value } as Partial<AppSettings>);
    if (key === 'soundEnabled' && value) void sound.play('tap');
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thông báo cộng đồng"
        onPress={() => router.push('/community/notification-preferences' as never)}
        className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:opacity-70">
        <Bell size={22} color={colors.accentDeep} />
        <View className="flex-1">
          <Text weight="bold" className="text-base text-ink">
            Thông báo cộng đồng
          </Text>
          <Text className="mt-0.5 text-sm text-muted">Chọn loại thông báo bạn muốn nhận</Text>
        </View>
        <ChevronRight size={20} color={colors.muted} />
      </Pressable>
      <Divider />

      <SettingsToggleItem
        icon={Volume2}
        title="Âm thanh bài học"
        description="Hiệu ứng đúng, sai và phát âm từ"
        value={settings.soundEnabled}
        onChange={toggle('soundEnabled')}
      />
      <Divider />
      <SettingsToggleItem
        icon={Music}
        title="Nhạc nền"
        description="Phát nhạc nhẹ khi học bài"
        value={settings.musicEnabled}
        onChange={toggle('musicEnabled')}
      />
      <Divider />

      <View className="px-4 pb-4 pt-3">
        <Text weight="bold" className="text-base text-ink">
          Cỡ chữ
        </Text>
        <View className="mt-3 flex-row gap-2">
          {FONT_OPTIONS.map(({ value, label, preview }) => {
            const selected = settings.fontSize === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`Cỡ chữ ${label.toLowerCase()}`}
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  haptics.select();
                  void update({ fontSize: value });
                }}
                className="min-h-16 flex-1 items-center justify-center rounded-2xl active:opacity-80"
                style={{
                  borderWidth: 2,
                  borderBottomWidth: 4,
                  borderColor: selected ? colors.accent : colors.line,
                  borderBottomColor: selected ? colors.accentShade : colors.edge,
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                }}>
                <Text weight="black" style={{ fontSize: preview, color: selected ? colors.accentDeep : colors.ink }}>
                  Aa
                </Text>
                <Text weight="bold" className="text-xs" style={{ color: selected ? colors.accentDeep : colors.muted }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
