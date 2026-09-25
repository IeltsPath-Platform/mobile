import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = 'ieltspath.accessToken';
const REFRESH_KEY = 'ieltspath.refreshToken';

// SecureStore is native-only; the web build falls back to localStorage, which is not encrypted.
const storage = {
  async get(key: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

let cached: SessionTokens | null | undefined;

export const tokenStorage = {
  async load(): Promise<SessionTokens | null> {
    if (cached !== undefined) return cached;
    const [accessToken, refreshToken] = await Promise.all([storage.get(ACCESS_KEY), storage.get(REFRESH_KEY)]);
    cached = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    return cached;
  },

  async save(tokens: SessionTokens) {
    cached = tokens;
    await Promise.all([storage.set(ACCESS_KEY, tokens.accessToken), storage.set(REFRESH_KEY, tokens.refreshToken)]);
  },

  async clear() {
    cached = null;
    await Promise.all([storage.remove(ACCESS_KEY), storage.remove(REFRESH_KEY)]);
  },
};
