// Mobile counterpart of frontend/src/features/practice/speaking/speakingSession.ts. The web keeps blobs in memory and loses
// them on reload; here every answer is a WAV file in the app's document folder and the list is saved, so closing the app
// keeps the recordings until they are sent or the learner leaves the test.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { useEffect, useSyncExternalStore } from 'react';

import { USER_DATA_KEYS } from '@/src/lib/user-data-keys';

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
const KEY_PREFIX = USER_DATA_KEYS.speakingSession;
const sessions = new Map<string, Recordings>();
const loaded = new Set<string>();
const loadVersions = new Map<string, number>();
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
  const version = loadVersions.get(sessionId) ?? 0;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + sessionId);
    if (!raw || version !== (loadVersions.get(sessionId) ?? 0)) return;
    const entries = (JSON.parse(raw) as [string, SavedRecording][]).filter(([, recording]) => {
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
  // A storage read already in flight must not bring sent or discarded answers back.
  loaded.add(sessionId);
  loadVersions.set(sessionId, (loadVersions.get(sessionId) ?? 0) + 1);
  (sessions.get(sessionId) ?? EMPTY).forEach((recording) => deleteFile(recording.uri));
  publish(sessionId, EMPTY);
  writePendingSend(sessionId, null);
}

/**
 * Removes every saved answer and its file, in memory and in storage, for the learner who signed out or when another
 * learner signs in. A storage read still in flight cannot bring an answer back afterwards.
 */
export async function resetSpeakingSessions() {
  new Set([...sessions.keys(), ...loaded]).forEach((sessionId) => loadVersions.set(sessionId, (loadVersions.get(sessionId) ?? 0) + 1));
  sessions.forEach((recordings) => recordings.forEach((recording) => deleteFile(recording.uri)));
  sessions.clear();
  loaded.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(KEY_PREFIX));
    for (const [, raw] of await AsyncStorage.multiGet(keys)) {
      try { (JSON.parse(raw ?? '[]') as [string, SavedRecording][]).forEach(([, recording]) => deleteFile(recording.uri)); } catch { /* unreadable list */ }
    }
  } catch { /* storage unavailable: the keys are removed by the caller */ }
  listeners.forEach((listener) => listener());
}

const SEND_PREFIX = USER_DATA_KEYS.speakingSend;

/**
 * A send that has not finished: its request id and the file uploaded for each question under it. Kept on the device so
 * that sending again after the app was closed continues the same submission; a new id would be refused while the
 * unfinished one is still open on the server.
 */
export type PendingSend = { requestId: string; sent: Map<string, string> };

export async function readPendingSend(sessionId: string): Promise<PendingSend | null> {
  try {
    const raw = await AsyncStorage.getItem(SEND_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { requestId?: unknown; sent?: unknown };
    if (typeof parsed.requestId !== 'string' || !Array.isArray(parsed.sent)) return null;
    const pairs = parsed.sent.filter((pair): pair is [string, string] => Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string');
    return { requestId: parsed.requestId, sent: new Map(pairs) };
  } catch {
    return null;
  }
}

export function writePendingSend(sessionId: string, pending: PendingSend | null) {
  const write = pending
    ? AsyncStorage.setItem(SEND_PREFIX + sessionId, JSON.stringify({ requestId: pending.requestId, sent: [...pending.sent] }))
    : AsyncStorage.removeItem(SEND_PREFIX + sessionId);
  void write.catch(() => undefined);
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
