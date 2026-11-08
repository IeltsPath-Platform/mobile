import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { communityApi } from './api';

const INSTALLATION_ID_KEY = 'ieltspath.notificationInstallationId';
const ANDROID_CHANNEL_ID = 'default';
const registrationsInFlight = new Map<string, Promise<boolean>>();

function createInstallationId() {
  // This ID is a device binding key, not a credential. Keep it stable across account changes.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function getInstallationId() {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const installationId = createInstallationId();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return installationId;
}

async function ensureNotificationPermission() {
  if (Platform.OS !== 'android') return false;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Thông báo IELTSPath',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  return permission.granted;
}

export async function registerCurrentInstallation(token?: string) {
  if (Platform.OS !== 'android') return false;
  // Remote push is unavailable in Expo Go on Android; prompt only in a native app build.
  if (Constants.appOwnership === 'expo') return false;
  if (!token && !(await ensureNotificationPermission())) return false;

  const nativeToken = token ?? (await Notifications.getDevicePushTokenAsync()).data;
  if (!nativeToken) return false;

  const existingRegistration = registrationsInFlight.get(nativeToken);
  if (existingRegistration) return existingRegistration;

  const registration = (async () => {
    const installationId = await getInstallationId();
    await communityApi.registerNotificationDevice(installationId, {
      provider: 'FCM',
      platform: 'ANDROID',
      token: nativeToken,
      appVersion: Constants.expoConfig?.version ?? 'unknown',
    });
    return true;
  })();
  registrationsInFlight.set(nativeToken, registration);
  try {
    return await registration;
  } finally {
    registrationsInFlight.delete(nativeToken);
  }
}

export async function unregisterCurrentInstallation() {
  if (Platform.OS !== 'android') return;
  const installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (installationId) await communityApi.unregisterNotificationDevice(installationId);
}

export function getNotificationRoute(data: Record<string, unknown> | undefined) {
  const postId = typeof data?.postId === 'string' ? data.postId : undefined;
  if (postId) {
    const commentId = typeof data?.commentId === 'string' ? data.commentId : '';
    return { pathname: '/community/[postId]' as const, params: { postId, commentId } };
  }
  const actorId = typeof data?.actorId === 'string' ? data.actorId : undefined;
  if (data?.eventType === 'community.user-followed.v1' && actorId) {
    return { pathname: '/community/users/[userId]' as const, params: { userId: actorId } };
  }
  return '/community/notifications' as const;
}
