import Constants from 'expo-constants';
import { Platform } from 'react-native';

function expoLanHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function fallbackBaseUrl() {
  if (Platform.OS === 'web') return 'http://localhost:8080';
  // Expo Go on a phone cannot reach the PC via localhost. Metro's host is that PC.
  const lanHost = expoLanHost();
  if (lanHost) return `http://${lanHost}:8080`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
}

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || fallbackBaseUrl()).replace(/\/+$/, '');

export const REQUEST_TIMEOUT_MS = 15_000;

// Login is required unless this is exactly "false" (local UI work without the gateway).
export const AUTH_ENABLED = process.env.EXPO_PUBLIC_AUTH_ENABLED !== 'false';

/** Learning path: mock by default; set false to use Gateway `/api/learning/**`. */
export const USE_MOCK_LEARNING = process.env.EXPO_PUBLIC_USE_MOCK_LEARNING !== 'false';
