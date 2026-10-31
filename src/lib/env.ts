import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveApiUrl } from './api-url';

const apiLocation = resolveApiUrl({
  explicit: process.env.EXPO_PUBLIC_API_BASE_URL,
  port: process.env.EXPO_PUBLIC_API_PORT,
  device: process.env.EXPO_PUBLIC_DEVICE,
  platform: Platform.OS,
  metroHost: Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost,
  webHost: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : undefined,
});
export const API_BASE_URL = apiLocation.url;
export const API_CONFIGURATION_ERROR = apiLocation.error;

export const REQUEST_TIMEOUT_MS = 15_000;

// Login is required unless this is exactly "false" (local UI work without the gateway).
export const AUTH_ENABLED = process.env.EXPO_PUBLIC_AUTH_ENABLED !== 'false';
