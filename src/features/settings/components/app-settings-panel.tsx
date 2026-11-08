import { Bell, ChevronRight, Moon, Sun, Volume2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';
import { SettingsToggleItem } from './settings-rows';
import { type AppSettings, type FontSizeOption, useAppSettings } from '../use-app-settings';

const FONT_OPTIONS: { value: FontSizeOption; label: string }[] = [
  { value: 'S', label: 'nhỏ' },
  { value: 'M', label: 'vừa' },
  { value: 'L', label: 'lớn' },
];

type BooleanSettingKey = 'notifyStudy' | 'notifyStreak' | 'soundEnabled' | 'musicEnabled';

function SubHeader({ icon: Icon, title, first }: { icon: typeof Bell; title: string; first?: boolean }) {
  return (
    <View className={`flex-row items-center gap-1.5 px-4 pb-1.5 ${first ? 'pt-3' : 'pt-3.5'}`}>
      <Icon size={13} color={colors.accentDeep} />
      <Text weight="black" className="text-[11px] uppercase tracking-wider text-accent-deep">
        {title}
      </Text>
    </View>
  );
}

/** Notification, sound, theme and font-size controls shown inside the accordion. */
export function AppSettingsPanel() {
  const router = useRouter();
  const { settings, update } = useAppSettings();

  const toggle = (key: BooleanSettingKey) => (value: boolean) => {
    haptics.select();
    void update({ [key]: value } as Partial<AppSettings>);
    if (key === 'soundEnabled' && value) void sound.play('tap');
  };

  return (
    <View className="bg-canvas/40 pb-1">
      <SubHeader icon={Bell} title="Thông báo & Nhắc nhở" first />
      <SettingsToggleItem
        title="Nhắc nhở học tập mỗi ngày"
        value={settings.notifyStudy}
        onChange={toggle('notifyStudy')}
      />
      <SettingsToggleItem
        title="Nhắc nhở giữ chuỗi Streak"
        value={settings.notifyStreak}
        onChange={toggle('notifyStreak')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thông báo cộng đồng"
        onPress={() => router.push('/community/notification-preferences' as never)}
        className="min-h-11 flex-row items-center justify-between border-b border-line/60 px-4 py-2.5 active:bg-canvas"
      >
        <Text weight="bold" className="text-sm text-ink">
          Thông báo cộng đồng
        </Text>
        <ChevronRight size={14} color={colors.accentDeep} />
      </Pressable>

      <SubHeader icon={Volume2} title="Âm thanh & Hiển thị" />
      <SettingsToggleItem
        title="Âm thanh & phát âm bài học"
        value={settings.soundEnabled}
        onChange={toggle('soundEnabled')}
      />
      <SettingsToggleItem
        title="Nhạc nền khi học bài"
        value={settings.musicEnabled}
        onChange={toggle('musicEnabled')}
      />

      <View className="flex-row items-center justify-between border-b border-line/60 px-4 py-2.5">
        <Text weight="bold" className="text-xs text-ink">
          Giao diện ứng dụng
        </Text>
        <View className="flex-row rounded-xl border border-line bg-surface p-0.5">
          <ThemeOption
            label="Sáng"
            a11yLabel="Giao diện sáng"
            icon={Sun}
            activeColor={colors.coin}
            selected={settings.theme === 'light'}
            onPress={() => void update({ theme: 'light' })}
          />
          <ThemeOption
            label="Tối"
            a11yLabel="Giao diện tối"
            icon={Moon}
            activeColor={colors.accent}
            selected={settings.theme === 'dark'}
            onPress={() => void update({ theme: 'dark' })}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between px-4 py-2.5">
        <Text weight="bold" className="text-xs text-ink">
          Cỡ chữ hiển thị
        </Text>
        <View className="flex-row gap-1.5">
          {FONT_OPTIONS.map(({ value, label }) => {
            const selected = settings.fontSize === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`Cỡ chữ ${label}`}
                accessibilityState={{ checked: selected }}
                onPress={() => void update({ fontSize: value })}
                className="h-11 w-11 items-center justify-center rounded-lg border active:opacity-75"
                style={{
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                  borderColor: selected ? colors.accent : colors.line,
                }}
              >
                <Text
                  weight="black"
                  className="text-[11px]"
                  style={{ color: selected ? colors.accentDeep : colors.muted }}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ThemeOption({
  label,
  a11yLabel,
  icon: Icon,
  activeColor,
  selected,
  onPress,
}: {
  label: string;
  a11yLabel: string;
  icon: typeof Sun;
  activeColor: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-1 rounded-lg px-2.5 py-1"
      style={{ backgroundColor: selected ? colors.canvas : 'transparent' }}
    >
      <Icon size={12} color={selected ? activeColor : colors.muted} />
      <Text weight="bold" className="text-xs" style={{ color: selected ? colors.ink : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}
