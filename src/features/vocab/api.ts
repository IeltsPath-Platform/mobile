import { apiRequest } from '@/src/lib/api-client';

export type VocabularySense = {
  id: string; vocabularyItemId: string; partOfSpeech: string | null; englishDefinition: string | null;
  vietnameseMeaning: string | null; exampleSentence: string | null; imageUrl: string | null; sortOrder: number; status: string;
};
export type VocabularyItem = {
  id: string; lemma: string; normalizedLemma: string; ipa: string | null; pronunciationAudioReference: string | null;
  status: string; senses: VocabularySense[];
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
const params = (values: Record<string, string | number | undefined>) => {
  const query = Object.entries(values).filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
  return query ? `?${query}` : '';
};

export const vocabApi = {
  search: (query: string, signal?: AbortSignal) => apiRequest<VocabularyItem[]>(`/api/content/vocabulary/search${params({ query })}`, { auth: true, signal }),
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
  uploadImage: (file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    return apiRequest<UploadedFlashcardImage>(`${cardsPath}/images`, { method: 'POST', body: form, auth: true });
  },
};

export async function listAllDeckItems(deckId: string, signal?: AbortSignal): Promise<DeckItem[]> {
  const result: DeckItem[] = [];
  for (let page = 0; ; page++) {
    const response = await apiRequest<PageResponse<DeckItem>>(`${decksPath}/${encodeURIComponent(deckId)}/items${params({ page, size: 100 })}`, { auth: true, signal });
    result.push(...response.items);
    if (!response.items.length || result.length >= response.total) return result;
  }
}
