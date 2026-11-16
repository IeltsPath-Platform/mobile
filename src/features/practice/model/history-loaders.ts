// Ported from frontend/src/features/practice/history/historyLoaders.ts.
import { apiRequest } from '@/src/lib/api-client';

import { getPracticeHistory, searchReadingTests } from '../api/attempts';
import { HISTORY_PAGE_SIZE, listSubmissionHistory, type SubmissionHistoryItem } from '../api/history';
import { historyTitleMap, historyTitleRequests } from './history-titles';
import { courseRow, freeRow, knowledgeRow, practiceRow, type HistoryNames, type HistoryRow } from './history-view';

export interface HistoryPage { rows: HistoryRow[]; hasNext: boolean }

/** The names of the topics and courses a page mentions; a name that cannot be read is left out. */
async function resolveNames(items: readonly SubmissionHistoryItem[]): Promise<HistoryNames> {
  const [topics, courses] = await Promise.all([
    items.some((item) => item.topicId) ? apiRequest<Array<{ topicId: string; name: string }>>('/api/learning/topics', { auth: true }).catch(() => []) : Promise.resolve([]),
    items.some((item) => item.courseId) ? apiRequest<Array<{ courseId: string; name: string }>>('/api/learning/courses', { auth: true }).catch(() => []) : Promise.resolve([]),
  ]);
  return {
    topics: new Map(topics.map((topic) => [topic.topicId, topic.name] as const)),
    courses: new Map(courses.map((course) => [course.courseId, course.name] as const)),
  };
}

export async function loadCourseHistory(page: number): Promise<HistoryPage> {
  const result = await listSubmissionHistory('COURSE', null, page);
  const names = await resolveNames(result.items);
  return { rows: result.items.map((item) => courseRow(item, names)), hasNext: result.hasNext };
}

export async function loadFreeHistory(skill: 'WRITING' | 'SPEAKING', page: number): Promise<HistoryPage> {
  const result = await listSubmissionHistory('FREE', skill, page);
  return { rows: result.items.map(freeRow), hasNext: result.hasNext };
}

export async function loadKnowledgeHistory(page: number): Promise<HistoryPage> {
  const result = await listSubmissionHistory('KNOWLEDGE', null, page);
  return { rows: result.items.map(knowledgeRow), hasNext: result.hasNext };
}

/** Submitted Listening/Reading attempts of the practice bank, named by their tests. */
export async function loadBankHistory(skill: 'LISTENING' | 'READING', page: number): Promise<HistoryPage> {
  const result = await getPracticeHistory(skill, page, HISTORY_PAGE_SIZE);
  const submitted = result.items.filter((item) => item.status === 'SUBMITTED');
  const responses = await Promise.all(historyTitleRequests(submitted).map(async (request) => ({
    scope: request.scope,
    items: (await searchReadingTests({ skill, scope: request.scope, only: request.only, page: 0, size: 50 }).catch(() => ({ items: [] }))).items,
  })));
  const titles = historyTitleMap(responses);
  return { rows: submitted.map((item) => practiceRow(item, titles)), hasNext: (result.page + 1) * result.size < result.totalElements };
}
