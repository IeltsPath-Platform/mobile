import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SrsState } from './types';

const KEY = 'ieltspath.flashcardSrs.v1';

export async function loadSrs(): Promise<Record<string, SrsState>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, SrsState>;
  } catch {
    return {};
  }
}

let chain: Promise<void> = Promise.resolve();

export async function saveSrs(states: Record<string, SrsState>): Promise<void> {
  const snapshot = JSON.stringify(states);
  chain = chain.then(() => AsyncStorage.setItem(KEY, snapshot)).then(() => undefined);
  return chain;
}
