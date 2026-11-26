import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());
const deleted = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => { store.set(key, value); },
    removeItem: async (key: string) => { store.delete(key); },
    getAllKeys: async () => [...store.keys()],
    multiGet: async (keys: string[]) => keys.map((key) => [key, store.get(key) ?? null]),
    multiRemove: async (keys: string[]) => { keys.forEach((key) => store.delete(key)); },
  },
}));
vi.mock('expo-file-system', () => ({ File: class { exists = true; constructor(public uri: string) {} delete() { deleted.push(this.uri); } } }));

import { adoptSessionOwner, clearUserData, subjectOf } from '@/src/features/auth/clear-user-data';
import { SESSION_OWNER_KEY } from '@/src/lib/user-data-keys';

const token = (sub: string) => `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ sub })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`;

function seedWork() {
  store.set('writing-draft:section:practice', '{"texts":["essay"],"seconds":5}');
  store.set('writing-result:submission', '{}');
  store.set('practice.annotations:attempt', '{}');
  store.set('listening-played:attempt', '["s1"]');
  store.set('speaking-send:package', '{}');
  store.set('grading-keep-waiting:job:now', '1');
  store.set('practice.resume', '{"attemptId":"a"}');
  store.set('speaking-session:package', JSON.stringify([['q1', { uri: 'file:///answer-1.wav', durationSeconds: 5, silent: false, size: 90 }]]));
}
const PREFERENCES = { '@ielts/app-settings/v1': '{"theme":"dark"}', 'practice.reader-prefs': '{}', '@ielts/onboarding/v1': '{}' };

beforeEach(() => { store.clear(); deleted.length = 0; Object.entries(PREFERENCES).forEach(([key, value]) => store.set(key, value)); });

describe('subjectOf', () => {
  it('reads the account id of an access token', () => expect(subjectOf(token('user-1'))).toBe('user-1'));
  it.each(['', 'not-a-token', 'a.b.c', 'a..c'])('returns null for an unreadable token: %j', (value) => expect(subjectOf(value)).toBeNull());
});

describe('clearUserData', () => {
  it("removes the learner's work and recordings but keeps device preferences", async () => {
    seedWork();
    await clearUserData();
    expect([...store.keys()].sort()).toEqual(Object.keys(PREFERENCES).sort());
    expect(deleted).toEqual(['file:///answer-1.wav']);
  });
});

describe('adoptSessionOwner', () => {
  it('keeps the drafts when the same account signs in again', async () => {
    store.set(SESSION_OWNER_KEY, 'user-1');
    seedWork();
    await adoptSessionOwner(token('user-1'));
    expect(store.get('writing-draft:section:practice')).toBeDefined();
    expect(deleted).toEqual([]);
  });

  it('removes the work of the previous account when another one signs in', async () => {
    store.set(SESSION_OWNER_KEY, 'user-1');
    seedWork();
    await adoptSessionOwner(token('user-2'));
    expect([...store.keys()].filter((key) => key.startsWith('writing-draft:'))).toEqual([]);
    expect(store.get(SESSION_OWNER_KEY)).toBe('user-2');
    expect(deleted).toEqual(['file:///answer-1.wav']);
  });

  it('removes work whose owner is unknown', async () => {
    seedWork();
    await adoptSessionOwner(token('user-1'));
    expect(store.has('writing-draft:section:practice')).toBe(false);
    expect(store.get(SESSION_OWNER_KEY)).toBe('user-1');
  });

  it('clears everything and records no owner when the token cannot be read', async () => {
    store.set(SESSION_OWNER_KEY, 'user-1');
    seedWork();
    await adoptSessionOwner('garbage');
    expect(store.has('writing-draft:section:practice')).toBe(false);
    expect(store.has(SESSION_OWNER_KEY)).toBe(false);
  });
});
