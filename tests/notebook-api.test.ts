import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/src/lib/api-client', () => ({ apiRequest: request }));
import { notebookApi } from '@/src/features/flashcards/notebook-api';

beforeEach(() => { request.mockReset(); });

describe('notebook contract boundaries', () => {
  it('deduplicates and batches saved senses within the backend limit of 100', async () => {
    request.mockImplementation(async (path: string) => new URL(`https://local${path}`).searchParams.get('senseIds')!.split(','));
    const ids = Array.from({ length: 201 }, (_, index) => `sense-${index}`);
    expect(await notebookApi.saved([...ids, ids[0]])).toEqual(ids);
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([path]) => new URL(`https://local${path}`).searchParams.get('senseIds')!.split(',').length)).toEqual([100, 100, 1]);
  });

  it('does not query saved senses when there are no search results', async () => {
    expect(await notebookApi.saved([])).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('preserves search text, scope, filtering and page without exceeding notebook page size', async () => {
    await notebookApi.entries({ q: 'school & college', level: 'LEARNING', topicId: 'topic-1', setId: 'set-1', due: true, sort: 'WEAKEST' }, 2);
    const url = new URL(`https://local${request.mock.calls[0][0]}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'school & college', level: 'LEARNING', topicId: 'topic-1', setId: 'set-1', due: 'true', sort: 'WEAKEST', page: '2', size: '30' });
    expect(request.mock.calls[0][1].auth).toBe(true);
  });

  it('keeps an empty recent result as null instead of inventing a completed session', async () => {
    request.mockResolvedValue(null);
    expect(await notebookApi.recentResult()).toBeNull();
  });

  it('sends the account timezone and targetWords when changing the weekly goal', async () => {
    await notebookApi.updateWeeklyGoal(150, 'Asia/Ho_Chi_Minh');
    const [path, options] = request.mock.calls[0];
    expect(new URL(`https://local${path}`).searchParams.get('timezone')).toBe('Asia/Ho_Chi_Minh');
    expect(options).toMatchObject({ method: 'PUT', auth: true, body: { targetWords: 150 } });
  });
});
