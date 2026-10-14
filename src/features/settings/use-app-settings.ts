import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type FontSizeOption = 'S' | 'M' | 'L';
export type ThemeOption = 'light' | 'dark';

export type AppSettings = {
  dailyXpGoal: number;
  notifyStudy: boolean;
  notifyStreak: boolean;
  fontSize: FontSizeOption;
  theme: ThemeOption;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  dailyXpGoal: 50,
  notifyStudy: true,
  notifyStreak: true,
  fontSize: 'M',
  theme: 'light',
};

const STORAGE_KEY = '@ielts/app-settings/v1';

let memoryCache: AppSettings | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

async function readSettings(): Promise<AppSettings> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = { ...DEFAULT_APP_SETTINGS };
      return memoryCache;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    memoryCache = {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
    return memoryCache;
  } catch {
    memoryCache = { ...DEFAULT_APP_SETTINGS };
    return memoryCache;
  }
}

async function writeSettings(next: AppSettings): Promise<void> {
  memoryCache = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyListeners();
}

export async function clearAppSettingsStorage(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  memoryCache = { ...DEFAULT_APP_SETTINGS };
  notifyListeners();
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(memoryCache ?? DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(memoryCache != null);

  useEffect(() => {
    let alive = true;
    void readSettings().then((value) => {
      if (!alive) return;
      setSettings(value);
      setReady(true);
    });
    const onChange = () => {
      void readSettings().then((value) => {
        if (alive) setSettings(value);
      });
    };
    listeners.add(onChange);
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const current = await readSettings();
    const next: AppSettings = { ...current, ...patch };
    if (next.theme !== 'dark') next.theme = 'light';
    await writeSettings(next);
    setSettings(next);
  }, []);

  const setDailyXpGoal = useCallback(
    (dailyXpGoal: number) => update({ dailyXpGoal: Math.min(200, Math.max(10, Math.round(dailyXpGoal))) }),
    [update],
  );

  const resetSettings = useCallback(async () => {
    await clearAppSettingsStorage();
    setSettings({ ...DEFAULT_APP_SETTINGS });
  }, []);

  return {
    settings,
    ready,
    update,
    setDailyXpGoal,
    resetSettings,
  };
}
