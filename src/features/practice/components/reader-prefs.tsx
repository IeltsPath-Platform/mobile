import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { Sheet } from './sheet';

export type FontSize = 'small' | 'medium' | 'large';
export type ReaderPrefs = { fontSize: FontSize; eyeComfort: boolean };

const KEY = 'practice.reader-prefs';
const FONT_PX: Record<FontSize, number> = { small: 15, medium: 17, large: 20 };
const FONT_LABEL: Record<FontSize, string> = { small: 'Nhỏ', medium: 'Vừa', large: 'Lớn' };

/** Warm paper for long reading, the same idea as the web "eye comfort" mode. */
const EYE = { background: '#f6efdf', text: '#3b3326', line: '#e5d9bf' };

type ReaderContext = ReaderPrefs & {
  set: (next: Partial<ReaderPrefs>) => void;
  /** Body text size and line height of passages and questions. */
  text: { fontSize: number; lineHeight: number };
  /** Colours of the reading surface (paper in eye comfort mode). */
  paper: { background: string; text: string; line: string };
};

const Context = createContext<ReaderContext | null>(null);

/** Font size and eye comfort of the test screens, remembered on the device. */
export function ReaderPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ReaderPrefs>({ fontSize: 'medium', eyeComfort: false });
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      const value = JSON.parse(raw) as Partial<ReaderPrefs>;
      setPrefs((current) => ({
        fontSize: value.fontSize && value.fontSize in FONT_PX ? value.fontSize : current.fontSize,
        eyeComfort: typeof value.eyeComfort === 'boolean' ? value.eyeComfort : current.eyeComfort,
      }));
    }).catch(() => undefined);
  }, []);
  const value = useMemo<ReaderContext>(() => {
    const size = FONT_PX[prefs.fontSize];
    return {
      ...prefs,
      set: (next) => setPrefs((current) => {
        const merged = { ...current, ...next };
        void AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => undefined);
        return merged;
      }),
      text: { fontSize: size, lineHeight: Math.round(size * 1.6) },
      paper: prefs.eyeComfort ? EYE : { background: colors.surface, text: colors.ink, line: colors.line },
    };
  }, [prefs]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useReaderPrefs(): ReaderContext {
  const value = useContext(Context);
  if (!value) throw new Error('useReaderPrefs must be used inside ReaderPrefsProvider');
  return value;
}

export function ReaderSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const prefs = useReaderPrefs();
  return (
    <Sheet visible={visible} onClose={onClose} title="Hiển thị">
      <Text weight="bold" className="mb-2 text-sm text-muted">Cỡ chữ</Text>
      <View className="flex-row gap-2">
        {(Object.keys(FONT_PX) as FontSize[]).map((size) => {
          const active = prefs.fontSize === size;
          return (
            <Pressable
              key={size}
              onPress={() => prefs.set({ fontSize: size })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl"
              style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentSoft : colors.surface }}>
              <Text weight="bold" style={{ fontSize: FONT_PX[size] - 1, color: active ? colors.accentDeep : colors.ink }}>{FONT_LABEL[size]}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-5 min-h-12 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text weight="bold" className="text-base text-ink">Chế độ dịu mắt</Text>
          <Text className="mt-0.5 text-xs text-muted">Nền giấy ấm, đỡ mỏi mắt khi đọc lâu</Text>
        </View>
        <Switch value={prefs.eyeComfort} onValueChange={(eyeComfort) => prefs.set({ eyeComfort })} accessibilityLabel="Chế độ dịu mắt" />
      </View>
    </Sheet>
  );
}
