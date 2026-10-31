import { apiRequest } from '@/src/lib/api-client';
import { imageUploadForm } from '@/src/lib/image-upload-form';

export type VocabularySense = {
  id: string; vocabularyItemId: string; partOfSpeech: string | null; englishDefinition: string | null;
  vietnameseMeaning: string | null; exampleSentence: string | null; imageUrl: string | null; sortOrder: number; status: string;
};
export type VocabularyItem = {
  id: string; lemma: string; normalizedLemma: string; ipa: string | null; pronunciationAudioReference: string | null;
  status: string; senses: VocabularySense[];
};
export type VocabularyTopic = {
  id: string; slug: string; name: string; nameVi: string; coverKey: string | null; coverUrl: string | null;
  sortOrder: number; wordCount: number;
};
export type VocabularySet = {
  id: string; title: string; description: string | null; kind: 'BAND' | 'TOPIC'; cefrLevel: string | null;
  topicId: string | null; topicName: string | null; topicNameVi: string | null; coverKey: string | null;
  coverUrl: string | null; sortOrder: number; status: LibraryStatus; topicCount: number | null; wordCount: number | null;
};
export type VocabularyAchievement = { code: string; achieved: boolean; progress: number; target: number };
export type VocabularyCatalogWord = {
  id: string; lemma: string; ipa: string | null; pronunciationAudioReference: string | null;
  senses: Array<Pick<VocabularySense, 'id' | 'partOfSpeech' | 'englishDefinition' | 'vietnameseMeaning' | 'exampleSentence'>>;
};
export type LibraryStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type FlashcardSourceType = 'MANUAL' | 'VOCABULARY_SENSE' | 'HIGHLIGHT' | 'PRACTICE_QUESTION';
export type FlashcardDeck = {
  id: string; userId: string; name: string; description: string | null; status: LibraryStatus; createdAt: string; updatedAt: string;
  coverImageKey?: string | null; coverImageUrl?: string | null; cardCount: number; dueCount: number;
};
export type Flashcard = {
  id: string; userId: string; sourceType: FlashcardSourceType; vocabularySenseId: string | null;
  sourceReferenceId: string | null; highlightedText: string | null; front: string; back: string; status: LibraryStatus;
  createdAt: string; updatedAt: string; leitnerBox: number; nextReviewAt: string | null; lastReviewedAt: string | null;
  reviewCount: number; ipa: string | null; pronunciationAudioReference: string | null; exampleSentence: string | null;
  imageKey?: string | null; imageUrl?: string | null;
};
export type FlashcardDraft = {
  sourceType: FlashcardSourceType; vocabularySenseId?: string | null; sourceReferenceId?: string | null;
  highlightedText?: string | null; front: string; back: string; imageKey?: string | null; exampleSentence?: string | null;
};
export type DeckDraft = { name: string; description: string | null; coverImageKey?: string | null };
export type FlashcardContentDraft = { front: string; back: string; imageKey?: string | null; exampleSentence?: string | null };
export type UploadedFlashcardImage = { key: string; url: string; contentType: string; size: number };
export type PageResponse<T> = { items: T[]; page: number; size: number; total: number; totalPages?: number };
export type DeckItem = {
  deckId: string; flashcardId: string; sortOrder: number | null; addedAt: string; front: string; back: string;
  sourceType: FlashcardSourceType; status: LibraryStatus; imageUrl?: string | null; exampleSentence?: string | null;
  ipa?: string | null; leitnerBox?: number;
};

const cardsPath = '/api/learning-support/flashcards';
const decksPath = '/api/learning-support/decks';
const contentVocabularyPath = '/api/content/vocabulary';
const params = (values: Record<string, string | number | undefined>) => {
  const query = Object.entries(values).filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
  return query ? `?${query}` : '';
};

