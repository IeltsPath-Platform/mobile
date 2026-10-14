import { apiRequest } from '@/src/lib/api-client';

export type VocabularySense = {
  id: string;
  vocabularyItemId: string;
  partOfSpeech: string | null;
  englishDefinition: string | null;
  vietnameseMeaning: string | null;
  exampleSentence: string | null;
  imageUrl: string | null;
  sortOrder: number;
  status: string;
};

export type VocabularyItem = {
  id: string;
  lemma: string;
  normalizedLemma: string;
  ipa: string | null;
  pronunciationAudioReference: string | null;
  status: string;
  senses: VocabularySense[];
};

export type FlashcardDeck = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/** Library page payload. BE record is `items`; `content` kept if a proxy still sends it. */
type PageResponse<T> = {
  items?: T[];
  content?: T[];
  page: number;
  size: number;
  total?: number;
  totalElements?: number;
  totalPages?: number;
};

export type DeckItem = {
  deckId: string;
  flashcardId: string;
  sortOrder: number;
  addedAt: string;
  front: string;
  back: string;
  sourceType: string;
  status: string;
};

function pageItems<T>(page: PageResponse<T>): T[] {
  return page.items ?? page.content ?? [];
}

export const vocabApi = {
  search: (query: string) =>
    apiRequest<VocabularyItem[]>(
      `/api/content/vocabulary/search?query=${encodeURIComponent(query)}`,
      { auth: true },
    ),

  listDecks: async () => {
    const page = await apiRequest<PageResponse<FlashcardDeck>>(
      '/api/learning-support/decks?page=0&size=20',
      { auth: true },
    );
    return pageItems(page);
  },

  listDeckItems: async (deckId: string) => {
    const page = await apiRequest<PageResponse<DeckItem>>(
      `/api/learning-support/decks/${deckId}/items?page=0&size=50`,
      { auth: true },
    );
    return pageItems(page);
  },
};

/** Local decks when signed out or the decks API fails. */
export const MOCK_DECKS: FlashcardDeck[] = [
  {
    id: 'mock-deck-academic',
    userId: 'local',
    name: 'Academic basics',
    description: '8 từ học thuật hay gặp trong Reading',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mock-deck-tfng',
    userId: 'local',
    name: 'True / False / NG',
    description: 'Cụm từ giúp nhận ra thông tin không được nêu',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

/** Local fallback when BE empty / offline */
export const MOCK_VOCAB: VocabularyItem[] = [
  {
    id: 'mock-1',
    lemma: 'achieve',
    normalizedLemma: 'achieve',
    ipa: '/əˈtʃiːv/',
    pronunciationAudioReference: null,
    status: 'PUBLISHED',
    senses: [
      {
        id: 'mock-s1',
        vocabularyItemId: 'mock-1',
        partOfSpeech: 'VERB',
        englishDefinition: 'to succeed in doing something',
        vietnameseMeaning: 'đạt được, hoàn thành',
        exampleSentence: 'She achieved a band 7.0 in IELTS.',
        imageUrl: null,
        sortOrder: 0,
        status: 'PUBLISHED',
      },
    ],
  },
  {
    id: 'mock-2',
    lemma: 'coherent',
    normalizedLemma: 'coherent',
    ipa: '/kəʊˈhɪərənt/',
    pronunciationAudioReference: null,
    status: 'PUBLISHED',
    senses: [
      {
        id: 'mock-s2',
        vocabularyItemId: 'mock-2',
        partOfSpeech: 'ADJECTIVE',
        englishDefinition: 'logical and consistent',
        vietnameseMeaning: 'mạch lạc, nhất quán',
        exampleSentence: 'Write a coherent essay with clear paragraphs.',
        imageUrl: null,
        sortOrder: 0,
        status: 'PUBLISHED',
      },
    ],
  },
];
