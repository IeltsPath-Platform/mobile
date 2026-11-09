import { apiRequest } from '@/src/lib/api-client';
import type { PageResponse } from '@/src/features/vocab/api';

const base = '/api/learning-support/flashcards/notebook';
const query = (values: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined && value !== '');
  return entries.length ? `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')}` : '';
};

export const levels = { UNKNOWN: 'Chưa nhớ', FAMILIAR: 'Đã gặp', LEARNING: 'Đang học', MASTERED: 'Đã thuộc' } as const;
export type UnderstandingLevel = keyof typeof levels;
export type NotebookFilters = {
  q?: string; level?: UnderstandingLevel; due?: boolean;
  sort?: 'RECENT' | 'DUE' | 'ALPHABET' | 'WEAKEST'; topicId?: string; setId?: string;
};
export type NotebookEntry = {
  flashcardId: string; vocabularySenseId: string; vocabularyItemId: string;
  lemma: string; ipa: string | null; pronunciationAudioReference: string | null;
  partOfSpeech: string | null; vietnameseMeaning: string | null; englishDefinition: string | null;
  exampleSentence: string | null; imageUrl: string | null; level: UnderstandingLevel;
  leitnerBox: number; reviewCount: number; lastReviewedAt: string | null; nextReviewAt: string | null;
  createdAt: string; note: string | null; cefrLevel: string | null; topicName: string | null;
};
export type NotebookSummary = {
  total: number; byLevel: Record<UnderstandingLevel, number>; dueNow: number;
  addedLast7Days: number; reviewedToday: number; nextDueAt: string | null;
  learnedCount: number; catalogTotal: number; learningCount: number; masteredCount: number;
};
export type WeeklyGoal = { target: number; progress: number; remaining: number; days: { date: string; weekday: string; achieved: boolean }[] };
export type VocabularyMap = { bands: { band: string; cefr: string; total: number; learned: number; learning: number; needsReview: number; notLearned: number }[]; currentBand: string | null; suggestedBand: string | null };
export type TopicProgress = {
  topics: { topicId: string; name: string; total: number; learned: number; percent: number; status: string }[];
  current: { topicId: string; name: string; lastReviewedAt: string; nextWords: { senseId: string; itemId: string; lemma: string; vietnameseMeaning: string | null }[] } | null;
};
export type SetProgress = { setId: string; total: number; learned: number; learning: number; needsReview: number; notLearned: number; percent: number };
export type RecentResult = { sessionId: string; topic: string | null; correct: number; total: number; percent: number; finishedAt: string };

export const notebookApi = {
  entries: (filters: NotebookFilters, page = 0, signal?: AbortSignal) => apiRequest<PageResponse<NotebookEntry>>(`${base}/entries${query({ ...filters, page, size: 30 })}`, { auth: true, signal }),
  add: (vocabularySenseId: string) => apiRequest<NotebookEntry>(`${base}/entries`, { method: 'POST', body: { vocabularySenseId }, auth: true }),
  saved: async (senseIds: string[], signal?: AbortSignal) => {
    const unique = [...new Set(senseIds)];
    const saved: string[] = [];
    for (let offset = 0; offset < unique.length; offset += 100) {
      saved.push(...await apiRequest<string[]>(`${base}/saved${query({ senseIds: unique.slice(offset, offset + 100).join(',') })}`, { auth: true, signal }));
    }
    return saved;
  },
  setLevel: (flashcardId: string, level: UnderstandingLevel, requestId: string) => apiRequest<void>(`${base}/entries/${encodeURIComponent(flashcardId)}/level`, { method: 'PUT', body: { level, requestId }, auth: true }),
  summary: (timezone: string) => apiRequest<NotebookSummary>(`${base}/summary${query({ timezone })}`, { auth: true }),
  weeklyGoal: (timezone: string) => apiRequest<WeeklyGoal>(`${base}/weekly-goal${query({ timezone })}`, { auth: true }),
  updateWeeklyGoal: (targetWords: number, timezone: string) => apiRequest<WeeklyGoal>(`${base}/weekly-goal${query({ timezone })}`, { method: 'PUT', body: { targetWords }, auth: true }),
  vocabularyMap: (currentCefr?: string) => apiRequest<VocabularyMap>(`${base}/vocabulary-map${query({ currentCefr })}`, { auth: true }),
  topicsProgress: (setId?: string) => apiRequest<TopicProgress>(`${base}/topics-progress${query({ setId })}`, { auth: true }),
  setProgress: (setId: string) => apiRequest<SetProgress>(`${base}/sets/${encodeURIComponent(setId)}/progress`, { auth: true }),
  recentResult: () => apiRequest<RecentResult | null>(`${base}/recent-result`, { auth: true }),
};
