import { apiRequest } from '@/src/lib/api-client';
import type { FreezeResult, RefillResult, StartMode, StepResult, StudyAnswer, StudyAttempt, StudyCompletion, StudySummary, TopicProgress, TopicUnits, UnitContent } from './study-types';

const content = '/api/content/vocabulary';
const base = '/api/learning-support/vocabulary-study';
const id = encodeURIComponent;
export const studyKeys = {
  all: ['vocabulary-study'] as const,
  summary: ['vocabulary-study', 'summary'] as const,
  purchase: ['vocabulary-study', 'purchase'] as const,
  unitLists: ['vocabulary-study', 'units'] as const,
  progress: ['vocabulary-study', 'progress'] as const,
  units: (topicId: string) => ['vocabulary-study', 'units', topicId] as const,
};
export const vocabularyStudyApi = {
  units: (topicId: string, signal?: AbortSignal) => apiRequest<TopicUnits>(`${content}/topics/${id(topicId)}/units`, { auth: false, signal }),
  content: (unitId: string, signal?: AbortSignal) => apiRequest<UnitContent>(`${content}/units/${id(unitId)}`, { auth: false, signal }),
  progress: async (topicIds: string[], signal?: AbortSignal): Promise<TopicProgress[]> => {
    const unique = [...new Set(topicIds.filter(Boolean))];
    const chunks: string[][] = [];
    for (let offset = 0; offset < unique.length; offset += 100) chunks.push(unique.slice(offset, offset + 100));
    return (await Promise.all(chunks.map((chunk) => apiRequest<TopicProgress[]>(`${base}/progress?topicIds=${id(chunk.join(','))}`, { auth: true, signal })))).flat();
  },
  start: (unitId: string, mode: StartMode, requestId: string) => apiRequest<StudyAttempt>(`${base}/units/${id(unitId)}/attempts`, { method: 'POST', body: { requestId, mode }, auth: true }),
  attempt: (attemptId: string, signal?: AbortSignal) => apiRequest<StudyAttempt>(`${base}/attempts/${id(attemptId)}`, { auth: true, signal }),
  answer: (attemptId: string, stepId: string, answer: StudyAnswer, requestId: string) => apiRequest<StepResult>(`${base}/attempts/${id(attemptId)}/steps/${id(stepId)}/answers`, { method: 'POST', body: { requestId, answer }, auth: true }),
  complete: (attemptId: string, requestId: string) => apiRequest<StudyCompletion>(`${base}/attempts/${id(attemptId)}/complete`, { method: 'POST', body: { requestId }, auth: true }),
  summary: (signal?: AbortSignal) => apiRequest<StudySummary>(`${base}/me/summary`, { auth: true, signal }),
  settings: (timezone: string) => apiRequest<{ timezone: string }>(`${base}/me/settings`, { method: 'PUT', body: { timezone }, auth: true }),
  refill: (requestId: string) => apiRequest<RefillResult>(`${base}/me/hearts/refill`, { method: 'POST', body: { requestId }, auth: true }),
  freeze: (requestId: string) => apiRequest<FreezeResult>(`${base}/me/streak/freeze`, { method: 'POST', body: { requestId }, auth: true }),
};
