import * as WebBrowser from 'expo-web-browser';

import { apiRequest } from '@/src/lib/api-client';

/** Base URL of the learner website, where the learning path lives (the app has no learning path screens yet). */
export const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim().replace(/\/+$/, '') || null;

/**
 * "Luyện lỗi này": starts free practice on the knowledge point the same way the web app does, then opens that practice
 * set on the website. Resolves false when the website address is not configured.
 */
export async function practiseKnowledgePointOnWeb(knowledgePointId: string): Promise<boolean> {
  if (!WEB_APP_URL) return false;
  const attempt = await apiRequest<{ attemptId?: string; id?: string }>(`/api/learning/knowledge-points/${encodeURIComponent(knowledgePointId)}/free-practice`, { method: 'POST', auth: true, body: {} });
  const attemptId = attempt.attemptId ?? attempt.id;
  await WebBrowser.openBrowserAsync(attemptId ? `${WEB_APP_URL}/learn/practice/${attemptId}` : `${WEB_APP_URL}/learn`);
  return true;
}

/** Opens a page of the learner website (learning path lessons, knowledge reviews). */
export async function openOnWeb(path: string): Promise<boolean> {
  if (!WEB_APP_URL) return false;
  await WebBrowser.openBrowserAsync(`${WEB_APP_URL}${path.startsWith('/') ? path : `/${path}`}`);
  return true;
}
