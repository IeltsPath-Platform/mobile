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

// The pair is stored as one value so a crash mid-write can never leave half a session behind.
const SESSION_KEY = 'ieltspath.session';

let cached: SessionTokens | null | undefined;

function isPair(value: unknown): value is SessionTokens {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SessionTokens).accessToken === 'string' &&
    typeof (value as SessionTokens).refreshToken === 'string'
  );
}

export const tokenStorage = {
  /** A storage failure is treated as "no session" and is not cached, so the next call retries. */
  async load(): Promise<SessionTokens | null> {
    if (cached !== undefined) return cached;
    try {
      const raw = await storage.get(SESSION_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        cached = isPair(parsed) ? parsed : null;
        return cached;
      }
      // Sessions saved by earlier builds used two separate keys.
      const [accessToken, refreshToken] = await Promise.all([storage.get(ACCESS_KEY), storage.get(REFRESH_KEY)]);
      cached = accessToken && refreshToken ? { accessToken, refreshToken } : null;
      return cached;
    } catch {
      return null;
    }
  },

  /** The in-memory session is kept even if persisting fails, so the current run stays signed in. */
  async save(tokens: SessionTokens) {
    cached = tokens;
    try {
      await storage.set(SESSION_KEY, JSON.stringify(tokens));
      await Promise.all([storage.remove(ACCESS_KEY), storage.remove(REFRESH_KEY)]).catch(() => undefined);
    } catch (error) {
      if (__DEV__) console.warn('Could not persist the session; it will be lost on restart.', error);
    }
  },

  async clear() {
    cached = null;
    await Promise.all([storage.remove(SESSION_KEY), storage.remove(ACCESS_KEY), storage.remove(REFRESH_KEY)]).catch(() => undefined);
  },
};
