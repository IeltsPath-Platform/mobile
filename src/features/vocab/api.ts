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

type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

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
    return page.content;
  },
};

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