export const vocabApi = {
  search: (query: string, signal?: AbortSignal) => apiRequest<VocabularyItem[]>(`/api/content/vocabulary/search${params({ query })}`, { auth: true, signal }),
  listTopics: (signal?: AbortSignal) => apiRequest<VocabularyTopic[]>(`${contentVocabularyPath}/topics`, { auth: false, signal }),
  achievements: (timezone = 'Asia/Ho_Chi_Minh') => apiRequest<{ items: VocabularyAchievement[] }>(`/api/learning-support/flashcards/notebook/achievements${params({ timezone })}`, { auth: true }),
  listTopicWords: (topicId: string, page = 0, size = 30, signal?: AbortSignal) =>
    apiRequest<PageResponse<VocabularyCatalogWord>>(`${contentVocabularyPath}${params({ topicId, page, size })}`, { auth: false, signal }),
  listSets: (kind: 'BAND' | 'TOPIC' | undefined = 'TOPIC', page = 0, size = 50, signal?: AbortSignal) =>
    apiRequest<PageResponse<VocabularySet>>(`${contentVocabularyPath}/sets${params({ kind, page, size })}`, { auth: false, signal }),
  listSetWords: (setId: string, page = 0, size = 30, signal?: AbortSignal) =>
    apiRequest<PageResponse<VocabularyItem>>(`${contentVocabularyPath}/sets/${encodeURIComponent(setId)}/words${params({ page, size })}`, { auth: false, signal }),
  listDecks: (page = 0, size = 50, status: LibraryStatus = 'ACTIVE') => apiRequest<PageResponse<FlashcardDeck>>(`${decksPath}${params({ page, size, status })}`, { auth: true }),
  getDeck: (deckId: string) => apiRequest<FlashcardDeck>(`${decksPath}/${encodeURIComponent(deckId)}`, { auth: true }),
  createDeck: (draft: DeckDraft) => apiRequest<FlashcardDeck>(decksPath, { method: 'POST', body: draft, auth: true }),
  updateDeck: (deckId: string, draft: DeckDraft, status: LibraryStatus = 'ACTIVE') => apiRequest<FlashcardDeck>(`${decksPath}/${encodeURIComponent(deckId)}`, { method: 'PUT', body: { ...draft, status }, auth: true }),
  deleteDeck: (deckId: string) => apiRequest<void>(`${decksPath}/${encodeURIComponent(deckId)}`, { method: 'DELETE', auth: true }),
  listDeckItems: (deckId: string, page = 0, size = 50) => apiRequest<PageResponse<DeckItem>>(`${decksPath}/${encodeURIComponent(deckId)}/items${params({ page, size })}`, { auth: true }),
  addDeckItem: (deckId: string, flashcardId: string, sortOrder?: number) => apiRequest<void>(`${decksPath}/${encodeURIComponent(deckId)}/items`, { method: 'POST', body: { flashcardId, sortOrder }, auth: true }),
  removeDeckItem: (deckId: string, flashcardId: string) => apiRequest<void>(`${decksPath}/${encodeURIComponent(deckId)}/items/${encodeURIComponent(flashcardId)}`, { method: 'DELETE', auth: true }),
  listCards: (page = 0, size = 50, status: LibraryStatus = 'ACTIVE') => apiRequest<PageResponse<Flashcard>>(`${cardsPath}${params({ page, size, status })}`, { auth: true }),
  dueCards: (deckId?: string, page = 0, limit = 20) => apiRequest<PageResponse<Flashcard>>(`${cardsPath}/due${params({ deckId, page, limit })}`, { auth: true }),
  getCard: (cardId: string) => apiRequest<Flashcard>(`${cardsPath}/${encodeURIComponent(cardId)}`, { auth: true }),
  createCard: (draft: FlashcardDraft) => apiRequest<Flashcard>(cardsPath, { method: 'POST', body: draft, auth: true }),
  updateCard: (card: Pick<Flashcard, 'id' | 'sourceType' | 'vocabularySenseId' | 'sourceReferenceId' | 'highlightedText'>, draft: FlashcardContentDraft, status: LibraryStatus = 'ACTIVE') => apiRequest<Flashcard>(`${cardsPath}/${encodeURIComponent(card.id)}`, { method: 'PUT', body: { sourceType: card.sourceType, vocabularySenseId: card.vocabularySenseId, sourceReferenceId: card.sourceReferenceId, highlightedText: card.highlightedText, status, ...draft }, auth: true }),
  deleteCard: (cardId: string) => apiRequest<void>(`${cardsPath}/${encodeURIComponent(cardId)}`, { method: 'DELETE', auth: true }),
  reviewCard: (cardId: string, correct: boolean, requestId: string) => apiRequest<Flashcard>(`${cardsPath}/${encodeURIComponent(cardId)}/reviews`, { method: 'POST', body: { correct, requestId }, auth: true }),
  uploadImage: async (file: { uri: string; name: string; type: string }) => {
    const form = await imageUploadForm(file);
    return apiRequest<UploadedFlashcardImage>(`${cardsPath}/images`, { method: 'POST', body: form, auth: true });
  },
};

/** Normalize deck-list cache values shared between screens (legacy cache may hold the paged response). */
export function normalizeDeckList(value: unknown): FlashcardDeck[] {
  if (Array.isArray(value)) return value as FlashcardDeck[];
  if (value && typeof value === 'object' && 'items' in value && Array.isArray(value.items)) {
    return value.items as FlashcardDeck[];
  }
  return [];
}

export async function listActiveDecks(): Promise<FlashcardDeck[]> {
  return normalizeDeckList(await vocabApi.listDecks(0, 50));
}

export async function listAllDeckItems(deckId: string, signal?: AbortSignal): Promise<DeckItem[]> {
  const result: DeckItem[] = [];
  for (let page = 0; ; page++) {
    const response = await apiRequest<PageResponse<DeckItem>>(`${decksPath}/${encodeURIComponent(deckId)}/items${params({ page, size: 100 })}`, { auth: true, signal });
    result.push(...response.items);
    if (!response.items.length || result.length >= response.total) return result;
  }
}
