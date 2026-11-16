// Mobile counterpart of frontend/src/features/practice/speaking/speakingSession.ts. The web keeps blobs in memory and loses
// them on reload; here every answer is a WAV file in the app's document folder and the list is saved, so closing the app
// keeps the recordings until they are sent or the learner leaves the test.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { useEffect, useSyncExternalStore } from 'react';

/** One finished answer to a question. */
export interface SavedRecording {
  uri: string;
  durationSeconds: number;
  /** The recording carried no sound. */
  silent: boolean;
  /** Bytes of the WAV file. */
  size: number;
}

type Recordings = ReadonlyMap<string, SavedRecording>;
const EMPTY: Recordings = new Map();
const KEY_PREFIX = 'speaking-session:';
const sessions = new Map<string, Recordings>();
const loaded = new Set<string>();
const listeners = new Set<() => void>();

function publish(sessionId: string, next: Recordings) {
  if (next.size === 0) sessions.delete(sessionId); else sessions.set(sessionId, next);
  listeners.forEach((listener) => listener());
  const entries = [...next.entries()];
  void (entries.length ? AsyncStorage.setItem(KEY_PREFIX + sessionId, JSON.stringify(entries)) : AsyncStorage.removeItem(KEY_PREFIX + sessionId)).catch(() => undefined);
}

function deleteFile(uri: string) {
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* already gone */ }
}

/** Reads the saved list of a test once per app run; files that no longer exist are dropped. */
export async function loadSession(sessionId: string) {
  if (loaded.has(sessionId)) return;
  loaded.add(sessionId);
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + sessionId);
    if (!raw) return;
    const entries = (JSON.parse(raw) as Array<[string, SavedRecording]>).filter(([, recording]) => {
      try { return new File(recording.uri).exists; } catch { return false; }
    });
    const merged = new Map([...entries, ...(sessions.get(sessionId) ?? EMPTY)]);
    publish(sessionId, merged);
  } catch { /* start empty */ }
}

export function saveRecording(sessionId: string, questionId: string, recording: SavedRecording) {
  const current = sessions.get(sessionId) ?? EMPTY;
  const previous = current.get(questionId);
  if (previous && previous.uri !== recording.uri) deleteFile(previous.uri);
  publish(sessionId, new Map(current).set(questionId, recording));
}

/** Drops the recordings of a test and their files (after sending, or when the learner leaves the test). */
export function clearSession(sessionId: string) {
  (sessions.get(sessionId) ?? EMPTY).forEach((recording) => deleteFile(recording.uri));
  publish(sessionId, EMPTY);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The recordings of one test (by package version), re-rendering whenever one is added or the test is cleared. */
export function useSessionRecordings(sessionId: string): Recordings {
  useEffect(() => { void loadSession(sessionId); }, [sessionId]);
  return useSyncExternalStore(subscribe, () => sessions.get(sessionId) ?? EMPTY);
}
