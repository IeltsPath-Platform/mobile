import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetSpeakingSessions } from '@/src/features/practice/model/speaking-session';
import { SESSION_OWNER_KEY, USER_DATA_KEY_PREFIXES } from '@/src/lib/user-data-keys';

/** The account id (`sub` claim) of an access token, or null when the token cannot be read. */
export function subjectOf(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims = JSON.parse(atob(base64)) as { sub?: unknown };
    return typeof claims.sub === 'string' && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

/**
 * Removes one learner's work from this device: writing drafts and results, listening progress, marks, resume point,
 * Speaking recordings (and their files) and the owner marker. Device preferences stay. Best effort: a failure here must
 * never keep the learner signed in.
 */
export async function clearUserData() {
  await resetSpeakingSessions().catch(() => undefined);
  try {
    const keys = await AsyncStorage.getAllKeys();
    const owned = keys.filter((key) => key === SESSION_OWNER_KEY || USER_DATA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)));
    if (owned.length) await AsyncStorage.multiRemove(owned);
  } catch {
    /* storage unavailable: nothing was persisted either */
  }
}

/**
 * Called when a session starts. Work stored by a different account, or by an unknown one, is removed so the new learner
 * never sees or sends it; the same account signing in again after a timeout keeps its drafts.
 */
export async function adoptSessionOwner(accessToken: string) {
  const owner = subjectOf(accessToken);
  const previous = await AsyncStorage.getItem(SESSION_OWNER_KEY).catch(() => null);
  if (!owner || previous !== owner) await clearUserData();
  if (owner) await AsyncStorage.setItem(SESSION_OWNER_KEY, owner).catch(() => undefined);
}
