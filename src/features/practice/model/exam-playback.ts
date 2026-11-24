// Ported from frontend/src/features/practice/listening/examPlayback.ts, stored with AsyncStorage instead of localStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { USER_DATA_KEYS } from '@/src/lib/user-data-keys';

/**
 * The parts of an exam attempt whose recording has already started. The recording plays once, so the list survives
 * closing the app: coming back must not give the learner the part to listen to again.
 */
const KEY_PREFIX = USER_DATA_KEYS.listeningPlayed;

export async function readPlayedSections(attemptId: string): Promise<ReadonlySet<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + attemptId);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function writePlayedSections(attemptId: string, sectionIds: ReadonlySet<string>) {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + attemptId, JSON.stringify([...sectionIds]));
  } catch {
    /* the list lives in memory only */
  }
}
