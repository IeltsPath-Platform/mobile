import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/src/lib/api-client', () => ({ apiRequest: apiRequestMock }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: vi.fn(async (uri: string) => ({ uri: `${uri}.normalized` })),
  SaveFormat: { JPEG: 'jpeg' },
}));
vi.mock('expo-file-system', () => ({
  File: class {
    constructor(readonly uri: string) {}
    async bytes() { return new Uint8Array([74, 80, 69, 71]); }
  },
}));

import { listActiveDecks, normalizeDeckList, vocabApi, type FlashcardDeck } from '@/src/features/vocab/api';

class FormDataStub {
  readonly fields: unknown[][] = [];
  append(...values: unknown[]) { this.fields.push(values); }
}

beforeEach(() => {
  apiRequestMock.mockReset();
  vi.stubGlobal('FormData', FormDataStub);
});

afterEach(() => vi.unstubAllGlobals());

describe('vocabulary topic catalog API', () => {
  it('keeps loading deck pages past the first 50 records', async () => {
    const first = Array.from({ length: 50 }, (_, index) => ({ id: `deck-${index}` }));
    apiRequestMock.mockResolvedValueOnce({ items: first, page: 0, size: 50, total: 51 })
      .mockResolvedValueOnce({ items: [{ id: 'deck-50' }], page: 1, size: 50, total: 51 });
    const decks = await listActiveDecks();
    expect(decks).toHaveLength(51);
    expect(decks[50].id).toBe('deck-50');
    expect(apiRequestMock.mock.calls[1][0]).toContain('page=1');
  });

  it('stops paging if deletion makes a later page empty', async () => {
    apiRequestMock.mockResolvedValueOnce({ items: [{ id: 'deck-1' }], page: 0, size: 50, total: 80 })
      .mockResolvedValueOnce({ items: [], page: 1, size: 50, total: 80 });
    expect(await listActiveDecks()).toEqual([{ id: 'deck-1' }]);
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });

  it('propagates a later page failure rather than showing a truncated library as complete', async () => {
    apiRequestMock.mockResolvedValueOnce({ items: [{ id: 'deck-1' }], page: 0, size: 50, total: 80 })
      .mockRejectedValueOnce(new Error('Network unavailable'));
    await expect(listActiveDecks()).rejects.toThrow('Network unavailable');
  });

  it('preserves the session and submission IDs when a review request is retried', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('Timeout')).mockResolvedValueOnce({ id: 'card-1' });
    await expect(vocabApi.reviewCard('card-1', false, 'request-1', 'session-1')).rejects.toThrow();
    await vocabApi.reviewCard('card-1', false, 'request-1', 'session-1');
    expect(apiRequestMock.mock.calls[0]).toEqual(apiRequestMock.mock.calls[1]);
    expect(apiRequestMock.mock.calls[1][1].body).toEqual({ correct: false, requestId: 'request-1', sessionId: 'session-1' });
  });

  it('loads the public vocabulary topic list', async () => {
    const signal = new AbortController().signal;
    await vocabApi.listTopics(signal);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/content/vocabulary/topics', { auth: false, signal });
  });

  it('loads public vocabulary words filtered by topic and paginated', async () => {
    const signal = new AbortController().signal;
    await vocabApi.listTopicWords('topic id/1', 2, 30, signal);

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/content/vocabulary?topicId=topic%20id%2F1&page=2&size=30',
      { auth: false, signal },
    );
  });

  it('sends uploaded images through the shared multipart builder', async () => {
    await vocabApi.uploadImage({ uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg' });
    const [path, options] = apiRequestMock.mock.calls[0] as [string, { body: FormDataStub; method: string; auth: boolean }];

    expect(path).toBe('/api/learning-support/flashcards/images');
    expect(options).toMatchObject({ method: 'POST', auth: true });
    expect(options.body).toBeInstanceOf(FormDataStub);
    const [field, part] = options.body.fields[0] as [string, { name: string; type: string; bytes: () => Promise<Uint8Array> }];
    expect(field).toBe('file');
    expect(part.name).toBe('photo.jpg');
    expect(part.type).toBe('image/jpeg');
    expect(await part.bytes()).toEqual(new Uint8Array([74, 80, 69, 71]));
  });

  it('normalizes legacy paged deck cache entries before list consumers reduce or map them', () => {
    const deck = { id: 'deck-1' } as FlashcardDeck;
    expect(normalizeDeckList([deck])).toEqual([deck]);
    expect(normalizeDeckList({ items: [deck], page: 0, size: 50, total: 1 })).toEqual([deck]);
    expect(normalizeDeckList({ items: null })).toEqual([]);
  });
});
