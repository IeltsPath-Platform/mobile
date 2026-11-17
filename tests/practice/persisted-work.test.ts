import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(async (_key: string, _value: string) => {}), removeItem: vi.fn(async (_key: string) => {}) }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
vi.mock('expo-file-system', () => ({ File: class { exists = true; delete() {} } }));

import { clearSession, loadSession, saveRecording } from '@/src/features/practice/model/speaking-session';
import { loadDraft } from '@/src/features/practice/model/writing-text';

beforeEach(() => { storage.getItem.mockReset(); storage.setItem.mockClear(); storage.removeItem.mockClear(); });

describe('persisted practice work', () => {
  it('does not resurrect a cleared Speaking answer when its storage read finishes late', async () => {
    let finish!: (value: string) => void;
    storage.getItem.mockReturnValueOnce(new Promise<string>((resolve) => { finish = resolve; }));
    const loading = loadSession('cleared-during-load');
    clearSession('cleared-during-load');
    finish(JSON.stringify([['old-question', { uri: 'file:///old.wav', durationSeconds: 5, silent: false, size: 200 }]]));
    await loading;
    saveRecording('cleared-during-load', 'new-question', { uri: 'file:///new.wav', durationSeconds: 2, silent: false, size: 80 });
    const saved = JSON.parse(storage.setItem.mock.calls.at(-1)![1] as string);
    expect(saved.map(([id]: [string]) => id)).toEqual(['new-question']);
  });

  it.each([{}, { texts: 'essay', seconds: 5 }, { texts: [null], seconds: 5 }, { texts: ['essay'], seconds: -1 }, { texts: ['essay'], seconds: '5' }])('ignores invalid stored Writing drafts: %j', async (draft) => {
    storage.getItem.mockResolvedValueOnce(JSON.stringify(draft));
    expect(await loadDraft('invalid')).toBeNull();
  });

  it('restores the essay and elapsed time of a valid Writing draft', async () => {
    const draft = { texts: ['Introduction', '', 'Body'], seconds: 97 };
    storage.getItem.mockResolvedValueOnce(JSON.stringify(draft));
    expect(await loadDraft('valid')).toEqual(draft);
  });
});
