import { Platform } from 'react-native';

// Android emulators reach the host machine through 10.0.2.2, not localhost.
const fallbackBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || fallbackBaseUrl).replace(/\/+$/, '');

export const REQUEST_TIMEOUT_MS = 15_000;

// Flip to true when gateway + user DB are up. While false, tabs open without login.
export const AUTH_ENABLED = process.env.EXPO_PUBLIC_AUTH_ENABLED === 'true';
