import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refill, freeze, requestId } = vi.hoisted(() => ({ refill: vi.fn(), freeze: vi.fn(), requestId: vi.fn() }));
vi.mock('../src/features/vocab/study-api', () => ({
  studyKeys: { purchase: ['vocabulary-study', 'purchase'], summary: ['vocabulary-study', 'summary'] },
  vocabularyStudyApi: { refill, freeze },
}));
vi.mock('@/src/lib/request-id', () => ({ createRequestId: requestId }));
import { studyKeys } from '../src/features/vocab/study-api';
import { purchaseStudyBenefit, type StudyPurchase } from '../src/features/vocab/study-purchase';
import type { StudySummary } from '../src/features/vocab/study-types';

const summary: StudySummary = {
  xp: { totalXp: 15, level: 1, nextLevelAt: 100, xpToNextLevel: 85 },
  hearts: { hearts: 1, maxHearts: 5, nextHeartAt: null, refillCost: 10 },
  streak: { currentDays: 3, longestDays: 3, lastQualifiedDate: null, qualifiedToday: false, freezeAvailable: false, freezeCost: 20, freezeBlockedReason: null, lostStreakDays: 0, timezone: 'Asia/Ho_Chi_Minh' },
};
const refillResult = { hearts: { ...summary.hearts, hearts: 5 }, pointsSpent: 10, pointsBalanceAfter: 90 };

beforeEach(() => {
  refill.mockReset(); freeze.mockReset(); requestId.mockReset();
  requestId.mockReturnValueOnce('operation-1').mockReturnValueOnce('operation-2');
});

describe('shared vocabulary benefit purchase', () => {
  it('suppresses a second purchase from another panel while one is in flight', async () => {
    const client = new QueryClient();
    client.setQueryData(studyKeys.summary, summary);
    let resolve!: (value: typeof refillResult) => void;
    refill.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const first = purchaseStudyBenefit(client, { kind: 'refill', cost: 10 });
    expect(await purchaseStudyBenefit(client, { kind: 'freeze', cost: 20 })).toBeNull();
    expect(refill).toHaveBeenCalledTimes(1);
    expect(freeze).not.toHaveBeenCalled();
    expect(requestId).toHaveBeenCalledTimes(1);
    resolve(refillResult);
    expect(await first).toEqual({ kind: 'refill', balance: 90 });
    expect(client.getQueryData<StudySummary>(studyKeys.summary)).toEqual({ ...summary, hearts: refillResult.hearts });
    expect(client.getQueryData(studyKeys.purchase)).toBeNull();
    client.clear();
  });

  it('retries an unknown result with the original ID and kind despite a different selection', async () => {
    const client = new QueryClient();
    refill.mockRejectedValueOnce(Object.assign(new Error('Unavailable'), { status: 503 })).mockResolvedValueOnce(refillResult);
    await expect(purchaseStudyBenefit(client, { kind: 'refill', cost: 10 })).rejects.toThrow('Unavailable');
    expect(client.getQueryData<StudyPurchase>(studyKeys.purchase)).toEqual({ kind: 'refill', cost: 10, requestId: 'operation-1', inFlight: false });
    expect(await purchaseStudyBenefit(client, { kind: 'freeze', cost: 20 })).toEqual({ kind: 'refill', balance: 90 });
    expect(refill.mock.calls).toEqual([['operation-1'], ['operation-1']]);
    expect(freeze).not.toHaveBeenCalled();
    expect(requestId).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('clears a definitive rejection so an explicitly requested new purchase gets a new ID', async () => {
    const client = new QueryClient();
    refill.mockRejectedValueOnce(Object.assign(new Error('Insufficient points'), { status: 409 }));
    freeze.mockResolvedValueOnce({ streak: { ...summary.streak, freezeAvailable: true }, pointsSpent: 20, pointsBalanceAfter: 80 });
    await expect(purchaseStudyBenefit(client, { kind: 'refill', cost: 10 })).rejects.toThrow('Insufficient points');
    expect(client.getQueryData(studyKeys.purchase)).toBeNull();
    expect(await purchaseStudyBenefit(client, { kind: 'freeze', cost: 20 })).toEqual({ kind: 'freeze', balance: 80 });
    expect(freeze).toHaveBeenCalledWith('operation-2');
    client.clear();
  });

  it('ignores an old account response after logout clears the cache', async () => {
    const client = new QueryClient();
    client.setQueryData(studyKeys.summary, summary);
    let resolve!: (value: typeof refillResult) => void;
    refill.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const first = purchaseStudyBenefit(client, { kind: 'refill', cost: 10 });
    client.clear();
    const nextAccount = { ...summary, xp: { ...summary.xp, totalXp: 500 }, hearts: { ...summary.hearts, hearts: 2 } };
    client.setQueryData(studyKeys.summary, nextAccount);
    resolve(refillResult);
    expect(await first).toBeNull();
    expect(client.getQueryData(studyKeys.summary)).toEqual(nextAccount);
    expect(client.getQueryData(studyKeys.purchase)).toBeUndefined();
    client.clear();
  });

  it('does not restore an old account pending operation after its failed response', async () => {
    const client = new QueryClient();
    let reject!: (reason: unknown) => void;
    refill.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const first = purchaseStudyBenefit(client, { kind: 'refill', cost: 10 });
    client.clear();
    reject(Object.assign(new Error('Unavailable'), { status: 503 }));
    await expect(first).rejects.toThrow('Unavailable');
    expect(client.getQueryData(studyKeys.purchase)).toBeUndefined();
    client.clear();
  });
});
