import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/src/lib/api-client', () => ({ apiRequest: apiRequestMock }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { normalizeDeckList, vocabApi, type FlashcardDeck } from '@/src/features/vocab/api';

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
    expect(options.body.fields).toEqual([['file', { uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg' }]]);
  });

  it('normalizes legacy paged deck cache entries before list consumers reduce or map them', () => {
    const deck = { id: 'deck-1' } as FlashcardDeck;
    expect(normalizeDeckList([deck])).toEqual([deck]);
    expect(normalizeDeckList({ items: [deck], page: 0, size: 50, total: 1 })).toEqual([deck]);
    expect(normalizeDeckList({ items: null })).toEqual([]);
  });
});
