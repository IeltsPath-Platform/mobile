import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/src/lib/api-client', () => ({ apiRequest: request }));
import { vocabularyStudyApi as api } from '../src/features/vocab/study-api';
import type { StudyAnswer } from '../src/features/vocab/study-types';

const base = '/api/learning-support/vocabulary-study';
const requestId = '3ac2b074-6996-4be7-9335-45ea94fe0d31';
beforeEach(() => { request.mockReset(); request.mockResolvedValue({}); });

describe('vocabulary study backend contract', () => {
  it('loads public unit content without requiring authentication and supports aborting reads', async () => {
    const signal = new AbortController().signal;
    await api.units('topic/one', signal);
    await api.content('unit/one', signal);
    expect(request.mock.calls).toEqual([
      ['/api/content/vocabulary/topics/topic%2Fone/units', { auth: false, signal }],
      ['/api/content/vocabulary/units/unit%2Fone', { auth: false, signal }],
    ]);
  });

  it('deduplicates topic IDs and batches at the server limit of 100, keeping all returned progress', async () => {
    const ids = Array.from({ length: 205 }, (_, index) => `topic-${index}`);
    const signal = new AbortController().signal;
    request.mockImplementation(async (path: string) => new URL(path, 'https://test.invalid').searchParams.get('topicIds')!.split(',').map((topicId) => ({ topicId })));
    const progress = await api.progress([...ids, '', ids[0]], signal);
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([path]) => new URL(path, 'https://test.invalid').searchParams.get('topicIds')!.split(',').length)).toEqual([100, 100, 5]);
    expect(request.mock.calls.every(([, options]) => options.auth === true && options.signal === signal)).toBe(true);
    expect(progress.map((item) => item.topicId)).toEqual(ids);
  });

  it('does not send an invalid empty progress query', async () => {
    expect(await api.progress([''])).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('starts or replays an authenticated attempt with the caller operation ID', async () => {
    await api.start('unit/one', 'RESUME_OR_START', requestId);
    await api.start('unit/one', 'REPLAY', requestId);
    expect(request.mock.calls).toEqual(['RESUME_OR_START', 'REPLAY'].map((mode) => [`${base}/units/unit%2Fone/attempts`, { method: 'POST', auth: true, body: { requestId, mode } }]));
  });

  it.each<StudyAnswer>([
    { type: 'WORD', acknowledged: true },
    { type: 'CHOICE', optionId: 'option' },
    { type: 'MATCH', pairs: [{ leftOptionId: 'left', rightOptionId: 'right' }] },
    { type: 'FILL_TEXT', text: 'learn' },
  ])('submits the exact server answer shape for $type and preserves identity on retry', async (answer) => {
    await api.answer('attempt/one', 'step/one', answer, requestId);
    await api.answer('attempt/one', 'step/one', answer, requestId);
    const expected = [`${base}/attempts/attempt%2Fone/steps/step%2Fone/answers`, { method: 'POST', auth: true, body: { requestId, answer } }];
    expect(request.mock.calls).toEqual([expected, expected]);
  });

  it('supports resume, completion, account summary, timezone, refill and freeze endpoints', async () => {
    const signal = new AbortController().signal;
    await api.attempt('attempt/one', signal);
    await api.complete('attempt/one', requestId);
    await api.summary(signal);
    await api.settings('Asia/Ho_Chi_Minh');
    await api.refill(requestId);
    await api.freeze(requestId);
    expect(request.mock.calls).toEqual([
      [`${base}/attempts/attempt%2Fone`, { auth: true, signal }],
      [`${base}/attempts/attempt%2Fone/complete`, { method: 'POST', auth: true, body: { requestId } }],
      [`${base}/me/summary`, { auth: true, signal }],
      [`${base}/me/settings`, { method: 'PUT', auth: true, body: { timezone: 'Asia/Ho_Chi_Minh' } }],
      [`${base}/me/hearts/refill`, { method: 'POST', auth: true, body: { requestId } }],
      [`${base}/me/streak/freeze`, { method: 'POST', auth: true, body: { requestId } }],
    ]);
  });

  it('propagates unknown write failures without automatically creating another operation', async () => {
    const failure = Object.assign(new Error('Unavailable'), { status: 503 });
    request.mockRejectedValue(failure);
    await expect(api.complete('attempt', requestId)).rejects.toBe(failure);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
