import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SkillType } from './types';

/** The last Reading or Listening attempt opened on this device, so the hub can offer to continue it. */
export type ResumeEntry = { attemptId: string; skill: Extract<SkillType, 'reading' | 'listening'>; title: string; savedAt: number };

const KEY = 'practice.resume';

export async function rememberAttempt(entry: Omit<ResumeEntry, 'savedAt'>) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ ...entry, savedAt: Date.now() })); } catch { /* best effort */ }
}

export async function readResume(): Promise<ResumeEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ResumeEntry>;
    if (typeof value.attemptId !== 'string' || (value.skill !== 'reading' && value.skill !== 'listening')) return null;
    return { attemptId: value.attemptId, skill: value.skill, title: typeof value.title === 'string' ? value.title : '', savedAt: Number(value.savedAt) || 0 };
  } catch {
    return null;
  }
}

export async function forgetAttempt(attemptId: string) {
  try {
    const current = await readResume();
    if (current?.attemptId === attemptId) await AsyncStorage.removeItem(KEY);
  } catch { /* best effort */ }
}
