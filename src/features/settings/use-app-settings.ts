import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type FontSizeOption = 'S' | 'M' | 'L';
export type ThemeOption = 'light' | 'dark' | 'system';

export type AppSettings = {
  dailyXpGoal: number;
  fontSize: FontSizeOption;
  theme: ThemeOption;
  /** Answer chimes, tap sounds and word pronunciation. */
  soundEnabled: boolean;
  /** Calm background loop while studying. */
  musicEnabled: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  dailyXpGoal: 50,
  fontSize: 'M',
  theme: 'system',
  soundEnabled: true,
  musicEnabled: true,
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
    // Pick known keys only so fields removed in later versions (e.g. old reminder toggles) are dropped.
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    memoryCache = {
      dailyXpGoal: typeof parsed.dailyXpGoal === 'number' ? parsed.dailyXpGoal : DEFAULT_APP_SETTINGS.dailyXpGoal,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_APP_SETTINGS.soundEnabled,
      musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_APP_SETTINGS.musicEnabled,
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : 'system',
      fontSize: parsed.fontSize === 'S' || parsed.fontSize === 'L' ? parsed.fontSize : 'M',
    };
    return memoryCache;
  } catch {
    memoryCache = { ...DEFAULT_APP_SETTINGS };
    return memoryCache;
  }
}

async function writeSettings(next: AppSettings): Promise<void> {
  memoryCache = next;
  notifyListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // Keep the in-memory value so the UI stays consistent for this session.
    console.warn('Không lưu được cài đặt ứng dụng', error);
  }
}

/** Non-React access (audio helpers) to the latest persisted settings. */
export function getAppSettings(): Promise<AppSettings> {
  return readSettings();
}

export function subscribeAppSettings(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
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
    if (next.theme !== 'dark' && next.theme !== 'light') next.theme = 'system';
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
